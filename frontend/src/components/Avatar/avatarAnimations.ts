// frontend/src/components/Avatar/avatarAnimations.ts

import type { TargetAndTransition } from 'framer-motion';

/** Which context the Avatar is being rendered in. */
export type AvatarSize = 'large' | 'small';

/** Pixel footprint for each size variant (kept in sync with the Tailwind size classes in Avatar.tsx). */
export const AVATAR_DIMENSIONS_PX: Record<AvatarSize, number> = {
  large: 480,
  small: 64,
};

// --- Animation durations (seconds), named so nothing below is a magic number ---
// Slower and calmer than earlier passes: idle motion reads as relaxed, loading
// picks up energy without ever feeling frantic.
const PULSE_DURATION_S = 3.5;
const PULSE_DURATION_LOADING_S = 1.75;
const SPIN_DURATION_S = 1;
const HOVER_TRANSITION_DURATION_S = 0.2;
const TOOLTIP_TRANSITION_DURATION_S = 0.2;
/** Vertical float cycle — its own period, distinct from the pulse/glow/displacement cycles, so the motion doesn't lock into one mechanical rhythm. */
const FLOAT_DURATION_S = 6;
/** How far the orb drifts up/down, as a fraction of its own pixel size. */
const FLOAT_AMPLITUDE_RATIO = 0.06;

/** Shimmer cycle for the specular highlight, driven inside the WebGL shader via useFrame. */
export const SHIMMER_DURATION_S = 3;
/** Breathing cycle for the surface displacement amplitude — deliberately a different period than glow/shimmer so the motions don't lock into one mechanical pulse. */
export const DISPLACEMENT_BREATH_DURATION_S = 5;
export const DISPLACEMENT_BREATH_DURATION_LOADING_S = 2.5;

const EASE_BREATHE = 'easeInOut';

/**
 * The outer orb's idle motion: a gentle scale pulse (speeds up while
 * `isLoading` is true) combined with a slow vertical float, so it reads as a
 * weightless entity drifting on the page rather than a fixed sprite. The two
 * run on independent periods/transitions within a single `animate` target.
 */
export function getOrbMotion(isLoading: boolean, sizePx: number): TargetAndTransition {
  const floatAmplitude = sizePx * FLOAT_AMPLITUDE_RATIO;
  return {
    scale: [1, 1.02, 1],
    y: [0, -floatAmplitude, 0],
    transition: {
      scale: {
        duration: isLoading ? PULSE_DURATION_LOADING_S : PULSE_DURATION_S,
        repeat: Infinity,
        ease: EASE_BREATHE,
      },
      y: {
        duration: FLOAT_DURATION_S,
        repeat: Infinity,
        ease: EASE_BREATHE,
      },
    },
  };
}

/** Rotating border spinner shown only while `isLoading` is true. */
export const spinnerAnimation: TargetAndTransition = {
  rotate: 360,
  transition: {
    duration: SPIN_DURATION_S,
    repeat: Infinity,
    ease: 'linear',
  },
};

/** Hover scale-up, applied to the small (interactive) avatar variant. */
export const hoverScaleAnimation: TargetAndTransition = {
  scale: 1.1,
  transition: { duration: HOVER_TRANSITION_DURATION_S },
};

/** Enter/exit motion props for the hover tooltip. */
export const tooltipMotionProps = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: TOOLTIP_TRANSITION_DURATION_S },
} as const;
