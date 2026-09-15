import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bubble, Button, Capture, IconButton, SentMedia, SpokenText, Toast } from '../ui'
import { Halo } from '../avatar/Halo'
import type { HaloState } from '../avatar/Halo'
import { useMicLevel } from '../avatar/useMicLevel'
import { useDictation } from '../voice/useDictation'
import { IconMic, IconSend, IconSpark } from '../ui/icons'
import { useJourney } from '../app/journey'
import { journeyFromConversation } from '../app/intent'
import type { Journey } from '../app/journey'
import { useRem } from '../app/useRootFontSize'
import { firstNameOf, useAuth } from '../app/auth'
import { useSpeak } from '../voice/useSpeak'
import { RESUME_LINES } from '../voice/lines'
import { nextOpener } from '../voice/greeting'
import { takeSentences } from '../voice/sentences'
import { useHandover } from '../app/handover'
import { partFromText } from '../diagnosis/partFromText'
import { ApiError, fetchChats, streamChat } from '../lib/api'
import type { ChatMessage } from '../lib/api'
import { forWire } from '../lib/attachments'
import type { Attachment } from '../lib/attachments'

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
const ORB_HERO = 22
const ORB_DOCKED = 11

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
  /**
   * What went with it, kept so it stays on screen afterwards.
   *
   * The whole object rather than the wire form, because the preview URL is
   * the part that matters here and the server never sees it. Only this
   * session has them: a conversation restored from the server comes back as
   * text, which is honest — the photo lives on the device that took it.
   */
  sent?: Attachment[]
}

/**
 * What the user's own bubble says when they sent a file and no words.
 *
 * An empty bubble reads as a bug, and the model needs something to answer.
 * Written in their voice rather than the app's — it is their turn.
 */
