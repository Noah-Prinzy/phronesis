import { useCallback, useEffect, useRef, useState } from 'react'
import { textToSpeech } from '../lib/api'
import { browserSpeechAvailable, speakInBrowser, type BrowserSpeechHandle } from './browserSpeech'
import { stripMarkdownForSpeech } from './speechText'
import { VOICE_MANIFEST } from './manifest'
import { useVoice } from './settings'

/**
 * One reply, spoken while it is still being written.
 *
 * Push whole sentences as the model produces them; they are synthesised and
 * played in order, and nothing barges in on anything else. Call `end` when
 * the model stops.
 */
export interface SpeechStream {
  /** Queue one finished sentence. */
  push: (sentence: string) => void
  /** No more sentences are coming. */
  end: () => void
}

export interface UseSpeakResult {
  /** True while a line is actually playing — drive an avatar's "responding" state off this. */
  talking: boolean
  /** Speaks one line, cutting off whatever was still playing. A no-op if the "speak" setting is off. */
  speak: (text: string) => void
  /**
   * Begin a reply that is still being generated, cutting off whatever was
   * playing. Sentences pushed into it are spoken in order as they arrive, so
   * he starts talking while the model is still writing.
   */
  stream: () => SpeechStream
  /** Cuts off whatever is currently playing or in flight. */
  stop: () => void
  /**
   * How far through the current line the voice is, 0–1. Drives the on-screen
   * reveal in `<SpokenText>` so the words arrive as he says them.
   *
   * It reaches 1 whenever the line is finished *or* could not be spoken at
   * all — voice switched off, TTS down, autoplay refused for good. A reveal
   * that waited for audio which never comes would leave the screen
   * permanently blank, which is far worse than simply showing the text.
   */
  progress: number
  /** The line currently being spoken, or the last one spoken. */
  line: string
}

/**
 * How long to hold a blocked line, waiting for the user to touch something.
 * Long enough for a deliberate tap, short enough that a silent screen never
 * reads as broken.
 */
const UNLOCK_GRACE_MS = 3500

/**
 * Count words the way `<SpokenText>` does, because progress is fed straight
 * into it. If these two disagree the reveal drifts from the voice.
 */
