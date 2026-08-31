// frontend/src/components/Avatar/Avatar.tsx

import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import type { FC } from 'react';
import { useId } from 'react';
import { AvatarSphere } from './AvatarSphere';
import styles from './Avatar.module.css';
import {
  AVATAR_DIMENSIONS_PX,
  type AvatarSize,
  getOrbMotion,
  hoverScaleAnimation,
  spinnerAnimation,
  tooltipMotionProps,
} from './avatarAnimations';

export interface AvatarProps {
  /** 'large' (480px) for the Welcome screen, 'small' (64px) for corner placements. */
  size?: AvatarSize;
  /** Speeds up rotation and surface-ripple breathing, and shows a rotating border spinner while Phronesis is responding. */
  isLoading?: boolean;
  /** Shows the hover tooltip. Only rendered when size is 'small'. */
  showTooltip?: boolean;
  /** Message displayed inside the tooltip. */
  tooltipMessage?: string;
  /** Optional className for positioning/layout, applied to the outer element. */
  className?: string;
}

/** Tailwind classes per size variant. Kept static (not template-built) so Tailwind's JIT scanner can find them. */
const SIZE_CONTAINER_CLASSES: Record<AvatarSize, string> = {
  large: 'w-[480px] h-[480px]',
  small: 'w-16 h-16',
};

/**
 * Phronesis Avatar
 *
 * A true 3D sphere (react-three-fiber + a custom GLSL shader, see
 * avatarShader.ts / AvatarSphere.tsx) representing the Phronesis AI
 * assistant: a dark-blue-to-white brand gradient and an ultra-fine halftone
 * dot mesh that follows the sphere's own lighting and curvature, lit with a
 * directional + ambient light (no glow/bloom halo — just the sphere's own
 * shading). Renders large and centered on the Welcome screen, or small in a
 * page corner elsewhere (with an optional hover tooltip). The whole orb
 * slowly floats/bobs in place, on top of its own scale pulse, so it reads as
 * a weightless entity rather than a fixed sprite. Motion is deliberately
 * slow and calm at rest, picking up pace (rotation, pulse) while
 * `isLoading` is true.
 */
export const Avatar: FC<AvatarProps> = ({
  size = 'large',
  isLoading = false,
  showTooltip = false,
  tooltipMessage = 'Hey! 👋 How can I help?',
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
      animate={getOrbMotion(isLoading, AVATAR_DIMENSIONS_PX[size])}
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
          <AvatarSphere isLoading={isLoading} />
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
