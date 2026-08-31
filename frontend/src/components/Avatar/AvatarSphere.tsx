// frontend/src/components/Avatar/AvatarSphere.tsx

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  DISPLACEMENT_BREATH_DURATION_LOADING_S,
  DISPLACEMENT_BREATH_DURATION_S,
  SHIMMER_DURATION_S,
} from './avatarAnimations';
import { avatarFragmentShader, avatarVertexShader, createAvatarUniforms } from './avatarShader';

// High poly count for a perfectly smooth silhouette with no jagged edges.
const SPHERE_SEGMENTS = 96;
const IDLE_ROTATION_SPEED = (Math.PI * 2) / 60; // one full turn every 60s — calm, not distracting
const LOADING_ROTATION_SPEED = (Math.PI * 2) / 15; // noticeably faster while thinking, still smooth

// Surface ripple amplitude, as a fraction of the sphere's radius — kept
// subtle so the shape reads as a perfectly smooth sphere at a glance.
const DISPLACEMENT_MIN = 0.02;
const DISPLACEMENT_MAX = 0.04;

interface AvatarSphereProps {
  /** Speeds up the sphere's rotation and surface-ripple breathing while Phronesis is responding. */
  isLoading: boolean;
}

/**
 * The shaded, animated sphere mesh at the center of the Avatar scene.
 * Owns its own ShaderMaterial instance (uniforms can't be shared across
 * materials) and drives rotation, specular shimmer, and a gentle
 * noise-based surface displacement (with recomputed normals, so it actually
 * catches the light) via useFrame each render tick.
 */
export function AvatarSphere({ isLoading }: AvatarSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: avatarVertexShader,
        fragmentShader: avatarFragmentShader,
        uniforms: createAvatarUniforms(),
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

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
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[1, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
    </mesh>
  );
}

export default AvatarSphere;