function wordsIn(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Did the browser refuse to play because nothing has been interacted with? */
function isAutoplayBlocked(err: unknown): boolean {
  return err instanceof Error && err.name === 'NotAllowedError'
}

/**
 * Get audio for a line: Kokoro in this browser if it can run here, the server
 * otherwise. Throwing means neither worked, and the caller drops to the
 * browser's own synthesiser.
 */
/**
 * Plays a line of Phronesis' voice, respecting the "Speak replies aloud"
 * setting. One line plays
 * at a time: calling `speak` again, or `stop`, always cuts off whatever was
 * still going — every screen that uses this shares that same barge-in rule
 * rather than each re-deriving it.
 *
 * **Two tiers.**
 *
 * 1. **`/api/tts`** — Microsoft's neural speech, generated on the server.
 *    Because the work happens there and the browser only plays an MP3, every
 *    device and every browser gets the same voice. Running a model in the
 *    browser instead was tried and abandoned: it needed WebGPU, a 350MB
 *    download, and still read text rather than saying it.
 * 2. **The browser's own synthesiser**, when the server cannot be reached at
 *    all. It sounds least like him, which is a far smaller loss than silence.
 *
 * Each tier is tried and moved past on FAILURE rather than skipped on a
 * guess about availability — the same rule the backend chain follows, and
 * for the same reason.
 *
 * **Autoplay.** A browser will not play audio until the user has interacted
 * with the page, and a returning user goes straight from the splash to Home
 * without ever clicking — so his greeting was being refused and silently
 * swallowed. A refusal is now held rather than discarded: the first touch or
 * keypress replays the line *from the beginning*, so the words and the voice
 * still arrive together. If nobody touches anything, the text appears on its
 * own a few seconds later.
 */
export function useSpeak(): UseSpeakResult {
  const { speak: enabled } = useVoice()
  const [talking, setTalking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [line, setLine] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const browserRef = useRef<BrowserSpeechHandle | null>(null)
  /** Tears down a pending unlock listener, if one is armed. */
  const disarmRef = useRef<(() => void) | null>(null)

  const disarm = useCallback(() => {
    disarmRef.current?.()
    disarmRef.current = null
  }, [])

  const stop = useCallback(() => {
    disarm()
    abortRef.current?.abort()
    abortRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    browserRef.current?.cancel()
    browserRef.current = null
    setTalking(false)
  }, [disarm])

  useEffect(() => stop, [stop])

  /**
   * Kokoro is the FALLBACK now, so it is no longer downloaded eagerly — 350MB
   * fetched on the chance the server goes down is not a trade worth making,
   * least of all for users on mobile data. It loads on first need instead,
   * which costs the first fallback line a long wait and nobody else anything.
   */

  /**
   * Speak a line with the browser's own synthesiser. Returns false if this
   * browser has none, so the caller can fall through to showing the text.
   *
   * Progress here comes from real `boundary` events rather than from a clock,
   * so the reveal lands on the word actually being spoken — the one respect
   * in which the fallback is better than the voice it is standing in for.
   */
  const speakLocally = useCallback((body: string, controller: AbortController): boolean => {
    if (!browserSpeechAvailable()) return false

    // The server normally prepares his text; this tier is the one that runs
    // when the server cannot be reached, so it has to strip its own markdown.
    browserRef.current = speakInBrowser(stripMarkdownForSpeech(body), {
      onStart: () => {
        if (controller.signal.aborted) return
        setTalking(true)
      },
      onProgress: (p) => {
        if (controller.signal.aborted) return
        setProgress(p)
      },
      onDone: () => {
        if (controller.signal.aborted) return
        setProgress(1)
        setTalking(false)
        browserRef.current = null
      },
    })
    return true
  }, [])

  /**
   * Fetch audio for one chunk: the pre-rendered file if there is one, the
   * endpoint otherwise. Kicked off the moment a sentence is pushed, so the
   * next one is usually already in hand by the time the current finishes.
   */
  const sourceFor = useCallback(async (text: string, signal: AbortSignal) => {
    const fixed = VOICE_MANIFEST[text]
    if (fixed) return { src: fixed, temporary: false }
    const blob = await textToSpeech(text, signal)
    return { src: URL.createObjectURL(blob), temporary: true }
  }, [])

  /**
   * Speak a reply while it is still being written.
   *
   * **Why this exists.** Every stage used to wait for the previous one to
   * finish completely: two seconds to decide the user had stopped talking,
   * then the whole model reply, then the whole synthesis, then playback.
   * Measured on a 303-character reply, synthesis alone finished 6.4s after
   * the request while its FIRST audio arrived at 2.0s — so 4.4s of that wait
   * bought nothing, and the longer he talks the worse it gets.
   *
   * Here the sentences overlap instead. The first one is spoken while the
   * model writes the second, and its audio is already fetched by the time the
   * first finishes.
   *
   * **Progress stays honest as the total grows.** It is reported as a
   * fraction of everything pushed SO FAR, and the caller shows exactly that
   * same text. When a new sentence arrives both the numerator's denominator
   * and the displayed text grow together, so the number dips while the lit
   * word count does not move — nothing already revealed is ever un-revealed.
   */
  const stream = useCallback((): SpeechStream => {
    stop()
    setLine('')
    setProgress(0)

    const controller = new AbortController()
    abortRef.current = controller

    if (!enabled) {
      // Voice off: the words still have to appear, all of them, immediately.
      return {
        push: (sentence) => setLine((prev) => (prev ? `${prev} ${sentence}` : sentence)),
        end: () => setProgress(1),
      }
    }

    interface Queued {
      text: string
      words: number
      audio: Promise<{ src: string; temporary: boolean }>
    }

    const queue: Queued[] = []
    /** Words in sentences he has finished saying. */
    let spokenWords = 0
    /** How far into the sentence he is saying now, in words. */
    let intoCurrent = 0
    /** Words in everything pushed so far — the denominator, and it grows. */
    let totalWords = 0
    let ended = false
    let draining = false

    /**
     * Publish the reveal position. Every change to any of the three numbers
     * above goes through here.
     *
     * **This exists because the three used to be reported separately, and the
     * denominator could grow while the numerator stood still.** When a
     * sentence finished, progress was set to `spokenWords / totalWords` — 1,
     * if nothing else had been queued yet. The next sentence then arrived,
     * `totalWords` grew, and for one render `progress` was still 1 against a
     * longer text: every word of the new sentence lit up at once, then
     * snapped back to nothing on the next audio tick and re-appeared as he
     * actually said it. The text materialised twice.
     */
    const report = () => {
      if (totalWords === 0) return
      setProgress(Math.min(1, (spokenWords + intoCurrent) / totalWords))
    }

    const playOne = (src: string, temporary: boolean, words: number) =>
      new Promise<void>((resolve) => {
        const audio = new Audio(src)
        audioRef.current = audio
        let settled = false

        const done = () => {
          if (settled) return
          settled = true
          if (temporary) URL.revokeObjectURL(src)
          resolve()
        }

        audio.addEventListener('ended', done)
        audio.addEventListener('error', done)

        /**
         * Follow the playhead on every frame, not on `timeupdate`.
         *
         * That event fires about four times a second, which at speaking pace
         * is roughly one word — so words arrived in visible clumps of two and
         * three rather than one at a time. A frame loop costs nothing here
         * (one division) and puts each word on screen as it is said.
         *
         * It is still an even division of the sentence rather than real word
         * timing. Edge does emit WordBoundary offsets and using them would be
         * exact, but they are thrown away at the server today.
         */
        let frame = 0
        const follow = () => {
          if (settled) return
          const d = audio.duration
          if (Number.isFinite(d) && d > 0) {
            intoCurrent = Math.min(1, audio.currentTime / d) * words
            report()
          }
          frame = requestAnimationFrame(follow)
        }
        frame = requestAnimationFrame(follow)
        const stopFollowing = () => cancelAnimationFrame(frame)
        audio.addEventListener('ended', stopFollowing)
        audio.addEventListener('error', stopFollowing)

        audio.play().catch(() => {
          // A reply is always the answer to something the user just did, so
          // autoplay is not in question here the way it is for a greeting.
          // Anything else that stops it playing should not stall the queue.
          done()
        })
      })

    const drain = async () => {
      if (draining) return
      draining = true
      setTalking(true)

      while (queue.length > 0) {
        if (controller.signal.aborted) break
        const next = queue[0]
        try {
          const { src, temporary } = await next.audio
          if (controller.signal.aborted) {
            if (temporary) URL.revokeObjectURL(src)
            break
          }
          await playOne(src, temporary, next.words)
        } catch (err) {
          if (controller.signal.aborted) break
          // One sentence could not be spoken. Reveal it and keep going —
          // dropping the rest of the reply would be far worse.
          console.warn('Could not speak part of the reply:', err)
        }
        spokenWords += next.words
        intoCurrent = 0
        queue.shift()
        report()
      }

      draining = false
      if (controller.signal.aborted) return
      setTalking(false)
      if (ended) setProgress(1)
    }

    return {
      push: (sentence: string) => {
        const text = sentence.trim()
        if (!text || controller.signal.aborted) return
        totalWords += wordsIn(text)
        // Straight away, in the same tick the text grows. Leaving it until
        // the next audio frame is what let the new sentence flash on screen
        // fully lit before he had said a word of it.
        report()
        setLine((prev) => (prev ? `${prev} ${text}` : text))
        queue.push({
          text,
          words: wordsIn(text),
          // Started now, not when its turn comes — this is the prefetch.
          audio: sourceFor(text, controller.signal),
        })
        void drain()
      },
      end: () => {
        ended = true
        if (controller.signal.aborted) return
        // Nothing queued and nothing playing: the reply was empty or every
        // chunk already finished. Either way the text must not stay hidden.
        if (!draining && queue.length === 0) setProgress(1)
      },
    }
  }, [enabled, stop, sourceFor])

  const speak = useCallback(
    (text: string) => {
      const body = text.trim()
      if (!body) return
      stop()
      setLine(body)

      // Voice off: the words still have to appear, immediately.
      if (!enabled) {
        setProgress(1)
        return
      }

      setProgress(0)
      const controller = new AbortController()
      abortRef.current = controller

      /** Hold a refused line until the user touches something. */
      const armUnlock = (audio: HTMLAudioElement) => {
        disarm()
        let timer = 0
        let spent = false

        const cleanup = () => {
          if (spent) return
          spent = true
          window.clearTimeout(timer)
          document.removeEventListener('pointerdown', onGesture, true)
          document.removeEventListener('keydown', onGesture, true)
          disarmRef.current = null
        }

        function onGesture() {
          cleanup()
          if (controller.signal.aborted) return
          // From the top, so the reveal and the voice start together — the
          // line is still hidden, and replaying mid-way would show him
          // finishing a sentence he never began.
          audio.currentTime = 0
          setProgress(0)
          setTalking(true)
          void audio.play().catch(() => {
            setProgress(1)
            setTalking(false)
          })
        }

        timer = window.setTimeout(() => {
          cleanup()
          if (controller.signal.aborted) return
          // Nobody touched anything. Better read than never seen.
          setProgress(1)
          setTalking(false)
        }, UNLOCK_GRACE_MS)

        // Capture phase: the gesture still reaches whatever was clicked.
        document.addEventListener('pointerdown', onGesture, true)
        document.addEventListener('keydown', onGesture, true)
        disarmRef.current = cleanup
      }

      /**
       * Play a URL, and resolve once it is playing or has been parked waiting
       * for a gesture. Rejects if the audio itself will not load, which is the
       * signal to try a different source.
       */
      const play = (src: string, temporary: boolean) =>
        new Promise<void>((resolve, reject) => {
          const audio = new Audio(src)
          audioRef.current = audio
          let settled = false

          const release = () => {
            if (temporary) URL.revokeObjectURL(src)
          }
          const finish = () => {
            release()
            setProgress(1)
            setTalking(false)
          }

          audio.addEventListener('ended', finish)
          audio.addEventListener('error', () => {
            // A source that will not load at all. If it never started, the
            // caller can still try somewhere else, so this is a rejection
            // rather than the end of the line.
            release()
            if (settled) {
              setProgress(1)
              setTalking(false)
              return
            }
            settled = true
            reject(new Error(`Could not load ${src}`))
          })
          audio.addEventListener('timeupdate', () => {
            const d = audio.duration
            // Duration is NaN until metadata lands and Infinity for a stream.
            if (!Number.isFinite(d) || d <= 0) return
            setProgress(Math.min(1, audio.currentTime / d))
          })

          setTalking(true)
          audio.play().then(
            () => {
              if (settled) return
              settled = true
              resolve()
            },
            (err: unknown) => {
              if (settled) return
              if (controller.signal.aborted) {
                settled = true
                resolve()
                return
              }
              if (!isAutoplayBlocked(err)) {
                settled = true
                release()
                reject(err instanceof Error ? err : new Error(String(err)))
                return
              }
              // Not a failure — just too early. Wait for a gesture.
              settled = true
              setTalking(false)
              armUnlock(audio)
              resolve()
            },
          )
        })

      void (async () => {
        try {
          /**
           * A line that was rendered at build time plays straight from disk.
           *
           * This is every fixed thing he says — the greeting, all of
           * onboarding, the interruption apologies. Measured against the live
           * endpoint those cost about 1.3s before the first byte, almost all
           * of it the service waking rather than synthesis, so a short line
           * is no faster than a long one. Here they are instant, and they
           * keep working with the backend down.
           *
           * If the file is missing — a stale manifest, a deploy that dropped
           * public/voice — it falls through to the endpoint below rather than
           * going quiet.
           */
          const fixed = VOICE_MANIFEST[body]
          if (fixed) {
            try {
              await play(fixed, false)
              return
            } catch (err) {
              if (controller.signal.aborted) return
              console.warn('Pre-rendered line would not play, asking the server instead:', err)
            }
          }

          const blob = await textToSpeech(body, controller.signal)
          if (controller.signal.aborted) return
          await play(URL.createObjectURL(blob), true)
        } catch (err) {
          if (controller.signal.aborted) return
          console.warn('Hosted TTS failed, falling back to the browser voice:', err)
          if (!speakLocally(body, controller)) {
            // Nothing can speak it. A silent reply beats a blank screen, so
            // show the whole line at once.
            setProgress(1)
            setTalking(false)
          }
        }
      })()
    },
    [enabled, stop, disarm, speakLocally],
  )

  return { talking, speak, stream, stop, progress, line }
}
