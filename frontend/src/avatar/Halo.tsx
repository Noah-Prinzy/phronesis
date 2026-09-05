import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { HALO, blendSpec, drawHalo, makeMotes } from './renderer'
import type { HaloState } from './renderer'
import { cx } from '../ui/cx'

export interface HaloProps {
  state?: HaloState
  /** Rendered size in CSS pixels. The canvas backing store is this × DPR. */
  size?: number
  /** Live audio level, 0–1. Only moves the ring in listening/responding. */
  level?: number
  /**
   * A ref carrying the live level instead of a prop. The render loop reads it
   * directly, so a microphone can drive the ring at 60fps without re-rendering
   * anything above it.
   */
  levelRef?: React.RefObject<number>
  /** Tap target — on Home this toggles the microphone. */
  onActivate?: () => void
  label?: string
  className?: string
  /** Layout only — the component owns every visual property itself. */
  style?: CSSProperties
}

const STATE_BLEND_MS = 620 // --t-dock: the same duration the avatar docks in

export function Halo({
  state = 'idle',
  size = 140,
  level = 0,
  levelRef,
  onActivate,
  label,
  className,
  style,
}: HaloProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const motes = useMemo(() => makeMotes(size > 160 ? 46 : size > 90 ? 30 : 12), [size])

  // Everything the loop reads lives in a ref, so changing state or level never
  // tears down and restarts the animation.
  const live = useRef({ state, level, from: state, since: 0 })
  live.current.level = level
  const levelSource = useRef(levelRef)
  levelSource.current = levelRef

  useEffect(() => {
    if (live.current.state === state) return
    live.current.from = live.current.state
    live.current.state = state
    live.current.since = performance.now()
  }, [state])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0

    /**
     * Hand the canvas a concrete pixel size. Left to work it out for itself a
     * renderer can sit with a live context, correct layout, and a parked loop,
     * painting nothing — silently. That was the V1 avatar bug, and it cost a
     * day; see ../../README.md.
     */
    const resize = (): boolean => {
      const cssW = canvas.getBoundingClientRect().width || size
      const cssH = canvas.getBoundingClientRect().height || size
      const nw = Math.max(1, Math.round(cssW * dpr))
      const nh = Math.max(1, Math.round(cssH * dpr))
      const changed = nw !== canvas.width || nh !== canvas.height
      if (changed) {
        canvas.width = nw
        canvas.height = nh
      }
      // Assign the locals ALWAYS, not only when the canvas changed size.
      // Returning early left them at 0 whenever the effect re-ran against a
      // canvas that was already the right size — which StrictMode does on
      // every mount — and the loop then painted into a 0x0 box forever.
      w = nw
      h = nh
      return changed
    }

    const t0 = performance.now()

    const paint = (now: number): void => {
      const l = live.current
      const target = HALO[l.state]
      const elapsed = l.since ? now - l.since : STATE_BLEND_MS
      const k = Math.min(1, elapsed / STATE_BLEND_MS)
      // ease-out, so a state change arrives quickly and settles slowly
      const eased = 1 - Math.pow(1 - k, 3)
      const spec = k >= 1 ? target : blendSpec(HALO[l.from], target, eased)
      drawHalo(ctx, w, h, {
        time: (now - t0) / 1000,
        spec,
        motes,
        level: levelSource.current?.current ?? l.level,
        segments: Math.min(300, Math.max(90, Math.round(w / 1.6))),
      })
    }

    resize()
    // Paint once, synchronously, before any frame is requested. A hidden or
    // backgrounded tab may never deliver one, and a blank avatar looks
    // identical to a broken app.
    paint(performance.now())

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    if (!reduced) {
      const tick = (now: number) => {
        paint(now)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    // Repaint on resize immediately rather than waiting for the loop — same
    // reason as the synchronous first paint.
    const ro = new ResizeObserver(() => {
      if (resize()) paint(performance.now())
    })
    ro.observe(canvas)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [motes, size])

  const canvas = (
    <canvas
      ref={canvasRef}
      className="ph-halo__canvas"
      style={{ width: size, height: size }}
      aria-hidden={onActivate ? undefined : true}
    />
  )

  if (!onActivate) {
    return (
      <div className={cx('ph-halo', className)} style={style}>
        {canvas}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={label ?? 'Talk to Phronesis'}
      style={style}
      className={cx('ph-halo', 'ph-halo--button', className)}
    >
      {canvas}
    </button>
  )
}
