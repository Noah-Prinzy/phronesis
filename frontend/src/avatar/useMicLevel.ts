import { useEffect, useRef, useState } from 'react'

/** The exact buffer type this browser's AnalyserNode wants. */
type FreqBuffer = Parameters<AnalyserNode['getByteFrequencyData']>[0]

export type MicStatus = 'off' | 'starting' | 'live' | 'blocked' | 'unavailable'

export interface MicLevel {
  /**
   * Read by the render loop, not by React. A level that lives in state would
   * re-render the whole page sixty times a second; the ring only needs the
   * number at paint time, so it reads a ref instead.
   */
  levelRef: React.RefObject<number>
  status: MicStatus
}

/**
 * Live microphone amplitude, 0–1.
 *
 * Nothing here runs until `active` is true, and `active` is only ever set by
 * the user tapping the avatar. Permission is theirs to grant, so it is never
 * requested on mount, on mount of a parent, or speculatively.
 */
export function useMicLevel(active: boolean): MicLevel {
  const levelRef = useRef(0)
  const [status, setStatus] = useState<MicStatus>('off')

  useEffect(() => {
    if (!active) {
      levelRef.current = 0
      setStatus('off')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return
    }

    let cancelled = false
    let stream: MediaStream | null = null
    let audio: AudioContext | null = null
    let raf = 0

    setStatus('starting')

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        // The user can toggle the mic off while the prompt is still open.
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        audio = new AudioContext()
        const source = audio.createMediaStreamSource(s)
        const analyser = audio.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)

        const bins = analyser.frequencyBinCount
        const buf = new Uint8Array(new ArrayBuffer(bins)) as FreqBuffer

        const tick = () => {
          analyser.getByteFrequencyData(buf)
          let sum = 0
          for (let i = 0; i < bins; i++) sum += buf[i]
          const mean = sum / bins / 255
          // Ease towards the new value so the ring breathes rather than
          // flickering on every consonant.
          levelRef.current += (Math.min(1, mean * 2.6) - levelRef.current) * 0.25
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        setStatus('live')
      })
      .catch(() => {
        if (!cancelled) setStatus('blocked')
      })

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      void audio?.close()
      levelRef.current = 0
    }
  }, [active])

  return { levelRef, status }
}
