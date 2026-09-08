import { useEffect, useLayoutEffect, useRef } from 'react'
import { ROUTE_TO, USER_AT } from '../data/places'
import type { Place } from '../data/places'
import { cx } from '../ui/cx'

export interface MapCanvasProps {
  places: Place[]
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
}

/**
 * A stand-in map.
 *
 * Deliberately not a map SDK. The SDK choice — Google versus MapLibre — is a
 * product decision that is still open, and it turns on billing and Ugandan
 * routing quality rather than on anything this page needs to settle first.
 *
 * So this draws the same *shapes* a tiled map will: streets, a route, pins, a
 * position. Everything around it — the glass chrome, the sheet, the filters,
 * selection, hit-testing — is real and does not change when the tiles do. The
 * swap replaces this one file and turns `x`/`y` into `lat`/`lng`.
 */
export function MapCanvas({ places, selectedId, onSelect, className }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Screen positions of the pins from the last paint, for hit-testing. Kept in
  // a ref so a click never has to recompute the projection.
  const hits = useRef<Array<{ id: string; x: number; y: number }>>([])
  const live = useRef({ places, selectedId })
  live.current = { places, selectedId }
  // The loop's paint function, so a selection change can force a frame even
  // when there is no loop (reduced motion) or the tab is not sending frames.
  const paintRef = useRef<((now: number) => void) | null>(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0

    const resize = (): boolean => {
      const cssW = canvas.clientWidth
      const cssH = canvas.clientHeight
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

    const road = (pts: Array<[number, number]>, width: number, colour: string) => {
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
      ctx.strokeStyle = colour
      ctx.lineWidth = width
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    const paint = (now: number): void => {
      const { places: ps, selectedId: sel } = live.current
      const scale = Math.min(w, h) / 600

      ctx.fillStyle = '#0b0d10'
      ctx.fillRect(0, 0, w, h)

      // City blocks, barely there — they give the streets something to be
      // between without competing with the route.
      ctx.fillStyle = 'rgba(255,255,255,0.018)'
      for (let bx = 0; bx < 7; bx++) {
        for (let by = 0; by < 9; by++) {
          ctx.fillRect(w * (0.06 + bx * 0.16) + 8, h * (0.05 + by * 0.115) + 6, w * 0.135, h * 0.088)
        }
      }

      // Streets: a casing under a lighter fill, the way real maps draw them.
      for (let i = 0; i <= 7; i++) {
        const y = h * (0.05 + i * 0.13)
        const pts: Array<[number, number]> = [
          [0, y],
          [w, y + (i % 2 ? -14 : 18) * scale],
        ]
        road(pts, (i === 3 ? 7 : 3.2) * scale + 3, 'rgba(255,255,255,0.05)')
        road(pts, (i === 3 ? 7 : 3.2) * scale, 'rgba(190,196,208,0.2)')
      }
      for (let j = 0; j <= 6; j++) {
        const x = w * (0.06 + j * 0.16)
        const pts: Array<[number, number]> = [
          [x, 0],
          [x + (j % 2 ? 20 : -16) * scale, h],
        ]
        road(pts, (j === 2 ? 7 : 3.2) * scale + 3, 'rgba(255,255,255,0.05)')
        road(pts, (j === 2 ? 7 : 3.2) * scale, 'rgba(190,196,208,0.2)')
      }

      // The route to the selected place. Ember, because it is the one thing on
      // the map that is *about* you.
      const route = sel ? ROUTE_TO[sel] : undefined
      if (route) {
        const pts = route.map(([x, y]) => [x * w, y * h] as [number, number])
        road(pts, 20 * scale, 'rgba(112,170,226,0.22)')
        road(pts, 7 * scale, 'rgba(112,170,226,0.95)')
      }

      // Pins.
      hits.current = []
      for (const p of ps) {
        const px = p.x * w
        const py = p.y * h
        hits.current.push({ id: p.id, x: px / dpr, y: py / dpr })

        if (p.id === sel) {
          const pulse = 0.5 + Math.sin(now * 0.0022) * 0.5
          ctx.beginPath()
          ctx.arc(px, py, (24 + pulse * 9) * scale, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(112,170,226,${(0.14 * (1 - pulse * 0.55)).toFixed(3)})`
          ctx.fill()

          ctx.save()
          ctx.beginPath()
          ctx.moveTo(px, py + 9 * scale)
          ctx.bezierCurveTo(px - 15 * scale, py - 8 * scale, px - 12 * scale, py - 25 * scale, px, py - 25 * scale)
          ctx.bezierCurveTo(px + 12 * scale, py - 25 * scale, px + 15 * scale, py - 8 * scale, px, py + 9 * scale)
          ctx.closePath()
          ctx.shadowColor = '#70aae2'
          ctx.shadowBlur = 16 * scale
          ctx.fillStyle = '#70aae2'
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.beginPath()
          ctx.arc(px, py - 13 * scale, 5 * scale, 0, Math.PI * 2)
          ctx.fillStyle = '#111419'
          ctx.fill()
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.arc(px, py, 8 * scale, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(17,20,25,0.9)'
          ctx.fill()
          ctx.lineWidth = 2.4 * scale
          ctx.strokeStyle = p.openNow ? 'rgba(190,196,208,0.55)' : 'rgba(120,124,134,0.4)'
          ctx.stroke()
        }
      }

      // Where you are.
      const ux = USER_AT.x * w
      const uy = USER_AT.y * h
      const breathe = 0.5 + Math.sin(now * 0.0016) * 0.5
      ctx.beginPath()
      ctx.arc(ux, uy, (18 + breathe * 7) * scale, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(226,230,240,${(0.1 * (1 - breathe * 0.5)).toFixed(3)})`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ux, uy, 7 * scale, 0, Math.PI * 2)
      ctx.fillStyle = '#e2e6f0'
      ctx.fill()
      ctx.lineWidth = 3 * scale
      ctx.strokeStyle = '#0b0d10'
      ctx.stroke()
    }

    paintRef.current = paint
    resize()
    // Paint once, synchronously. A backgrounded tab may never send a frame,
    // and a blank map looks exactly like a broken one.
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

    const remeasure = () => {
      resize()
      paint(performance.now())
    }
    const ro = new ResizeObserver(remeasure)
    ro.observe(canvas)
    // ResizeObserver delivery rides the rendering lifecycle, so a paused tab
    // can miss it. The window event is a cheap backstop that does not.
    window.addEventListener('resize', remeasure)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', remeasure)
      paintRef.current = null
    }
  }, [])

  // Repaint immediately when the selection changes rather than waiting for the
  // next frame — the same reason the first paint is synchronous, and the only
  // reason selection works at all under prefers-reduced-motion.
  useEffect(() => {
    paintRef.current?.(performance.now())
  }, [selectedId, places])

  return (
    <canvas
      ref={canvasRef}
      className={cx('map__canvas', className)}
      aria-label="Map. The list below carries the same places."
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const cx0 = e.clientX - r.left
        const cy0 = e.clientY - r.top
        let best: { id: string; d: number } | null = null
        for (const p of hits.current) {
          const d = Math.hypot(p.x - cx0, p.y - cy0)
          if (d < 28 && (!best || d < best.d)) best = { id: p.id, d }
        }
        if (best) onSelect(best.id)
      }}
    />
  )
}
