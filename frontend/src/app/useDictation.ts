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

export interface DictationOptions {
  /** Partial text, updated live while they are still speaking. */
  onInterim?: (text: string) => void
  /** The finished utterance, once they stop. Never called with blank text. */
  onFinal?: (text: string) => void
  lang?: string
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
}: DictationOptions = {}): Dictation {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<DictationError | null>(null)

  const ref = useRef<SRInstance | null>(null)
  const finalText = useRef('')

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
    // Not continuous: a natural pause should end the turn and send it, the
    // way talking to a person does. Continuous mode would leave the mic open
    // and make the user hunt for a stop button.
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1

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
    }

    const onError = (raw: Event) => {
      const { error: kind } = raw as SRErrorEvent
      // "aborted" is what a deliberate stop looks like; it is not a failure.
      if (kind === 'aborted') return
      setError(
        kind === 'not-allowed' || kind === 'service-not-allowed'
          ? 'denied'
          : kind === 'no-speech'
            ? 'no-speech'
            : 'failed',
      )
    }

    const onEnd = () => {
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
      rec.removeEventListener('result', onResult)
      rec.removeEventListener('error', onError)
      rec.removeEventListener('end', onEnd)
      rec.abort()
      ref.current = null
    }
  }, [lang])

  const start = useCallback(() => {
    const rec = ref.current
    if (!rec) return
    setError(null)
    finalText.current = ''
    try {
      rec.start()
      setListening(true)
    } catch {
      // start() throws if it is already running. Nothing to recover from.
    }
  }, [])

  const stop = useCallback(() => {
    // stop(), not abort(): it finalises what was heard, so tapping the mic off
    // after speaking sends the sentence rather than binning it.
    ref.current?.stop()
  }, [])

  return { supported, listening, error, start, stop }
}
