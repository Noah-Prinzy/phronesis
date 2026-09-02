// frontend/src/components/AvatarElement/avatarStates.ts
//
// The four states the avatar can be in, and the motion parameters that
// define how each one FEELS. Everything the shader animates is a plain
// number in here — no state has bespoke code, it just has different
// numbers, which is what makes transitions between states free: the
// renderer eases the live values toward the active state's targets rather
// than cutting between them.
//
// Tune these in the lab page (demo/AvatarLab.tsx), then paste the values
// back into this file. That is the whole design workflow.

/** The four states. `responding` is the avatar talking back. */
export type AvatarState = 'idle' | 'listening' | 'thinking' | 'responding';

export interface AvatarMotion {
  /**
   * Overall radius multiplier. Below 1 the cloud contracts inward (reads as
   * concentration), above 1 it opens out (reads as attention).
   */
  expansion: number;
  /** How far each point wanders off its home position, in world units. */
  turbulence: number;
  /** How fast the noise field the points drift through moves. */
  churn: number;
  /** Whole-cloud rotation, radians per second. */
  spin: number;
  /** Strength of the outward travelling wave — the "speaking" ripple. */
  pulse: number;
  /** How fast that wave travels outward. */
  pulseSpeed: number;
  /** Per-point brightness flicker, 0 = steady, 0.5 = heavy shimmer. */
  twinkle: number;
  /** Base point size in pixels at the reference distance. */
  pointSize: number;
  /** Intensity of the soft glow sitting at the centre of the cloud. */
  coreGlow: number;
  /**
   * How strongly the cloud responds to live mic amplitude. Only meaningful
   * while the mic is on and `reactToMic` is enabled.
   */
  micResponse: number;
}

/**
 * idle — barely moving. Slow drift, dim core, wide and relaxed. This is the
 * resting state and it should never pull the eye away from page content.
 *
 * listening — opens up and brightens. The cloud expands, the core comes up,
 * and (with the mic on) the whole body breathes with your voice.
 *
 * thinking — contracts and churns. Points pull inward and move fast in a
 * tight volume; the shimmer goes up. Reads as effort, not as waiting.
 *
 * responding — pulses outward. A wave travels from the core to the rim in
 * time with speech, so the avatar looks like it is producing the words
 * rather than just glowing while they arrive.
 */
export const AVATAR_MOTION: Record<AvatarState, AvatarMotion> = {
  idle: {
    expansion: 1,
    turbulence: 0.035,
    churn: 0.09,
    spin: 0.05,
    pulse: 0,
    pulseSpeed: 1,
    twinkle: 0.12,
    pointSize: 2.6,
    coreGlow: 0.45,
    micResponse: 0,
  },
  listening: {
    expansion: 1.14,
    turbulence: 0.05,
    churn: 0.16,
    spin: 0.09,
    pulse: 0.12,
    pulseSpeed: 0.8,
    twinkle: 0.2,
    pointSize: 3,
    coreGlow: 0.85,
    micResponse: 1,
  },
  thinking: {
    expansion: 0.82,
    turbulence: 0.085,
    churn: 0.85,
    spin: 0.42,
    pulse: 0.05,
    pulseSpeed: 2.4,
    twinkle: 0.42,
    pointSize: 2.4,
    coreGlow: 0.6,
    micResponse: 0,
  },
  responding: {
    expansion: 1.06,
    turbulence: 0.045,
    churn: 0.3,
    spin: 0.14,
    pulse: 0.55,
    pulseSpeed: 3.2,
    twinkle: 0.18,
    pointSize: 3.2,
    coreGlow: 1,
    micResponse: 0,
  },
};

/**
 * How quickly live values chase their target when the state changes, as a
 * fraction closed per second. Higher = snappier. Deliberately not instant:
 * a hard cut between states looks like a bug, an ease looks like a mood
 * change.
 */
export const STATE_EASE_PER_S = 2.6;

/** Short human-readable label per state, for demos and aria-live text. */
export const AVATAR_STATE_LABEL: Record<AvatarState, string> = {
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking',
  responding: 'Responding',
};

/** Linear interpolation used by the renderer to ease between states. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Eases every field of an AvatarMotion toward a target, in place. */
export function easeMotion(current: AvatarMotion, target: AvatarMotion, t: number): void {
  current.expansion = lerp(current.expansion, target.expansion, t);
  current.turbulence = lerp(current.turbulence, target.turbulence, t);
  current.churn = lerp(current.churn, target.churn, t);
  current.spin = lerp(current.spin, target.spin, t);
  current.pulse = lerp(current.pulse, target.pulse, t);
  current.pulseSpeed = lerp(current.pulseSpeed, target.pulseSpeed, t);
  current.twinkle = lerp(current.twinkle, target.twinkle, t);
  current.pointSize = lerp(current.pointSize, target.pointSize, t);
  current.coreGlow = lerp(current.coreGlow, target.coreGlow, t);
  current.micResponse = lerp(current.micResponse, target.micResponse, t);
}
