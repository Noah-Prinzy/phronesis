import { useMemo } from 'react'

/**
 * The living surface, behind everything.
 *
 * A field of wireframe rectangles, right-angle traces and lit specks — a
 * schematic of somewhere rather than a picture of anything. It replaces three
 * drifting pools of warm light and a scatter of dust, which read as a lit room
 * and not as an instrument.
 *
 * **Authored landscape.** The reference this came from was a portrait
 * wallpaper with a dense column down its middle; turned on its side that same
 * composition is a dense BAND across the middle, thinning toward the top and
 * bottom. Slicing the portrait version into a wide viewport would have cropped
 * the composition rather than rotated it, which is why `biasedY` pulls the
 * field toward the horizontal centre line and leaves x alone.
 *
 * **What moves, and what does not.** Almost nothing. The drift exists only to
 * stop the field reading as a printed sheet — it is under two per cent and
 * takes minutes. What catches the eye is three kinds of rare EVENT: a signal
 * running a trace, a frame drawing its own perimeter, a cascade of specks
 * lighting in sequence. A surface that moves constantly is wallpaper you learn
 * to ignore; one that is nearly still and then does something is one you keep
 * glancing back at.
 *
 * **Why it is cheap.** Every animation is a transform or an opacity on an
 * already-composited layer, and the dashes are stroke offsets — so it runs on
 * the GPU and costs effectively nothing per frame. That matters because every
 * card above it runs a backdrop-filter, and those fight a layer that repaints.
 */

const W = 1600
const H = 900

/**
 * How much is in it.
 *
 * Chosen from the mock at "Bare". A field you can see through: nine frames is
 * a composition, and the fifty-two of the denser setting was a texture.
 */
const COUNT = {
  frames: 9,
  traces: 5,
  pulses: 3,
  perims: 2,
  specks: 28,
  breathing: 8,
  cascades: 2,
}

/**
 * Seeded, and deliberately so.
 *
 * The field is identical on every load and for every user, which makes it a
 * designed composition rather than a lottery — and means a screenshot of the
 * app looks like the app.
 */
function makeRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

interface Plane { kind: 'plane'; points: string }
interface Frame { kind: 'frame'; x: number; y: number; w: number; h: number; stroke: number; weight: number }
interface Perim { kind: 'perim'; x: number; y: number; w: number; h: number; dur: number; delay: number }
interface Trace { kind: 'trace'; points: string; stroke: number }
interface Pulse { kind: 'pulse'; points: string; dur: number; delay: number }
interface Speck { kind: 'speck'; x: number; y: number; size: number; fill: number; dur?: number; delay?: number }
interface Flash { kind: 'flash'; x: number; y: number; dur: number; delay: number }
type Shape = Plane | Frame | Perim | Trace | Pulse | Speck | Flash

function buildField(): [Shape[], Shape[], Shape[]] {
  const rnd = makeRandom(20260915)
  const depths: [Shape[], Shape[], Shape[]] = [[], [], []]
  const pick = () => {
    const r = rnd()
    return r < 0.4 ? depths[0] : r < 0.75 ? depths[1] : depths[2]
  }

  /** The field is densest across the middle band — see the note above. */
  const biasedY = () => ((rnd() + rnd() + rnd()) / 3) * H

  /* Angular planes, barely lighter than the ground. They are what stop the
     field floating in a void and give it somewhere to sit — cut from the
     corners of a WIDE frame, since wedges entering from top and bottom are
     a portrait composition's answer, not a landscape one's. */
  for (const points of [
    '0,0 520,0 250,900 0,900',
    '1600,0 1600,520 980,0',
    '1180,900 1600,640 1600,900',
  ]) {
    depths[0].push({ kind: 'plane', points })
  }

  /* Nested frames, wider than tall on average: a landscape field built from
     portrait rectangles fights its own frame. */
  const big: Array<{ x: number; y: number; w: number; h: number; depth: Shape[] }> = []
  for (let i = 0; i < COUNT.frames; i += 1) {
    const w = 40 + rnd() * rnd() * 460
    const h = 30 + rnd() * rnd() * 260
    const x = rnd() * W - w / 2
    const y = biasedY() - h / 2
    const depth = pick()
    depth.push({
      kind: 'frame',
      x, y, w, h,
      stroke: 0.05 + rnd() * 0.4,
      weight: rnd() > 0.85 ? 1.7 : 0.8,
    })
    if (w > 90 && h > 55) big.push({ x, y, w, h, depth })
  }

  /* Two of them draw themselves. Only two: this is the loudest thing in the
     field and a dozen would be a screensaver.

     Taken from the FRONT of the list rather than at random, and the list is
     never allowed to run short. Picking randomly out of whatever happened to
     qualify meant that at this density — nine frames, most of them small —
     usually one frame qualified and both picks landed on it, so the best
     event on the surface fired once or not at all. */
  while (big.length < COUNT.perims) {
    const w = 150 + rnd() * 260
    const h = 90 + rnd() * 150
    big.push({ x: rnd() * (W - w), y: biasedY() - h / 2, w, h, depth: pick() })
  }
  for (let i = 0; i < COUNT.perims; i += 1) {
    const f = big[i]
    f.depth.push({
      kind: 'perim',
      x: f.x, y: f.y, w: f.w, h: f.h,
      dur: 13 + rnd() * 12,
      delay: -(rnd() * 25),
    })
  }

  /* Right angles only. A diagonal in here would read as a drawing, and the
     whole point is that it reads as a circuit. */
  const trace = () => {
    const x0 = rnd() * W
    const y0 = biasedY()
    const x1 = x0 + (rnd() - 0.5) * 520
    const y1 = y0 + (rnd() - 0.5) * 320
    return `${x0.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`
  }

  for (let i = 0; i < COUNT.traces; i += 1) {
    pick().push({ kind: 'trace', points: trace(), stroke: 0.04 + rnd() * 0.15 })
  }
  for (let i = 0; i < COUNT.pulses; i += 1) {
    pick().push({ kind: 'pulse', points: trace(), dur: 8 + rnd() * 7, delay: -(rnd() * 15) })
  }

  /* The lit squares. A handful near-white, most specks; eight of them breathe
     so the field is never wholly static. */
  let breathing = 0
  for (let i = 0; i < COUNT.specks; i += 1) {
    const bright = rnd() > 0.93
    const size = bright ? 8 + rnd() * 9 : 2 + rnd() * 4
    const speck: Speck = {
      kind: 'speck',
      x: rnd() * W,
      y: biasedY(),
      size,
      fill: bright ? 0.95 : 0.16 + rnd() * 0.56,
    }
    if (breathing < COUNT.breathing && rnd() > 0.65) {
      breathing += 1
      speck.dur = 4 + rnd() * 7
      speck.delay = -(rnd() * 11)
    }
    pick().push(speck)
  }

  /* A cascade is six specks in a short line lit one after another a fifth of
     a second apart, so it reads as something travelling rather than as six
     things blinking — the difference between eye-catching and irritating. */
  for (let c = 0; c < COUNT.cascades; c += 1) {
    const depth = pick()
    const ox = rnd() * (W - 300)
    const oy = biasedY()
    const step = 26 + rnd() * 34
    const down = rnd() > 0.5
    const dur = 8 + rnd() * 7
    const start = -(rnd() * 16)
    for (let i = 0; i < 6; i += 1) {
      depth.push({
        kind: 'flash',
        x: ox + (down ? 0 : i * step),
        y: oy + (down ? i * step : 0),
        dur,
        delay: start + i * 0.2,
      })
    }
  }

  return depths
}

