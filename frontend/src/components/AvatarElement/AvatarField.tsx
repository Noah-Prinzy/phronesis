// frontend/src/components/AvatarElement/AvatarField.tsx
//
// The point cloud itself — everything inside the R3F <Canvas>. Owns its own
// geometry, material and uniforms, eases the live motion values toward the
// active state's targets every frame, and draws a soft glow at the core.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  AVATAR_MOTION,
  STATE_EASE_PER_S,
  easeMotion,
  type AvatarMotion,
  type AvatarState,
} from './avatarStates';
import {
  AVATAR_THEME_COLORS,
  REFERENCE_HEIGHT_PX,
  avatarFragmentShader,
  avatarVertexShader,
  createAvatarGeometry,
  createAvatarUniforms,
  type AvatarTheme,
} from './avatarShader';

export interface AvatarFieldProps {
  state: AvatarState;
  /** Live microphone amplitude, 0..1. Ignored unless the state uses it. */
  micLevel: number;
  /** false dims the cloud — the visual "muted" cue. */
  micOn: boolean;
  theme: AvatarTheme;
  pointCount: number;
  /** Higher packs more points into the core. See createAvatarGeometry. */
  coreBias: number;
  /**
   * The canvas's true CSS size in px, measured by the parent.
   *
   * react-three-fiber measures its own container, and that measurement is
   * not reliable here: when the element mounts before its box has settled it
   * can latch a zero size and never re-measure, leaving a live GL context
   * that composites as empty (a stray window resize event brings it back,
   * which is how this was found). Being told the size removes the guesswork.
   */
  cssSize: number;
  /**
   * Live overrides for individual motion values, used by the tuning lab.
   * Anything present here wins over the current state's target.
   */
  motionOverride?: Partial<AvatarMotion>;
}

/**
 * A soft radial sprite for the core glow — opaque centre fading to nothing.
 * Drawn on a canvas rather than shipped as an image so the folder stays
 * dependency-free and has no binary assets.
 */
function createGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Additive blending is what blows the core out to white on a dark page. On a
 * white page it would add toward the background and vanish, so light theme
 * uses normal blending with dark points instead.
 */
const BLEND_BY_THEME: Record<AvatarTheme, THREE.Blending> = {
  dark: THREE.AdditiveBlending,
  light: THREE.NormalBlending,
};

export function AvatarField({
  state,
  micLevel,
  micOn,
  theme,
  pointCount,
  coreBias,
  cssSize,
  motionOverride,
}: AvatarFieldProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Sprite>(null);

  // Live motion values, eased toward the active state each frame. A ref, not
  // state — this changes every frame and must never trigger a React render.
  const live = useRef<AvatarMotion>({ ...AVATAR_MOTION.idle });
  const smoothedMic = useRef(0);

  const geometry = useMemo(
    () => createAvatarGeometry(pointCount, coreBias),
    [pointCount, coreBias],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: avatarVertexShader,
        fragmentShader: avatarFragmentShader,
        uniforms: createAvatarUniforms(theme),
        transparent: true,
        depthWrite: false,
        blending: BLEND_BY_THEME[theme],
      }),
    // Uniforms are seeded from the theme once; theme changes are applied to
    // the existing material below rather than by rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const glowTexture = useMemo(() => createGlowTexture(), []);
  const glowMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: AVATAR_THEME_COLORS[theme].core,
        transparent: true,
        blending: BLEND_BY_THEME[theme],
        depthWrite: false,
        opacity: 0.5,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glowTexture],
  );

  // Theme swap: repoint colours and blending on the existing material.
  useEffect(() => {
    const colors = AVATAR_THEME_COLORS[theme];
    material.uniforms.uColorBase.value.copy(colors.base);
    material.uniforms.uColorCore.value.copy(colors.core);
    material.blending = BLEND_BY_THEME[theme];
    material.needsUpdate = true;
    glowMaterial.color.copy(colors.core);
    glowMaterial.blending = BLEND_BY_THEME[theme];
    glowMaterial.needsUpdate = true;
  }, [theme, material, glowMaterial]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      glowMaterial.dispose();
      glowTexture.dispose();
    },
    [geometry, material, glowMaterial, glowTexture],
  );

  // Force r3f's internal size to the measured truth rather than whatever it
  // managed to observe for itself. Safe to call repeatedly — it no-ops when
  // the size is unchanged.
  const setSize = useThree((s) => s.setSize);
  const measuredHeight = useThree((s) => s.size.height);
  const pixelRatio = useThree((s) => s.gl.getPixelRatio());

  useEffect(() => {
    if (cssSize > 0 && measuredHeight !== cssSize) setSize(cssSize, cssSize);
  }, [cssSize, measuredHeight, setSize]);

  // Point sizes are authored in CSS pixels at REFERENCE_HEIGHT_PX; rescale
  // them so the same numbers hold at any render size and pixel ratio.
  useEffect(() => {
    material.uniforms.uPixelRatio.value = pixelRatio;
    material.uniforms.uSizeScale.value =
      Math.max(cssSize || measuredHeight, 1) / REFERENCE_HEIGHT_PX;
  }, [cssSize, measuredHeight, pixelRatio, material]);

  useFrame((frameState, delta) => {
    const elapsed = frameState.clock.elapsedTime;
    // Clamp: a backgrounded tab can hand back a huge delta on return, which
    // would snap every eased value instead of easing it.
    const step = Math.min(1, Math.max(0, delta) * STATE_EASE_PER_S);

    const target = AVATAR_MOTION[state];
    easeMotion(live.current, target, step);

    // Lab overrides win, applied after the ease so they read as absolute.
    const m: AvatarMotion = motionOverride
      ? { ...live.current, ...motionOverride }
      : live.current;

    // Mic amplitude is noisy frame to frame; smooth it or the cloud jitters.
    smoothedMic.current += (micLevel - smoothedMic.current) * Math.min(1, delta * 8);

    const u = material.uniforms;
    u.uTime.value = elapsed;
    u.uExpansion.value = m.expansion;
    u.uTurbulence.value = m.turbulence;
    u.uChurn.value = m.churn;
    u.uPulse.value = m.pulse;
    u.uPulseSpeed.value = m.pulseSpeed;
    u.uTwinkle.value = m.twinkle;
    u.uPointSize.value = m.pointSize;
    u.uMic.value = smoothedMic.current;
    u.uMicResponse.value = m.micResponse;
    u.uMuted.value += ((micOn ? 0 : 1) - u.uMuted.value) * Math.min(1, delta * 5);

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * m.spin;
      groupRef.current.rotation.x = Math.sin(elapsed * 0.13) * 0.12;
    }

    if (glowRef.current) {
      const breathe = 1 + Math.sin(elapsed * 0.9) * 0.06;
      glowRef.current.scale.setScalar(m.expansion * 1.15 * breathe);
      glowMaterial.opacity = m.coreGlow * 0.55 * (micOn ? 1 : 0.55);
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} />
      <sprite ref={glowRef} material={glowMaterial} />
    </group>
  );
}

export default AvatarField;
