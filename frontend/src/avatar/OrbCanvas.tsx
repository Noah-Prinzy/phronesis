import { useEffect, useRef } from 'react'
import { createOrbScene } from './orbScene'
import type { OrbScene } from './orbScene'
import type { OrbRendererProps } from './orbSpec'

/**
 * The shipped orb: three layers of geometry, drawn every frame.
 *
 * This replaces the video renderer, and the reason was a licence rather than a
 * pixel — `avatar-loop.webm` was cut from a screen recording of unknown
 * provenance and marked in its own source as not cleared for release. What
 * follows from generating it is nonetheless the better half of the story:
 *
 *   - A recording cannot change what it is DOING. The video honoured four of
 *     the eight axes in `orbSpec`; band width and the rest were baked in, so
 *     `thinking` could not actually tighten and `responding` could not open.
 *     Both now do.
 *   - It is sharp at every size, rather than a 512px source stretched across
 *     the 19rem hero on Home.
 *   - 1.5MB of video stops shipping.
 *
 * **State never reaches this component's render.** The scene is built once and
 * the frame loop reads `state` and the audio level out of refs, so a change of
 * state — or sixty audio updates a second — never re-renders React. The old
 * renderer was careful about this too, and for the same reason: a remount
 * would restart the animation and the orb would visibly jump.
 */
export function OrbCanvas({ state, size, level = 0, levelRef, hostRef }: OrbRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<OrbScene | null>(null)

  // Read by the frame loop rather than closed over, so neither of these needs
  // to be a dependency of the effect that owns the scene.
  const live = useRef({ state, level })
  live.current.state = state
  live.current.level = level

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas) return

    const scene = createOrbScene(canvas)
    if (!scene) {
      // No WebGL. The host keeps its CSS glow, which is a perfectly good
      // avatar — far better than an empty box where Phronesis should be.
      host?.setAttribute('data-orb-fallback', 'true')
      return
    }
    sceneRef.current = scene

    let raf = 0
    const tick = (now: number) => {
      const l = live.current
      scene.frame(now, l.state, levelRef?.current ?? l.level)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      scene.dispose()
      sceneRef.current = null
      host?.removeAttribute('data-orb-fallback')
    }
    // Built once. Everything that changes is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Size is a prop rather than a resize observer: the orb has exactly two
  // sizes and the parent already animates between them in CSS.
  useEffect(() => {
    sceneRef.current?.resize(size, size)
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      className="orb__canvas"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
