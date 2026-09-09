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
import { useFocus } from '../app/focus'
import { ApiError, streamChat } from '../lib/api'
import type { ChatMessage } from '../lib/api'
import type { CarPart } from '../data/findings'

/**
 * Home is a conversation, not a form.
 *
 * Three states, and there is no chrome in any of them — no wordmark, no page
 * title, no vehicle label. The orb is the only branding the hub carries:
 *
 *   fresh     — nothing said yet. A large orb and the line she is saying.
 *   speaking  — the user is talking. Their words appear under the orb as the
 *               recogniser hears them.
 *   thread    — there is a conversation. The orb sits above the messages and
 *               stays put while they scroll beneath it.
 *
 * Phronesis' replies are deliberately NOT painted as they stream in. The
 * text is held back until she actually starts speaking, and then arrives in
 * time with her voice — otherwise the answer is finished on screen while she
 * is still saying the first sentence, which reads as her narrating something
 * already written. The short replies her persona produces make the wait small.
 */

/** The orb's two sizes, in rem. It is the same mounted element either way — the
    size prop changes and CSS transitions the box, so the video never remounts
    and the loop never restarts mid-conversation. */
const ORB_HERO = 19
const ORB_DOCKED = 6

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
 * What she says when you take the turn back off her.
 *
 * Several of them, chosen at random: a single canned apology is charming the
 * first time and grating the fourth.
 */
const RESUME_LINES = ['Sorry — go on.', 'Sorry, you were saying?', "Go on, I'm listening."]

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

  const { getToken, user, status: authStatus } = useAuth()
  const firstName = firstNameOf(user)
  const { talking, speak: speakLine, stop: stopSpeaking, progress } = useSpeak()
  const { setPart } = useFocus()

  /**
   * How she opens.
   *
   * Spoken, and written as she says it — the name included, so the one thing
   * the account step exists to collect is actually used out loud rather than
   * just printed in a heading.
   *
   * The line **ends** on the question mark, with the examples folded into the
   * question rather than trailing after it. Text-to-speech takes its
   * intonation from where the sentence lands: a question followed by a
   * declarative fragment gets read with a falling, statement-like tone, which
   * made her sound like she was announcing something rather than asking.
   */
  const opener = owner
    ? `${firstName ? `Hey ${firstName}. ` : ''}Tap my orb or the mic whenever you want to talk. So, what's your car been doing — a noise, a warning light, something that just feels off?`
    : `${firstName ? `Hey ${firstName}. ` : ''}Tap my orb or the mic whenever you want to talk. So, what are you looking for — a budget, a make you like, something for work?`

  // Greet on arrival, once auth has settled — speaking any earlier would
  // deliver the line before the name loads and greet a stranger.
  //
  // Deliberately not guarded by a ref. StrictMode mounts, tears down and
  // remounts every effect in development, and `useSpeak`'s own teardown
  // aborts the request in flight. A ref survives that simulated remount, so
  // it would block the second, real attempt and leave the line stuck at zero
  // progress forever — one word on screen and silence. Re-running on a genuine
  // remount is the correct behaviour anyway: coming back to Home should greet.
  const authSettled = authStatus !== 'loading'
  useEffect(() => {
    if (!authSettled) return
    speakLine(opener)
    // Only when auth settles. `opener` and `speakLine` would re-greet on every
    // identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSettled])

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
     Reaching for the mic while she is mid-sentence means she got ahead of
     you. She stops, says so, and hands the turn back. */

  const resumeAfterApology = useRef(false)
  const wasTalking = useRef(false)
  const resumeTimer = useRef(0)

  function beginListening() {
    resumeAfterApology.current = false
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = 0
    listen()
  }

  // Open the mic on the *falling edge* of her voice, not the moment the
  // apology is queued — at that instant `talking` is still false and the mic
  // would open over the top of her own apology.
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

  /** True while her reply is still arriving on screen with her voice. */
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
    // progress is in here on purpose: the reply grows as she speaks it, so
    // the thread has to keep following it down.
  }, [msgs, offer, heard, progress])

  const idRef = useRef(1)
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
    // or it would sit frozen at however far her voice had got.
    setSpeakingId(null)
    stopSpeaking()

    const mine: Msg = { id: idRef.current++, from: 'user', text: body }
    // Build the wire history from what is on screen *plus* this turn, rather
    // than reading state back after setMsgs — that read would be one render
    // behind and would silently drop the newest message.
    const history: ChatMessage[] = [
      ...msgs.map((m) => ({ role: m.from, content: m.text })),
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
      // Collected, not painted. The reply appears when she says it.
      await streamChat({
        messages: history,
        journey,
        token,
        signal: controller.signal,
        onDelta: (delta) => {
          full += delta
        },
      })

      const reply = full.trim()
      if (!reply) return

      setMsgs((m) => [...m, { id: replyId, from: 'assistant', text: reply }])
      setSpeakingId(replyId)
      setOffer(offerFor(owner))
      speakLine(reply)
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

          {/* Held back until she has finished saying it — buttons appearing
              mid-sentence would talk over her. */}
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
