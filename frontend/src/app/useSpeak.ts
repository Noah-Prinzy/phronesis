import { useCallback, useEffect, useRef, useState } from 'react'
import { textToSpeech } from '../lib/api'
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
   * all — voice switched off, TTS down, autoplay refused. A reveal that
   * waited for audio that never comes would leave the screen permanently
   * blank, which is far worse than simply showing the text.
   */
  progress: number
  /** The line currently being spoken, or the last one spoken. */
  line: string
}

/**
 * Plays a line of Phronesis' voice through the shared `/api/tts` endpoint
 * (ElevenLabs), respecting the "Speak replies aloud" setting. One line plays
 * at a time: calling `speak` again, or `stop`, always cuts off whatever was
 * still going — every screen that uses this shares that same barge-in rule
 * rather than each re-deriving it.
 */
export function useSpeak(): UseSpeakResult {
  const { speak: enabled } = useVoice()
  const [talking, setTalking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [line, setLine] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    setTalking(false)
  }, [])

  useEffect(() => stop, [stop])

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
          await audio.play()
        } catch (err) {
          if (controller.signal.aborted) return
          // A silent reply beats a blank screen: show the whole line at once.
          console.warn('Could not play the spoken line:', err)
          setProgress(1)
          setTalking(false)
        }
      })()
    },
    [enabled, stop],
  )

  return { talking, speak, stop, progress, line }
}
