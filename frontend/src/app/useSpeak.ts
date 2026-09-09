import { useCallback, useEffect, useRef, useState } from 'react'
import { textToSpeech } from '../lib/api'
import { browserSpeechAvailable, speakInBrowser, type BrowserSpeechHandle } from './browserSpeech'
import { useVoice } from './voice'

export interface UseSpeakResult {
  /** True while a line is actually playing — drive an avatar's "responding" state off this. */
  talking: boolean
  /** Speaks one line, cutting off whatever was still playing. A no-op if the "speak" setting is off. */
  speak: (text: string) => void
  /** Cuts off whatever is currently playing or in flight. */
  stop: () => void
  /**
   * How far through the current line the voice is, 0–1. Drives the on-screen
   * reveal in `<SpokenText>` so the words arrive as she says them.
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

/** Did the browser refuse to play because nothing has been interacted with? */
function isAutoplayBlocked(err: unknown): boolean {
  return err instanceof Error && err.name === 'NotAllowedError'
}

/**
 * Plays a line of Phronesis' voice, respecting the "Speak replies aloud"
 * setting. One line plays
 * at a time: calling `speak` again, or `stop`, always cuts off whatever was
 * still going — every screen that uses this shares that same barge-in rule
 * rather than each re-deriving it.
 *
 * **Two tiers.** `/api/tts` first, which is her real voice. If that fails for
 * any reason — quota gone, key missing, server down, no network — the
 * browser's own synthesiser takes over rather than the line falling silent.
 * A hosted voice always runs out eventually; the built-in one cannot. She
 * sounds less like herself on the fallback, which is a smaller loss than not
 * speaking at all.
 *
 * **Autoplay.** A browser will not play audio until the user has interacted
 * with the page, and a returning user goes straight from the splash to Home
 * without ever clicking — so her greeting was being refused and silently
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
   * Speak a line with the browser's own synthesiser. Returns false if this
   * browser has none, so the caller can fall through to showing the text.
   *
   * Progress here comes from real `boundary` events rather than from a clock,
   * so the reveal lands on the word actually being spoken — the one respect
   * in which the fallback is better than the voice it is standing in for.
   */
  const speakLocally = useCallback((body: string, controller: AbortController): boolean => {
    if (!browserSpeechAvailable()) return false

    browserRef.current = speakInBrowser(body, {
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
          // line is still hidden, and replaying mid-way would show her
          // finishing a sentence she never began.
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

      void (async () => {
        try {
          const blob = await textToSpeech(body, controller.signal)
          if (controller.signal.aborted) return
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audioRef.current = audio

          const finish = () => {
            URL.revokeObjectURL(url)
            setProgress(1)
            setTalking(false)
          }
          audio.addEventListener('ended', finish)
          audio.addEventListener('error', finish)
          audio.addEventListener('timeupdate', () => {
            const d = audio.duration
            // Duration is NaN until metadata lands and Infinity for a stream.
            if (!Number.isFinite(d) || d <= 0) return
            setProgress(Math.min(1, audio.currentTime / d))
          })

          setTalking(true)
          try {
            await audio.play()
          } catch (err) {
            if (controller.signal.aborted) return
            if (!isAutoplayBlocked(err)) throw err
            // Not a failure — just too early. Wait for a gesture.
            setTalking(false)
            armUnlock(audio)
          }
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

  return { talking, speak, stop, progress, line }
}