function white(alpha: number) {
  return `rgb(255 255 255 / ${alpha.toFixed(3)})`
}

function draw(shape: Shape, key: number) {
  switch (shape.kind) {
    case 'plane':
      return <polygon key={key} points={shape.points} fill="rgb(255 255 255 / 0.014)" />
    case 'frame':
      return (
        <rect
          key={key}
          x={shape.x.toFixed(1)} y={shape.y.toFixed(1)}
          width={shape.w.toFixed(1)} height={shape.h.toFixed(1)}
          fill="none" stroke={white(shape.stroke)} strokeWidth={shape.weight}
        />
      )
    case 'perim':
      /* `pathLength={100}` normalises every rectangle to the same length
         whatever its real perimeter, so one dash pattern fits all of them and
         a large frame is traced at the same speed as a small one. */
      return (
        <rect
          key={key} className="ph-perim"
          x={shape.x.toFixed(1)} y={shape.y.toFixed(1)}
          width={shape.w.toFixed(1)} height={shape.h.toFixed(1)}
          fill="none" pathLength={100}
          style={{ animationDuration: `${shape.dur.toFixed(1)}s`, animationDelay: `${shape.delay.toFixed(1)}s` }}
        />
      )
    case 'trace':
      return (
        <polyline key={key} points={shape.points} fill="none" stroke={white(shape.stroke)} strokeWidth={0.8} />
      )
    case 'pulse':
      return (
        <polyline
          key={key} className="ph-pulse" points={shape.points} fill="none"
          style={{ animationDuration: `${shape.dur.toFixed(1)}s`, animationDelay: `${shape.delay.toFixed(1)}s` }}
        />
      )
    case 'flash':
      return (
        <rect
          key={key} className="ph-flash"
          x={shape.x.toFixed(1)} y={shape.y.toFixed(1)} width={3.5} height={3.5}
          style={{ animationDuration: `${shape.dur.toFixed(1)}s`, animationDelay: `${shape.delay.toFixed(2)}s` }}
        />
      )
    default:
      return (
        <rect
          key={key} className={shape.dur ? 'ph-breathe' : undefined}
          x={shape.x.toFixed(1)} y={shape.y.toFixed(1)}
          width={shape.size.toFixed(1)} height={shape.size.toFixed(1)}
          fill={white(shape.fill)}
          style={shape.dur
            ? { animationDuration: `${shape.dur.toFixed(1)}s`, animationDelay: `${(shape.delay ?? 0).toFixed(1)}s` }
            : undefined}
        />
      )
  }
}

const DEPTHS = ['far', 'mid', 'near'] as const

export function Surface() {
  // Built once. The seed is fixed, so this is the same field every time — the
  // memo is about not re-walking two hundred shapes on every render.
  const field = useMemo(buildField, [])

  return (
    <div className="ph-surface" aria-hidden="true">
      <div className="ph-core" />
      <svg className="ph-surface__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        {DEPTHS.map((depth, i) => (
          /* Two groups deep on purpose: the outer pans in x, the inner bobs
             in y, on periods that share no factor. One element easing from A
             to B and back is a see-saw the eye finds in seconds; crossing two
             unrelated periods gives a path that does not come round again for
             the better part of an hour. */
          <g key={depth} className={`ph-pan ph-pan--${depth}`}>
            <g className={`ph-bob ph-bob--${depth}`}>
              {field[i].map(draw)}
            </g>
          </g>
        ))}
      </svg>
    </div>
  )
}
