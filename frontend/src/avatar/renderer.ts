/**
 * The Halo renderer.
 *
 * Pure canvas 2D — no React, no framework, nothing to mock in a test. The
 * React wrapper in Halo.tsx owns the loop and the sizing; this file only ever
 * answers "given a state and a time, what does the ring look like".
 *
 * Why it reads as alive rather than as a spinner: brightness travels around
 * the ring as three *incommensurate* sine waves. Their periods never line up,
 * so the pattern never visibly repeats, and no single point of the ring is
 * ever the permanent "front".
 */

export type HaloState = 'idle' | 'listening' | 'thinking' | 'responding'

/**
 * Motion lives in a table of plain numbers, one row per state — not in bespoke
 * code per state. That is what makes the transitions between states free: the
 * renderer interpolates between two rows and every intermediate frame is
 * already valid. (V1's avatar learned this the hard way; see ../../README.md.)
 */
export interface HaloSpec {
  /** Angular speed of the travelling waves. Thinking is the only fast one. */
  travel: number
  /** Radius multiplier. Thinking pulls in; listening leans out. */
  tighten: number
  /** Overall luminance multiplier. */
  bright: number
  /** Depth of the breathing cycle. */
  breath: number
  /** Brightness of the counter-rotating inner ring. */
  inner: number
  /** How much the live audio level is allowed to move the ring, 0–1. */
  react: number
}

export const HALO: Record<HaloState, HaloSpec> = {
  idle: { travel: 0.3, tighten: 1.0, bright: 0.8, breath: 0.02, inner: 0.45, react: 0 },
  listening: { travel: 0.34, tighten: 1.06, bright: 1.1, breath: 0.03, inner: 0.6, react: 1 },
  thinking: { travel: 1.9, tighten: 0.86, bright: 0.95, breath: 0.014, inner: 0.85, react: 0 },
  responding: { travel: 0.3, tighten: 1.02, bright: 1.2, breath: 0.022, inner: 0.6, react: 1 },
}

/** Colours, warm through cool. The ring is monochrome; only the core is warm. */
const HOT = '255,247,236'
const MID = '226,230,240'
const DIM = '138,144,158'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function blendSpec(from: HaloSpec, to: HaloSpec, t: number): HaloSpec {
  return {
    travel: lerp(from.travel, to.travel, t),
    tighten: lerp(from.tighten, to.tighten, t),
    bright: lerp(from.bright, to.bright, t),
    breath: lerp(from.breath, to.breath, t),
    inner: lerp(from.inner, to.inner, t),
    react: lerp(from.react, to.react, t),
  }
}

/**
 * Three travelling waves of different frequency and drift, folded into 0–1 and
 * gamma-shaped so the bright arc stays narrow instead of smearing round the
 * whole ring.
 */
function luminance(angle: number, t: number, speed: number): number {
  const v =
    Math.sin(angle - t * speed) * 0.5 +
    Math.sin(angle * 2 + t * speed * 0.61 + 1.9) * 0.32 +
    Math.sin(angle * 3 - t * speed * 0.37 + 4.1) * 0.18
  return Math.pow((v + 1) / 2, 1.7)
}

export interface Mote {
  lon: number
  rad: number
  seed: number
}

export function makeMotes(n: number): Mote[] {
  const out: Mote[] = []
  for (let i = 0; i < n; i++) {
    out.push({ lon: Math.random() * Math.PI * 2, rad: Math.random(), seed: Math.random() })
  }
  return out
}

export interface DrawOptions {
  /** Seconds since the component mounted. */
  time: number
  spec: HaloSpec
  motes: Mote[]
  /** Live audio level 0–1. Only has an effect where `spec.react` is non-zero. */
  level?: number
  /** Segment count for the outer ring. Scales with the canvas. */
  segments?: number
}

const TAU = Math.PI * 2

/**
 * Draws one frame. The canvas is cleared first, so this is safe to call at any
 * time from anywhere — including synchronously, before the first animation
 * frame, which is exactly what a backgrounded tab needs (it may never send one).
 */
