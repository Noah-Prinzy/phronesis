import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bubble, Button, IconButton, SpokenText } from '../ui'
import { Halo } from '../avatar/Halo'
import type { HaloState } from '../avatar/Halo'
import { useMicLevel } from '../avatar/useMicLevel'
import { useDictation } from '../app/useDictation'
import { IconMic, IconSend, IconSpark } from '../icons'
import { useJourney } from '../app/journey'
import { useRem } from '../app/useRootFontSize'
import { firstNameOf, useAuth } from '../app/auth'
import { useSpeak } from '../app/useSpeak'
import { OPENER_BUYER, OPENER_OWNER, RESUME_LINES } from '../app/lines'
import { takeSentences } from '../app/sentences'
import { useFocus } from '../app/focus'
import { ApiError, fetchChats, streamChat } from '../lib/api'
import type { ChatMessage } from '../lib/api'
import type { CarPart } from '../data/findings'

/**
 * Home is a conversation, not a form.
 *
 * Three states, and there is no chrome in any of them — no wordmark, no page
 * title, no vehicle label. The orb is the only branding the hub carries:
 *
 *   fresh     — nothing said yet. A large orb and the line he is saying.
 *   speaking  — the user is talking. Their words appear under the orb as the
 *               recogniser hears them.
 *   thread    — there is a conversation. The orb sits above the messages and
 *               stays put while they scroll beneath it.
 *
 * Phronesis' replies are never painted ahead of his voice. The raw token
 * stream is not shown: text appears one SENTENCE at a time, and only once
 * that sentence has been handed to the voice, so the words and the speech
 * arrive together. An answer finished on screen while he is still saying its
 * first line reads as him narrating something already written.
 *
 * What changed is that this no longer costs a wait. The reply used to be
 * collected in full and only then spoken, so the model and the synthesis ran
 * end to end — measured on a 303-character reply, synthesis finished 6.4s in
 * while its first audio was ready at 2.0s. Now the stages overlap and he
 * starts talking a sentence into the answer.
 */

/** The orb's two sizes, in rem. It is the same mounted element either way — the
    size prop changes and CSS transitions the box, so the video never remounts
    and the loop never restarts mid-conversation. */
const ORB_HERO = 19
const ORB_DOCKED = 6

/**
 * How many past messages travel with a new question.
 *
 * Twenty is ten exchanges, which is far more than his persona needs — he asks
 * one question at a time and the thread rarely refers back further than a
 * couple of turns. The cap exists because conversations now survive a reload,
 * so "the whole thing" is no longer a bounded amount of text.
 */
const RECENT_TURNS = 20

interface Msg {
  id: number
  from: 'user' | 'assistant'
  text: string
}

/** A routing offer the assistant makes, rather than a jump it performs. */
interface RouteOffer {
  title: string
  note: string
  to: string
  cta: string
}

function offerFor(owner: boolean): RouteOffer {
  return owner
    ? {
        title: 'Want me to look at the live data?',
        note: 'I can pull the codes and check what the car itself reports.',
        to: '/diagnosis',
        cta: 'Open Diagnosis',
      }
    : {
        title: 'Want these side by side?',
        note: 'Specs, running costs and what they should cost here.',
        to: '/compare',
        cta: 'Open Compare',
      }
}

/**
 * What he says when you take the turn back off him.
 *
 * Several of them, chosen at random: a single canned apology is charming the
 * first time and grating the fourth.
 */
/* The lines themselves are in `app/lines.ts`, pre-rendered to audio: an
   apology for interrupting has to land immediately or it is worse than none. */

/**
 * Which car part a reply was about, guessed from its own words.
 *
 * The AI backend carries no structured metadata alongside the text, so this is
 * necessarily a text match rather than a real classification. Good enough to
 * point the hologram in the right direction when the owner follows the
 * "Open Diagnosis" offer; wrong far less often than it is silent.
 */
function partFromText(text: string): CarPart | null {
  if (/\brear\b.{0,12}\bbrake|\bbrake.{0,12}\brear\b/i.test(text)) return 'rear-brakes'
  if (/\bbrake/i.test(text)) return 'front-brakes'
  if (/\bengine\b/i.test(text)) return 'engine'
  if (/\bcabin\b|\bair filter\b|\bhvac\b/i.test(text)) return 'cabin'
  if (/\bbattery\b/i.test(text)) return 'battery'
  return null
}