function describeOwn(list: Attachment[]): string {
  const photos = list.filter((a) => a.kind === 'image').length
  const clips = list.filter((a) => a.kind === 'audio').length
  if (photos && clips) return 'Here is a photo and the sound it makes.'
  if (clips) return clips > 1 ? 'Here are the sounds it makes.' : 'Here is the sound it makes.'
  return photos > 1 ? 'Here are some photos.' : 'Here is a photo.'
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


export function Home() {
  const navigate = useNavigate()
  const { journey, setJourney } = useJourney()
  const owner = journey !== 'buyer'

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [offer, setOffer] = useState<RouteOffer | null>(null)
  const [draft, setDraft] = useState('')
  /**
   * What is going with this turn: a photo of the car, or the noise itself.
   *
   * Held beside the draft rather than inside it because they are sent
   * together and cleared together — an attachment left behind after a send
   * would silently ride along with the next question about something else.
   */
  const [attachments, setAttachments] = useState<Attachment[]>([])
  /** While the microphone is open the composer is not a composer. */
  const [recording, setRecording] = useState(false)
  /**
   * He has moved them to the other half of the product.
   *
   * Held so the change can be said and taken back. The navigation
   * rearranging IS the announcement — he does not also say it out loud,
   * because reading out what is already on screen is the one thing his voice
   * never does — but two pages appearing and two leaving with no explanation
   * is disorienting, and on a wrong read the way back should be one tap
   * rather than a trip into Account.
   */
  const [switched, setSwitched] = useState<{ from: Journey | null; to: Journey } | null>(null)
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
  const { send: handOver } = useHandover()

  /**
   * Object URLs live until they are revoked, so leaving Home has to let go of
   * every preview the thread is holding. Mirrored into a ref because an
   * unmount effect reads whatever `msgs` was at mount time otherwise.
   */
  const held = useRef<Msg[]>([])
  held.current = msgs
  useEffect(
    () => () => {
      for (const m of held.current) {
        for (const a of m.sent ?? []) if (a.preview) URL.revokeObjectURL(a.preview)
      }
    },
    [],
  )

  /**
   * How he opens, once it has been chosen. See `app/greeting.ts`.
   *
   * State rather than a value computed each render, because choosing is not
   * free of consequence: it picks at random and writes to localStorage, so
   * re-running it on every render would swap the line mid-sentence while he
   * was still saying it and burn through the no-repeat memory in a few
   * frames.
   *
   * Null until the restore check lands — nothing is chosen at all when there
   * is a conversation to pick back up, and choosing before auth settles would
   * greet a stranger by using no name.
   *
   * Whichever line comes back **ends on its question mark**. Text-to-speech
   * takes its intonation from where a sentence lands, and a question followed
   * by a declarative fragment gets read with a falling tone — which made him
   * sound like he was announcing something rather than asking.
   */
  const [opener, setOpener] = useState<string | null>(null)

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
    // Picked here, inside the effect that speaks it, so the choice and the
    // saying of it cannot come apart — and so nothing is chosen at all when
    // there is a conversation to pick back up instead.
    const line = nextOpener(owner, firstName)
    setOpener(line)
    speakLine(line)
    // Only when the restore check lands. `owner`, `firstName` and `speakLine`
    // would re-greet on every identity change.
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
    /* A photo or a recording is a turn on its own. Somebody holding up a
       phone to a running engine has said the most useful thing they can say,
       and demanding they also type something would be the form reasserting
       itself over the conversation. */
    const going = attachments
    if ((!body && going.length === 0) || thinking) return
    setDraft('')
    setAttachments([])
    setHeard('')
    setOffer(null)
    setError(null)
    // Release the previous reply to full opacity before the next one starts,
    // or it would sit frozen at however far his voice had got.
    setSpeakingId(null)
    stopSpeaking()

    const said = body || describeOwn(going)
    const mine: Msg = {
      id: idRef.current++,
      from: 'user',
      text: said,
      sent: going.length > 0 ? going : undefined,
    }
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
      /* Only THIS turn carries its files. The earlier ones are replayed as
         text, because re-uploading every photo on every turn would grow the
         request without bound — the server keeps them against the
         conversation it already has. */
      { role: 'user' as const, content: said, attachments: forWire(going) },
    ]
    setMsgs((m) => [...m, mine])
    setThinking(true)

    /**
     * Has the conversation actually turned?
     *
     * Read across the recent turns rather than off this one sentence.
     * Somebody mid-diagnosis mentioning that their brother is shopping has
     * not stopped owning a car, and taking Diagnose out of their navigation
     * for saying so would be worse than never moving anyone at all.
     */
    const moved = journeyFromConversation(
      [...msgs.filter((m) => m.from === 'user').map((m) => m.text), said],
      journey,
    )
    if (moved) {
      setSwitched({ from: journey, to: moved })
      setJourney(moved)
    }

    const replyId = idRef.current++
    let full = ''
    /* The id in scope is the one from BEFORE this request, and the server
       mints a new one on the first turn — so the hand-off at the end would
       carry null forever if it read the state variable. */
    let liveChatId = chatId
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
        /* The journey he has just moved them to, not the one they arrived in.
           `journey` in this scope is the value from before this turn, and
           React has not re-rendered yet — so sending it would have him answer
           the very message that made him switch as though he had not, with
           the navigation already saying otherwise beside him. */
        journey: moved ?? journey,
        token,
        // Absent on the first turn; the server mints one and hands it back,
        // and every turn after this appends to that same conversation.
        chatId,
        onChatId: (id) => {
          liveChatId = id
          setChatId(id)
        },
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

      /**
       * He takes you there rather than offering you a door.
       *
       * The offer card was the seam: you told him about a noise, he answered,
       * and then you clicked a button and were asked to type the noise again
       * into an empty box. This is one conversation, so it moves with you —
       * the symptom, the chat it belongs to, and the part he was pointing at
       * all travel, and Diagnosis opens already working on it.
       *
       * Only when he NAMED a part. A reply that never mentions one is him
       * answering a question, not routing you, and moving somebody who asked
       * about insurance is worse than making them click. It is still a guess
       * off a regex, so it will occasionally be wrong — the nav is right
       * there, and nothing is destroyed by being in the wrong room.
       */
      const part = owner ? partFromText(reply) : null
      if (part) {
        handOver({ symptom: said, chatId: liveChatId ?? undefined, part, attachments: going })
        navigate('/diagnosis')
        return
      }

      // He did not route you anywhere, so the old offer still stands.
      setOffer(offerFor(owner))
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
      // Including the files. A failed send that quietly destroyed a recording
      // of a noise the car was making an hour ago would be unforgivable.
      setAttachments(going)
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

        {mode === 'fresh' && opener !== null && (
          <SpokenText text={opener} progress={progress} className="home__opener" />
        )}
      </div>

      {docked && (
        <div className="home__thread" ref={threadRef}>
          {msgs.map((m) => (
            <Bubble key={m.id} from={m.from}>
              {m.sent ? <SentMedia items={m.sent} /> : null}
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

          {switched && (
            <Toast
              level="accent"
              title={
                switched.to === 'buyer'
                  ? 'Switched to looking at cars to buy'
                  : 'Switched to looking after the car you have'
              }
              body="Your navigation changed with it."
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // Back exactly where they were, including "not chosen yet".
                    if (switched.from) setJourney(switched.from)
                    setSwitched(null)
                  }}
                >
                  Undo
                </Button>
              }
            />
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
          {/* While the microphone is open, the composer is the recording.
              Everything else goes rather than being covered over — a send
              button hidden under a strip is still there for a keyboard and
              still there for a screen reader. */}
          {!recording && (
            <IconButton
              label={listening ? 'Stop listening' : talking ? 'Interrupt' : 'Speak instead of typing'}
              title={canDictate ? undefined : 'This browser cannot listen — try Chrome or Edge'}
              className={listening ? 'composer__mic--on' : undefined}
              disabled={!canDictate}
              onClick={toggleMic}
            >
              <IconMic />
            </IconButton>
          )}

          {!recording && (
            <input
              className="composer__input"
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              placeholder={
                listening ? 'Listening…' : docked ? 'Message Phronesis…' : 'Describe it, or show him'
              }
              aria-label="Message Phronesis"
            />
          )}

          <Capture
            attachments={attachments}
            onChange={setAttachments}
            onError={setError}
            onRecording={setRecording}
            disabled={thinking}
          />

          {!recording && (
            <IconButton
              label="Send"
              variant="filled"
              type="submit"
              disabled={!draft.trim() && attachments.length === 0}
            >
              <IconSend />
            </IconButton>
          )}
        </form>
      </div>
    </main>
  )
}