export function drawHalo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  { time, spec, motes, level = 0, segments }: DrawOptions,
): void {
  const cx = width / 2
  const cy = height / 2
  const min = Math.min(width, height)
  // Every size below is expressed against a 440px reference so the avatar looks
  // identical at 30px in a wordmark and at 220px on a welcome screen.
  const unit = min / 440
  const segs = segments ?? (min > 200 ? 260 : 150)

  ctx.clearRect(0, 0, width, height)

  const react = 1 + level * spec.react * 0.16
  const breathe = 1 + Math.sin(time * 0.7) * spec.breath
  const R = min * 0.33 * spec.tighten * breathe * react

  // The ring is drawn as an ellipse with a slowly wandering tilt and lean, so
  // it reads as an object in space rather than a circle on glass.
  const tilt = 0.34 + Math.sin(time * 0.23) * 0.16
  const lean = Math.sin(time * 0.17) * 0.22
  const cosLean = Math.cos(lean)
  const sinLean = Math.sin(lean)

  // --- ember bloom: the accent as light, never as a fill ---
  const bloom = ctx.createRadialGradient(cx, cy, R * 0.25, cx, cy, R * 1.75)
  bloom.addColorStop(0, 'rgba(255,122,47,0.15)')
  bloom.addColorStop(0.5, 'rgba(255,122,47,0.05)')
  bloom.addColorStop(1, 'rgba(255,122,47,0)')
  ctx.fillStyle = bloom
  ctx.beginPath()
  ctx.arc(cx, cy, R * 1.75, 0, TAU)
  ctx.fill()

  // --- warm core ---
  const coreR = R * (0.16 + Math.sin(time * 0.9 + 1.2) * 0.025)
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3.2)
  core.addColorStop(0, `rgba(255,250,244,${(0.42 * spec.bright).toFixed(3)})`)
  core.addColorStop(0.3, 'rgba(255,214,170,0.11)')
  core.addColorStop(1, 'rgba(255,160,90,0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(cx, cy, coreR * 3.2, 0, TAU)
  ctx.fill()

  // --- two rings, the inner one counter-rotating ---
  for (let ring = 0; ring < 2; ring++) {
    const rr = ring === 0 ? R : R * 0.66
    const dir = ring === 0 ? 1 : -0.7
    const amp = ring === 0 ? 1 : spec.inner * 0.6
    const count = ring === 0 ? segs : Math.round(segs * 0.55)

    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU
      const lum = luminance(a, time, spec.travel * dir) * amp * 0.8 * spec.bright
      // A little high-frequency jitter keeps the ring from looking machined.
      const jit = 1 + Math.sin(a * 9 + time * 0.9) * 0.01 + Math.sin(a * 17 - time * 1.3) * 0.006
      const ex = Math.cos(a) * rr * jit
      const ey = Math.sin(a) * rr * jit * tilt
      const sx = cx + ex * cosLean - ey * sinLean
      const sy = cy + ex * sinLean + ey * cosLean

      const depth = (Math.sin(a) + 1) / 2
      let alpha = (0.05 + lum * 0.85) * (0.45 + depth * 0.55)
      if (alpha <= 0.015) continue
      if (alpha > 1) alpha = 1

      const size = unit * (0.5 + lum * 2.3) * (0.6 + depth * 0.4)
      const col = lum > 0.72 ? HOT : lum > 0.4 ? MID : DIM
      ctx.fillStyle = `rgba(${col},${alpha.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, TAU)
      ctx.fill()
    }
  }

  // --- motes: a few specks drifting just outside the ring ---
  for (const m of motes) {
    const ma = (m.lon + time * 0.12) % TAU
    const mr = R * (1.02 + m.rad * 0.22) * (1 + Math.sin(time * 0.5 + m.seed * TAU) * 0.05)
    const ex = Math.cos(ma) * mr
    const ey = Math.sin(ma) * mr * tilt
    const alpha = (0.06 + luminance(ma, time, spec.travel) * 0.3) * spec.bright
    ctx.fillStyle = `rgba(240,238,236,${Math.min(1, alpha).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(cx + ex * cosLean - ey * sinLean, cy + ex * sinLean + ey * cosLean, unit * (0.4 + m.seed * 0.7), 0, TAU)
    ctx.fill()
  }
}
