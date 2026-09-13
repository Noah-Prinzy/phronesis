/**
 * What each of Phronesis' four states looks like.
 *
 * One table of plain numbers, one row per state — not bespoke code per state.
 * That is what makes the transitions free: the renderer interpolates between
 * two rows and every intermediate frame is already a valid orb.
 *
 * The renderer in `orbScene.ts` reads this table and honours every row of it.
 * The video it replaced could only manage brightness, size and glow — band
 * width and plate lift were baked into the recording — so `thinking` could not
 * actually narrow and `responding` could not actually open. A `rate` field
 * existed purely to set that video's playback speed and went with it.
 *
 * The states are separated on several axes on purpose. Brightness alone left
 * `listening` and `responding` nearly identical — the same speed and the same
 * glow — which is the one distinction a voice interface cannot
 * afford to blur.
 */

export type OrbState = 'idle' | 'listening' | 'thinking' | 'responding'

export interface OrbSpec {
  /** Band sweeps per second. */
  sweep: number
  /** Half-width of the lit band, as a fraction of the sphere. */
  band: number
  /** Peak brightness of the band core. */
  peak: number
  /** How far the plates float off the shell. Tight reads as inward. */
  lift: number
  /** Overall size. */
  scale: number
  /** How much live audio moves it, 0–1. */
  react: number
  /** The CSS glow behind the orb, 0–1. */
  glow: number
}

export const ORB: Record<OrbState, OrbSpec> = {
  /* Awake, asking for nothing. Slow, dim, and never quite repeating. */
  idle: { sweep: 0.55, band: 0.22, peak: 0.8, lift: 1.0, scale: 1.0, react: 0, glow: 0.3 },

  /* Attending. Leans in slightly — a fraction smaller and tighter, not
     bigger — and everything about it is driven by the user's voice. */
  listening: {
    sweep: 0.75,
    band: 0.26,
    peak: 1.05,
    lift: 1.06,
    scale: 0.98,
    react: 1,
    glow: 0.72,
  },

  /* Searching. Fast, narrow and *dimmer* — thinking is internal, so the orb
     pulls in and darkens rather than blazing. It was brighter than idle
     before, which read as broadcasting rather than considering. */
  thinking: {
    sweep: 2.1,
    band: 0.14,
    peak: 0.72,
    lift: 0.86,
    scale: 0.94,
    react: 0,
    glow: 0.4,
  },

  /* Speaking. Open, bright, and pulsing on his own syllables. */
  responding: {
    sweep: 0.85,
    band: 0.34,
    peak: 1.3,
    lift: 1.1,
    scale: 1.03,
    react: 1,
    glow: 0.85,
  },
}

/** How long a state change takes to settle. */
export const ORB_BLEND_MS = 520

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function blendOrb(from: OrbSpec, to: OrbSpec, t: number): OrbSpec {
  return {
    sweep: lerp(from.sweep, to.sweep, t),
    band: lerp(from.band, to.band, t),
    peak: lerp(from.peak, to.peak, t),
    lift: lerp(from.lift, to.lift, t),
    scale: lerp(from.scale, to.scale, t),
    react: lerp(from.react, to.react, t),
    glow: lerp(from.glow, to.glow, t),
  }
}

/**
 * The blended spec for a state change in progress.
 *
 * Eased out, so a change arrives quickly and settles slowly — a linear blend
 * makes the orb look like it is being dragged between states.
 */
export function specAt(from: OrbState, to: OrbState, elapsedMs: number): OrbSpec {
  const k = Math.min(1, Math.max(0, elapsedMs / ORB_BLEND_MS))
  if (k >= 1 || from === to) return ORB[to]
  const eased = 1 - Math.pow(1 - k, 3)
  return blendOrb(ORB[from], ORB[to], eased)
}

/**
 * The orb's sampled palette, darkest plate to hottest specular.
 *
 * Median-sampled from the original render — see design/avatar-v2/README.md.
 * Roughly 60% of the orb sits below `plate mid`: the thing is mostly dark and
 * the band is what carries it, so the floor stays where it is.
 */
export const ORB_RAMP: Array<{ at: number; hex: number }> = [
  { at: 0.0, hex: 0x161c25 }, // plate dark
  { at: 0.18, hex: 0x2a3848 }, // plate mid
  { at: 0.35, hex: 0x3f5873 }, // steel
  { at: 0.52, hex: 0x52799e }, // band mid
  { at: 0.68, hex: 0x6495c5 }, // band bright
  { at: 0.82, hex: 0x70aae2 }, // band hot — the app's accent
  { at: 0.94, hex: 0x8ad7fb }, // band peak
  { at: 1.0, hex: 0xabf3fe }, // peak max
]

/** What every orb renderer is handed. */
export interface OrbRendererProps {
  state: OrbState
  size: number
  level?: number
  levelRef?: React.RefObject<number>
  /** The wrapper. Renderers write their `--orb-*` properties here. */
  hostRef: React.RefObject<HTMLElement | null>
}
