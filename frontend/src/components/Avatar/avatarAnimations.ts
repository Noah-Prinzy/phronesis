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
const PULSE_DURATION_S = 5;
const PULSE_DURATION_LOADING_S = 2.5;
const SPIN_DURATION_S = 1;
const HOVER_TRANSITION_DURATION_S = 0.2;
const TOOLTIP_TRANSITION_DURATION_S = 0.2;

/** Shimmer cycle for the specular highlight, driven inside the WebGL shader via useFrame. */
export const SHIMMER_DURATION_S = 4.5;
/** Breathing cycle for the surface displacement amplitude — deliberately a different period than shimmer so the motions don't lock into one mechanical pulse. */
export const DISPLACEMENT_BREATH_DURATION_S = 7;
export const DISPLACEMENT_BREATH_DURATION_LOADING_S = 3.5;

const EASE_BREATHE = 'easeInOut';

/**
 * Continuous scale pulse for the outer orb. Speeds up while `isLoading` is
 * true, per the "thinking" state spec. No positional motion — the orb stays
 * put, it only breathes in place.
 */
export function getPulseAnimation(isLoading: boolean): TargetAndTransition {
  return {
    scale: [1, 1.02, 1],
    transition: {
      duration: isLoading ? PULSE_DURATION_LOADING_S : PULSE_DURATION_S,
      repeat: Infinity,
      ease: EASE_BREATHE,
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
