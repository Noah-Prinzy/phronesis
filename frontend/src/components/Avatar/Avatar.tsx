// frontend/src/components/Avatar/Avatar.tsx

import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import type { FC } from 'react';
import { useId } from 'react';
import { AvatarSphere } from './AvatarSphere';
import styles from './Avatar.module.css';
import {
  type AvatarSize,
  getPulseAnimation,
  hoverScaleAnimation,
  spinnerAnimation,
  tooltipMotionProps,
} from './avatarAnimations';
import type { AvatarTheme } from './avatarShader';

export interface AvatarProps {
  /** 'large' (480px) for the Welcome screen, 'small' (64px) for corner placements. */
  size?: AvatarSize;
  /** Speeds up rotation and surface-ripple breathing, and shows a rotating border spinner while Phronesis is responding. */
  isLoading?: boolean;
  /** Shows the hover tooltip. Only rendered when size is 'small'. */
  showTooltip?: boolean;
  /** Message displayed inside the tooltip. */
  tooltipMessage?: string;
  /** Which page theme the orb's colors should match. Swaps palette with a center-outward reveal on change. */
  theme?: AvatarTheme;
  /** Optional className for positioning/layout, applied to the outer element. */
  className?: string;
}

/** Tailwind classes per size variant. Kept static (not template-built) so Tailwind's JIT scanner can find them. */
const SIZE_CONTAINER_CLASSES: Record<AvatarSize, string> = {
  large: 'w-[400px] h-[400px]',
  small: 'w-12 h-12',
};

/**
 * Phronesis Avatar
 *
 * A true 3D sphere (react-three-fiber + a custom GLSL shader, see
 * avatarShader.ts / AvatarSphere.tsx) representing the Phronesis AI
 * assistant: a hollow shell — nearly transparent except right at each dot —
 * with a fine halftone dot mesh carrying a two-color brand gradient (blue
 * -> white on a dark page, dark navy -> blue on a light page, per `theme`),
 * lit with a directional + ambient light. A theme change reveals the new
 * palette from the center of the orb outward rather than snapping instantly.
 * Rendered double-sided with no depth write, so the far hemisphere's dots
 * show through the near one as it turns; that layering is the 3D depth cue.
 * Renders large and centered on the Welcome screen, or small in a page
 * corner elsewhere (with an optional hover tooltip). The orb holds its
 * position — only its own scale pulse and internal shading move. Motion is
 * deliberately slow and
 * calm at rest, picking up pace (rotation, pulse) while `isLoading` is true.
 */
export const Avatar: FC<AvatarProps> = ({
  size = 'large',
  isLoading = false,
  showTooltip = false,
  tooltipMessage = 'Hey! 👋 How can I help?',
  theme = 'dark',
  className = '',
}) => {
  const instanceId = useId();
  const tooltipId = `${instanceId}-tooltip`;
  const isTooltipVisible = showTooltip && size === 'small';

  return (
    <motion.div
      className={[
        'relative',
        SIZE_CONTAINER_CLASSES[size],
        size === 'small' ? 'cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      animate={getPulseAnimation(isLoading)}
      whileHover={size === 'small' ? hoverScaleAnimation : undefined}
      role="img"
      aria-label={isLoading ? 'Phronesis is thinking' : 'Phronesis'}
      aria-describedby={isTooltipVisible ? tooltipId : undefined}
    >
      {/* Circular viewport onto the 3D scene: the sphere itself is real geometry
          (see AvatarSphere.tsx) and is framed with margin so its curved silhouette
          is visible against the transparent canvas; this clip is a defensive
          guarantee that the render is always a perfect circle regardless of
          canvas transparency edge cases, not a substitute for the 3D shape. */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <Canvas
          className="absolute inset-0"
          gl={{ alpha: true, antialias: true }}
          camera={{ position: [0, 0, 3.4], fov: 40 }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[1.5, 2, 3]} intensity={1.3} />
          <AvatarSphere isLoading={isLoading} theme={theme} />
        </Canvas>
      </div>

      {/* Thinking spinner: rotating border, shown only while loading */}
      {isLoading && (
        <motion.div
          className={`absolute inset-0 rounded-full ${styles.spinner}`}
          animate={spinnerAnimation}
        />
      )}

      <AnimatePresence>
        {isTooltipVisible && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            className={`absolute -top-14 left-1/2 -translate-x-1/2 rounded-lg px-3 py-2 text-xs whitespace-nowrap ${styles.tooltip}`}
            {...tooltipMotionProps}
          >
            {tooltipMessage}
            <div
              className={`absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 ${styles.tooltipArrow}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Avatar;