export function Home() {
  const navigate = useNavigate()
  const { journey } = useJourney()
  const owner = journey !== 'buyer'

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [offer, setOffer] = useState<RouteOffer | null>(null)
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** What the recogniser has heard so far this utterance. */
  const [heard, setHeard] = useState('')
  /** The reply currently being spoken, revealed in time with the voice. */
  const [speakingId, setSpeakingId] = useState<number | null>(null)
  /** Numbers messages. Up here because the restore effect below needs it. */
  const idRef = useRef(1)
  /**
   * The conversation on the server, so each turn appends to it instead of
   * starting a new one. Null until the first reply comes back, or until an
   * earlier conversation is restored below.
   */
  const [chatId, setChatId] = useState<string | null>(null)
  /**
   * Null while we are still finding out whether there is a conversation to
   * restore. The greeting waits on this: opening with "so what's your car
   * been doing?" above a thread you were halfway through is worse than a
   * moment's silence.
   */
  const [restored, setRestored] = useState<boolean | null>(null)

  const { getToken, user, status: authStatus } = useAuth()
  const firstName = firstNameOf(user)
  const { talking, speak: speakLine, stream, stop: stopSpeaking, progress } = useSpeak()
  const { setPart } = useFocus()

  /**
   * How he opens.
   *
   * Spoken, and written as he says it — the name included, so the one thing
   * the account step exists to collect is actually used out loud rather than
   * just printed in a heading.
   *
   * The line **ends** on the question mark, with the examples folded into the
   * question rather than trailing after it. Text-to-speech takes its
   * intonation from where the sentence lands: a question followed by a
   * declarative fragment gets read with a falling, statement-like tone, which
   * made him sound like he was announcing something rather than asking.
   */
  // The greeting is prepended rather than baked in, so the unnamed branch is
  // character-for-character the line that was pre-rendered — "Hey Noah" is one
  // recording per user and can only ever come from the live endpoint.
  const greeting = firstName ? `Hey ${firstName}. ` : ''
  const opener = `${greeting}${owner ? OPENER_OWNER : OPENER_BUYER}`

  // Nothing happens until auth settles: greeting any earlier delivers the
  // line before the name loads and greets a stranger, and asking for history
  // any earlier asks without a token.
  const authSettled = authStatus !== 'loading'

  /**
   * Pick the conversation back up.
   *
   * The backend has been saving every turn since chat first shipped and
   * nothing ever read them back, so a reload silently threw the conversation
   * away — which the plan asks against twice, in §2.4 and §7.2.
   *
   * Signed out, there is nothing to restore and nothing to wait for.
   */
  useEffect(() => {
    if (!authSettled) return

    const controller = new AbortController()

    void (async () => {
      const token = authStatus === 'signedIn' ? await getToken() : null
      if (controller.signal.aborted) return

      if (!token) {
        setRestored(false)
        return
      }

      const sessions = await fetchChats(token, controller.signal)
      if (controller.signal.aborted) return

      const latest = sessions[0]
      if (!latest || latest.messages.length === 0) {
        setRestored(false)
        return
      }

      setMsgs(
        latest.messages.map((m) => ({
          id: idRef.current++,
          from: m.role,
          text: m.content,
        })),
      )
      setChatId(latest.id)
      // Nothing is spoken on restore. These are words he already said; saying
      // them again would be the one thing the persona forbids outright.
      setRestored(true)
    })()

    return () => controller.abort()
    // Once auth settles. `getToken` is stable enough and re-running on every
    // token refresh would re-restore over a live conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSettled, authStatus])

  // Greet on arrival, but only into an empty room.
  //
  // Deliberately not guarded by a ref. StrictMode mounts, tears down and
  // remounts every effect in development, and `useSpeak`'s own teardown
  // aborts the request in flight. A ref survives that simulated remount, so
  // it would block the second, real attempt and leave the line stuck at zero
  // progress forever — one word on screen and silence. Re-running on a genuine
  // remount is the correct behaviour anyway: coming back to Home should greet.
  useEffect(() => {
    if (restored !== false) return
    speakLine(opener)
    // Only when the restore check lands. `opener` and `speakLine` would
    // re-greet on every identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored])

  /* ---------------------------------------------------------- speech in
     `send` is a hoisted function declaration and the hook re-reads these
     callbacks every render, so this always calls the current one. */
  const {
    supported: canDictate,
    listening,
    error: micError,
    start: listen,
    stop: stopListening,
  } = useDictation({
    onInterim: (text) => setHeard(text),
    onFinal: (text) => void send(text),
  })

  // Amplitude for the orb, only while the recogniser is actually open.
  const { levelRef } = useMicLevel(listening)

  /* ------------------------------------------------------------ barge-in
     Reaching for the mic while he is mid-sentence means he got ahead of
     you. He stops, says so, and hands the turn back. */

  const resumeAfterApology = useRef(false)
  const wasTalking = useRef(false)
  const resumeTimer = useRef(0)

  function beginListening() {
    resumeAfterApology.current = false
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = 0
    listen()
  }

  // Open the mic on the *falling edge* of his voice, not the moment the
  // apology is queued — at that instant `talking` is still false and the mic
  // would open over the top of his own apology.
  useEffect(() => {
    if (wasTalking.current && !talking && resumeAfterApology.current) beginListening()
    wasTalking.current = talking
  })

  useEffect(() => () => window.clearTimeout(resumeTimer.current), [])

  function toggleMic() {
    if (listening) {
      stopListening()
      return
    }
    if (talking) {
      stopSpeaking()
      resumeAfterApology.current = true
      speakLine(RESUME_LINES[Math.floor(Math.random() * RESUME_LINES.length)])
      // If the apology cannot be spoken at all — TTS down, autoplay refused —
      // the microphone must not be left waiting on a voice that never comes.
      resumeTimer.current = window.setTimeout(() => {
        if (resumeAfterApology.current) beginListening()
      }, 2500)
      return
    }
    listen()
  }

  // Whatever was heard belongs to one utterance. When the mic closes — sent
  // or abandoned — it should not linger under the orb.
  useEffect(() => {
    if (!listening) setHeard('')
  }, [listening])

  const mode = msgs.length > 0 ? 'thread' : listening ? 'speaking' : 'fresh'
  const docked = mode === 'thread'
  const orbSize = useRem(docked ? ORB_DOCKED : ORB_HERO)

  /** True while his reply is still arriving on screen with his voice. */
  const revealing = speakingId !== null && progress < 1

  const state: HaloState = thinking
    ? 'thinking'
    : talking || revealing
      ? 'responding'
      : listening
        ? 'listening'
        : 'idle'

  /* ------------------------------------------------------------ the thread */

  const threadRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const t = threadRef.current
    if (t) t.scrollTop = t.scrollHeight
    // progress is in here on purpose: the reply grows as he speaks it, so
    // the thread has to keep following it down.
  }, [msgs, offer, heard, progress])

  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  /**
   * Sends a turn and streams the reply.
   *
   * The whole thread goes up each time, not just the new line — the endpoint
   * is stateless, so the conversation only exists because we keep sending it.
   */
  async function send(text: string) {
    const body = text.trim()
    if (!body || thinking) return
    setDraft('')
    setHeard('')
    setOffer(null)
    setError(null)
    // Release the previous reply to full opacity before the next one starts,
    // or it would sit frozen at however far his voice had got.
    setSpeakingId(null)
    stopSpeaking()

    const mine: Msg = { id: idRef.current++, from: 'user', text: body }
    // Build the wire history from what is on screen *plus* this turn, rather
    // than reading state back after setMsgs — that read would be one render
    // behind and would silently drop the newest message.
    //
    // Only the recent tail goes over the wire. A conversation used to be
    // bounded by how long the tab stayed open; now that it survives a reload
    // it can run for weeks, and sending all of it would grow the cost and the
    // latency of every single turn until it hit the model's context limit.
    // The whole thread stays on screen and in Firestore either way.
    const history: ChatMessage[] = [
      ...msgs.slice(-RECENT_TURNS).map((m) => ({ role: m.from, content: m.text })),
      { role: 'user' as const, content: body },
    ]
    setMsgs((m) => [...m, mine])
    setThinking(true)

    const replyId = idRef.current++
    let full = ''
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = await getToken()

      /**
       * Spoken as it is written, a sentence at a time.
       *
       * It used to be collected first and only then spoken, which meant the
       * user waited out the model AND the synthesis end to end. Now the two
       * overlap: the first sentence is being said while the rest is still
       * arriving.
       *
       * The message text grows with what has been handed to the voice —
       * never with the raw token stream. So the words on screen are always
       * words he is about to say, `progress` is measured against exactly
       * that text, and the reveal still lands with the voice.
       */
      const voice = stream()
      let waiting = ''
      let opened = false

      const flush = (done: boolean) => {
        const { chunks, rest } = takeSentences(waiting, !opened, done)
        waiting = rest
        for (const chunk of chunks) {
          if (!opened) {
            opened = true
            setThinking(false)
            setMsgs((m) => [...m, { id: replyId, from: 'assistant', text: chunk }])
            setSpeakingId(replyId)
          } else {
            setMsgs((m) => m.map((x) => (x.id === replyId ? { ...x, text: `${x.text} ${chunk}` } : x)))
          }
          voice.push(chunk)
        }
      }

      await streamChat({
        messages: history,
        journey,
        token,
        // Absent on the first turn; the server mints one and hands it back,
        // and every turn after this appends to that same conversation.
        chatId,
        onChatId: setChatId,
        signal: controller.signal,
        onDelta: (delta) => {
          full += delta
          waiting += delta
          flush(false)
        },
      })

      flush(true)
      voice.end()

      const reply = full.trim()
      if (!reply) return

      setOffer(offerFor(owner))
      // Only owners have a Diagnosis page for this to point at.
      if (owner) {
        const part = partFromText(reply)
        if (part) setPart(part)
      }
    } catch (err) {
      if (controller.signal.aborted) return
      // Roll the whole turn back: drop the user's message and put their text
      // back in the composer.
      //
      // Keeping an unanswered user turn looks kinder but leaves two
      // consecutive user roles in the history that every later request
      // re-sends — a malformed conversation some providers reject outright.
      setMsgs((m) => m.filter((x) => x.id !== mine.id))
      setDraft(body)
      setError(
        err instanceof ApiError ? err.message : 'I could not reach the server. Is it running?',
      )
    } finally {
      setThinking(false)
      abortRef.current = null
    }
  }


  return (
    <main id="main" className="home" data-mode={mode}>
      {/* The orb keeps this one slot in the tree at every size, so changing
          mode resizes it rather than remounting the video. */}
      <div className="home__stage">
        <Halo
          size={orbSize}
          state={state}
          levelRef={levelRef}
          onActivate={toggleMic}
          label={listening ? 'Stop listening' : talking ? 'Interrupt' : 'Talk to Phronesis'}
        />

        {mode === 'speaking' && (
          <SpokenText text={heard || '…'} live className="home__heard" />
        )}

        {mode === 'fresh' && (
          <SpokenText text={opener} progress={progress} className="home__opener" />
        )}
      </div>

      {docked && (
        <div className="home__thread" ref={threadRef}>
          {msgs.map((m) => (
            <Bubble key={m.id} from={m.from}>
              {m.id === speakingId ? (
                <SpokenText text={m.text} progress={progress} />
              ) : (
                m.text
              )}
            </Bubble>
          ))}

          {/* Their voice, forming into the message it is about to become. */}
          {listening && heard && (
            <Bubble from="user" className="ph-bubble--forming">
              <SpokenText text={heard} live />
            </Bubble>
          )}

          {thinking && (
            <p className="home__thinking" aria-live="polite">
              <span className="home__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              Thinking
            </p>
          )}

          {/* Held back until he has finished saying it — buttons appearing
              mid-sentence would talk over him. */}
          {offer && !revealing && (
            <div className="offer">
              <span className="offer__icon" aria-hidden="true">
                <IconSpark size={15} />
              </span>
              <div className="offer__text">
                <span className="offer__title">{offer.title}</span>
                <span className="offer__note">{offer.note}</span>
              </div>
              <div className="offer__actions">
                <Button size="sm" onClick={() => navigate(offer.to)}>
                  {offer.cta}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOffer(null)}>
                  Not yet
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="home__foot">
        {error && (
          <p className="home__error" role="alert">
            {error}
          </p>
        )}
        {micError === 'denied' && (
          <p className="home__note" role="status">
            I can&rsquo;t hear you — the microphone is blocked. You can still type.
          </p>
        )}
        {micError === 'no-speech' && (
          <p className="home__note" role="status">
            I didn&rsquo;t catch that. Try again, or type it instead.
          </p>
        )}
        {micError === 'failed' && (
          <p className="home__note" role="status">
            Something went wrong with the microphone. Typing works just as well.
          </p>
        )}

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
        >
          <IconButton
            label={listening ? 'Stop listening' : talking ? 'Interrupt' : 'Speak instead of typing'}
            title={canDictate ? undefined : 'This browser cannot listen — try Chrome or Edge'}
            className={listening ? 'composer__mic--on' : undefined}
            disabled={!canDictate}
            onClick={toggleMic}
          >
            <IconMic />
          </IconButton>

          <input
            className="composer__input"
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder={
              listening ? 'Listening…' : docked ? 'Message Phronesis…' : 'Describe it, or tap the orb'
            }
            aria-label="Message Phronesis"
          />

          <IconButton label="Send" variant="filled" type="submit" disabled={!draft.trim()}>
            <IconSend />
          </IconButton>
        </form>
      </div>
    </main>
  )
}
