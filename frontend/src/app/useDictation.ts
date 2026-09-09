import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Speech to text, using the browser's own recogniser.
 *
 * Chosen over uploading audio to Whisper or ElevenLabs Scribe for one reason:
 * latency. This streams partial results *while the user is still talking*, so
 * their words appear in the composer as they speak, and the final transcript
 * lands the instant they stop. A record-then-upload round trip cannot do that
 * — it cannot even start until they have finished — and it costs money per
 * minute besides.
 *
 * **Who decides you have finished.** Left in its default non-continuous mode,
 * the browser ends the session itself after roughly a second of silence, and
 * there is no standard setting to change that. It cut people off mid-thought,
 * mid-sentence, whenever they paused to gather a word. So the recogniser now
 * runs continuously and the endpointing is ours: a pause only counts as the
 * end of a turn after `silenceMs`. Chrome still sometimes ends a continuous
 * session on its own, so it is restarted underneath whenever that happens and
 * the user still wants to be heard.
 *
 * The trade is browser support: Chrome, Edge and Safari have it, Firefox does
 * not. `supported` is false there and the caller is expected to keep typing
 * working, which it always is.
 */

/* The Web Speech API is not in TypeScript's DOM lib, so the shapes this hook
   actually touches are declared here rather than pulling in a dependency. */
interface SRAlternative {
  readonly transcript: string
}
interface SRResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SRAlternative
}
interface SRResultList {
  readonly length: number
  [index: number]: SRResult
}
interface SRResultEvent extends Event {
  readonly resultIndex: number
  readonly results: SRResultList
}
interface SRErrorEvent extends Event {
  readonly error: string
}
interface SRInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
}
type SRConstructor = new () => SRInstance

function recogniser(): SRConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor
    webkitSpeechRecognition?: SRConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type DictationError = 'denied' | 'no-speech' | 'failed'

/**
 * How long a pause may run before it counts as the end of a turn.
 *
 * Two seconds is deliberately generous. People pause to find a word, and
 * being cut off mid-thought is far more annoying than waiting a beat longer
 * for a reply — especially when describing a fault they have no vocabulary
 * for, which is most of this app's conversations.
 */
const SILENCE_MS = 2000

/** Longer before the first word: opening the mic then gathering your thoughts
    is normal, and timing out on it feels like the app gave up on you. */
const OPENING_MS = 7000

export interface DictationOptions {
  /** Partial text, updated live while they are still speaking. */
  onInterim?: (text: string) => void
  /** The finished utterance, once they stop. Never called with blank text. */
  onFinal?: (text: string) => void
  lang?: string
  /** Pause tolerance, in ms. Defaults to two seconds. */
  silenceMs?: number
}

export interface Dictation {
  supported: boolean
  listening: boolean
  error: DictationError | null
  start: () => void
  stop: () => void
}

export function useDictation({
  onInterim,
  onFinal,
  lang = 'en-US',
  silenceMs = SILENCE_MS,
}: DictationOptions = {}): Dictation {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<DictationError | null>(null)

  const ref = useRef<SRInstance | null>(null)
  const finalText = useRef('')
  /** The user wants to be heard — as opposed to the session merely ending. */
  const wanted = useRef(false)
  /** We asked it to stop, so the next `end` really is the end of the turn. */
  const closing = useRef(false)
  const timer = useRef(0)

  // The callbacks change on every render of the caller. Holding them in a ref
  // means the recogniser is built once and still always calls the latest —
  // rebuilding it per render would tear down the microphone mid-sentence.
  const cb = useRef({ onInterim, onFinal })
  cb.current = { onInterim, onFinal }

  const supported = recogniser() !== null

  useEffect(() => {
    const Ctor = recogniser()
    if (!Ctor) return

    const rec = new Ctor()
    rec.lang = lang
    // Continuous, so a pause does not end the turn. When it ends is decided
    // by the silence timer below, which is the whole point.
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    const clearSilence = () => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = 0
    }

    /** Restart the countdown to "they have finished talking". */
    const armSilence = (ms: number) => {
      clearSilence()
      timer.current = window.setTimeout(() => {
        if (!wanted.current) return
        closing.current = true
        try {
          rec.stop()
        } catch {
          /* already stopped; `end` will still arrive */
        }
      }, ms)
    }

    const onResult = (raw: Event) => {
      const e = raw as SRResultEvent
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) finalText.current += text
        else interim += text
      }
      const live = (finalText.current + interim).trim()
      if (live) cb.current.onInterim?.(live)
      // Every syllable pushes the deadline back.
      armSilence(silenceMs)
    }

    const onError = (raw: Event) => {
      const { error: kind } = raw as SRErrorEvent
      // "aborted" is what a deliberate stop looks like; it is not a failure.
      if (kind === 'aborted') return
      // In continuous mode Chrome reports no-speech and then ends. Neither is
      // worth a message on its own — the silence timer already handles it.
      if (kind === 'no-speech') return
      wanted.current = false
      setError(
        kind === 'not-allowed' || kind === 'service-not-allowed' ? 'denied' : 'failed',
      )
    }

    const onEnd = () => {
      // Chrome ends a continuous session on its own — a network blip, a long
      // silence, its own internal limit. If the user still wants to be heard,
      // that is not the end of their turn: reopen underneath them.
      if (wanted.current && !closing.current) {
        try {
          rec.start()
          return
        } catch {
          /* fall through and close the turn properly */
        }
      }

      clearSilence()
      closing.current = false
      wanted.current = false
      setListening(false)

      const said = finalText.current.trim()
      finalText.current = ''
      if (said) cb.current.onFinal?.(said)
    }

    rec.addEventListener('result', onResult)
    rec.addEventListener('error', onError)
    rec.addEventListener('end', onEnd)

    ref.current = rec
    return () => {
      clearSilence()
      wanted.current = false
      closing.current = true
      rec.removeEventListener('result', onResult)
      rec.removeEventListener('error', onError)
      rec.removeEventListener('end', onEnd)
      rec.abort()
      ref.current = null
    }
  }, [lang, silenceMs])

  const start = useCallback(() => {
    const rec = ref.current
    if (!rec) return
    setError(null)
    finalText.current = ''
    wanted.current = true
    closing.current = false
    try {
      rec.start()
      setListening(true)
      // Generous before the first word; the per-syllable timer takes over
      // from the first result.
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (!wanted.current) return
        closing.current = true
        try {
          rec.stop()
        } catch {
          /* already stopped */
        }
      }, OPENING_MS)
    } catch {
      // start() throws if it is already running. Nothing to recover from.
    }
  }, [])

  const stop = useCallback(() => {
    // stop(), not abort(): it finalises what was heard, so tapping the mic off
    // after speaking sends the sentence rather than binning it.
    closing.current = true
    ref.current?.stop()
  }, [])

  return { supported, listening, error, start, stop }
}
