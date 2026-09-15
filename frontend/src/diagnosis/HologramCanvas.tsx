import { useEffect, useImperativeHandle, useRef } from 'react'
import { bodyFor, createHologram } from './hologramScene'
import type { Beat, Hologram } from './hologramScene'
import type { CarPart } from '../data/findings'

/** What the page can ask of the scene once it is running. */
export interface HologramHandle {
  /** He turns the part he is holding over. Nothing else ever moves it. */
  turn(): void
}

export interface HologramCanvasProps {
  body?: string
  focus?: CarPart | null
  /** Already resolved to a real colour — see `CarHologram`. */
  tone: string
  beat: Beat
  label: string
  /** Told once, when the scene has a WebGL context and is drawing. */
  onLive: (live: boolean) => void
  handleRef?: React.RefObject<HologramHandle | null>
}

/**
 * The hologram, mounted.
 *
 * Nothing here draws; `hologramScene` owns the geometry and the frame loop.
 * This is the bridge, and it is deliberately thin — the same division the orb
 * uses, for the same reason: a scene that reaches for React state is a scene
 * that restarts its animation every time a prop moves.
 *
 * **Props never reach the frame loop through a remount.** The scene is built
 * once and told about changes with `update`, so moving from one beat to the
 * next is a move the loop eases through rather than a cut — which is the
 * entire point of the sequence.
 */
export function HologramCanvas({
  body,
  focus,
  tone,
  beat,
  label,
  onLive,
  handleRef,
}: HologramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<Hologram | null>(null)

  // Read when the scene is built rather than closed over, so none of them is
  // a dependency of the effect that owns it.
  const live = useRef({ body, focus, tone, beat })
  live.current = { body, focus, tone, beat }

  useImperativeHandle(handleRef, () => ({ turn: () => sceneRef.current?.turn() }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const l = live.current
    const scene = createHologram(canvas, {
      body: bodyFor(l.body),
      focus: l.focus ?? null,
      tone: l.tone,
      beat: l.beat,
      interactive: true,
      reduceMotion: motion.matches,
    })
    if (!scene) {
      // No WebGL. The caller keeps its drawing on screen, which is a
      // perfectly good diagram — far better than an empty box where the car
      // should be.
      onLive(false)
      return
    }
    sceneRef.current = scene
    onLive(true)

    // Someone who turns motion off mid-session has turned it off for the car
    // too. It costs one listener, and the alternative is a reload.
    const onMotion = () => scene.update({ reduceMotion: motion.matches })
    motion.addEventListener('change', onMotion)

    return () => {
      motion.removeEventListener('change', onMotion)
      scene.dispose()
      sceneRef.current = null
      onLive(false)
    }
    // Built once. Everything that changes goes through `update` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.update({
      body: bodyFor(body),
      focus: focus ?? null,
      tone,
      beat,
    })
  }, [body, focus, tone, beat])

  return <canvas ref={canvasRef} className="carho__canvas" role="img" aria-label={label} />
}
