// frontend/src/components/Avatar/AvatarSphere.tsx

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  DISPLACEMENT_BREATH_DURATION_LOADING_S,
  DISPLACEMENT_BREATH_DURATION_S,
  SHIMMER_DURATION_S,
} from './avatarAnimations';
import {
  AVATAR_THEME_COLORS,
  type AvatarTheme,
  avatarFragmentShader,
  avatarVertexShader,
  createAvatarUniforms,
} from './avatarShader';

// High poly count for a perfectly smooth silhouette with no jagged edges.
const SPHERE_SEGMENTS = 96;
const IDLE_ROTATION_SPEED = (Math.PI * 2) / 90; // one full turn every 90s — calm, not distracting
const LOADING_ROTATION_SPEED = (Math.PI * 2) / 25; // noticeably faster while thinking, still smooth

// Surface ripple amplitude, as a fraction of the sphere's radius. The
// shader's own wave shaping now does sharp crests/punchy troughs, so the
// ceiling is a bit higher than a plain smooth ripple needs — enough for
// those peaks to actually read as tall without the base looking chaotic.
const DISPLACEMENT_MIN = 0.02;
const DISPLACEMENT_MAX = 0.05;

// How long the center-outward theme-color reveal takes, in seconds.
const THEME_TRANSITION_DURATION_S = 1.3;

interface AvatarSphereProps {
  /** Speeds up the sphere's rotation and surface-ripple breathing while Phronesis is responding. */
  isLoading: boolean;
  /** Which page theme the orb's colors should match — swaps palette with a center-outward reveal. */
  theme: AvatarTheme;
}

/**
 * The shaded, animated sphere mesh at the center of the Avatar scene.
 * Owns its own ShaderMaterial instance (uniforms can't be shared across
 * materials) and drives rotation, specular shimmer, a gentle noise-based
 * surface displacement (with recomputed normals, so it actually catches the
 * light), and — on a theme change — a center-outward color reveal, all via
 * useFrame each render tick.
 */
export function AvatarSphere({ isLoading, theme }: AvatarSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const previousThemeRef = useRef(theme);
  const themeTransitionStartRef = useRef(0);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: avatarVertexShader,
        fragmentShader: avatarFragmentShader,
        // Seeded once from whatever theme is active at mount; later theme
        // changes are applied to the uniforms directly below, not by
        // recreating the material.
        uniforms: createAvatarUniforms(theme),
        transparent: true,
        // No depth write: with a mostly-transparent shell, writing depth
        // would let the near hemisphere's empty gaps occlude the far
        // hemisphere's dots instead of blending with them.
        depthWrite: false,
        // Render both faces so the far side of the sphere is visible
        // through the near side's gaps — that's what makes it read as a
        // hollow shell rather than a solid ball with a see-through skin.
        side: THREE.DoubleSide,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  // On a real theme change, snap "from" to whatever the sphere is currently
  // settled on, point "to" at the new theme, and restart the reveal clock —
  // the actual 0->1 sweep happens per-frame below.
  useEffect(() => {
    if (previousThemeRef.current === theme) return;
    previousThemeRef.current = theme;

    const nextColors = AVATAR_THEME_COLORS[theme];
    const { uColorPrimaryFrom, uColorPrimaryTo, uColorAccentFrom, uColorAccentTo, uThemeWipe } =
      material.uniforms;
    uColorPrimaryFrom.value.copy(uColorPrimaryTo.value);
    uColorAccentFrom.value.copy(uColorAccentTo.value);
    uColorPrimaryTo.value.copy(nextColors.primary);
    uColorAccentTo.value.copy(nextColors.accent);
    uThemeWipe.value = 0;
    themeTransitionStartRef.current = performance.now();
  }, [theme, material]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.rotation.y += delta * (isLoading ? LOADING_ROTATION_SPEED : IDLE_ROTATION_SPEED);

    const elapsed = state.clock.elapsedTime;
    material.uniforms.uTime.value = elapsed;

    material.uniforms.uShimmer.value =
      0.7 + Math.sin((elapsed / SHIMMER_DURATION_S) * Math.PI * 2) * 0.3;

    const displacementPeriod = isLoading
      ? DISPLACEMENT_BREATH_DURATION_LOADING_S
      : DISPLACEMENT_BREATH_DURATION_S;
    const displacementPhase = (Math.sin((elapsed / displacementPeriod) * Math.PI * 2) + 1) / 2;
    material.uniforms.uDisplacementStrength.value =
      DISPLACEMENT_MIN + displacementPhase * (DISPLACEMENT_MAX - DISPLACEMENT_MIN);

    if (material.uniforms.uThemeWipe.value < 1) {
      const elapsedMs = performance.now() - themeTransitionStartRef.current;
      const progress = Math.min(1, elapsedMs / (THEME_TRANSITION_DURATION_S * 1000));
      // Ease-out: the reveal starts fast and settles gently at the rim.
      material.uniforms.uThemeWipe.value = 1 - (1 - progress) ** 3;
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[1, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
    </mesh>
  );
}

export default AvatarSphere;
