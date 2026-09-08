import { useEffect, useRef } from 'react'
import { specAt } from './orbSpec'
import type { OrbState } from './orbSpec'

export interface OrbRendererProps {
  state: OrbState
  size: number
  level?: number
  levelRef?: React.RefObject<number>
  /** The wrapper. Renderers write their `--orb-*` properties here. */
  hostRef: React.RefObject<HTMLElement | null>
}

/**
 * The shipped orb: a pre-rendered hex-shell sphere, played as a seamless
 * 4.5s loop and composited additively.
 *
 * It looks exactly like the reference because it *is* the reference — see
 * design/avatar-v2/README.md for how the loop was cut. The limit is that a
 * recording cannot change what it is doing, so of the state table it can only
 * honour speed, brightness, size and glow. The generative orb in OrbThree
 * honours the rest.
 */
export function OrbVideo({ state, size, level = 0, levelRef, hostRef }: OrbRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Read by the frame loop, so a state change never restarts it.
  const live = useRef({ state, from: state, since: 0, level })
  live.current.level = level
  useEffect(() => {
    const l = live.current
    if (l.state === state) return
    l.from = l.state
    l.state = state
    l.since = performance.now()
  }, [state])

  useEffect(() => {
    const video = videoRef.current
    const host = hostRef.current
    if (!video || !host) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      // Hold a mid-loop frame: the band is across the face there, so the orb
      // still reads as itself rather than as the dark hemisphere.
      video.pause()
      const park = () => {
        video.currentTime = video.duration ? video.duration * 0.25 : 1.1
      }
      if (video.readyState >= 1) park()
      else video.addEventListener('loadedmetadata', park, { once: true })
      // Still paint the resting state so it is not left at the CSS defaults.
      const spec = specAt(state, state, Number.POSITIVE_INFINITY)
      host.style.setProperty('--orb-bright', spec.peak.toFixed(3))
      host.style.setProperty('--orb-scale', spec.scale.toFixed(3))
      host.style.setProperty('--orb-glow', spec.glow.toFixed(3))
      return
    }

    void video.play().catch(() => {
      // Autoplay refused (a background tab, a strict policy). A still first
      // frame is a perfectly good avatar; it is not worth surfacing.
    })

    let raf = 0
    const tick = (now: number) => {
      const l = live.current
      const spec = specAt(l.from, l.state, l.since ? now - l.since : Number.POSITIVE_INFINITY)
      const lvl = (levelRef?.current ?? l.level) * spec.react

      // Eased rather than snapped: a playback rate that jumps reads as a
      // glitch rather than as a change of mood.
      video.playbackRate = spec.rate

      host.style.setProperty('--orb-bright', (spec.peak + lvl * 0.28).toFixed(3))
      host.style.setProperty('--orb-scale', (spec.scale + lvl * 0.05).toFixed(3))
      host.style.setProperty('--orb-glow', Math.min(1, spec.glow + lvl * 0.2).toFixed(3))

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [hostRef, levelRef, state])

  return (
    <video
      ref={videoRef}
      className="orb__video"
      width={size}
      height={size}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    >
      <source src="/avatar/avatar-loop.webm" type="video/webm" />
      <source src="/avatar/avatar-loop.mp4" type="video/mp4" />
    </video>
  )
}
