// frontend/src/components/CarHologram/CarModel.tsx
//
// Stylized wireframe/hologram car built from primitives — no GLTF asset
// exists in this repo and sourcing/licensing one is out of scope. Unlit,
// additive-friendly materials (no lights needed) keep the same "glowing
// abstract shape" visual language as the voice avatar, rather than
// attempting photorealism.

import { Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { URGENCY_COLORS, type Urgency } from './urgencyColors';

export interface CarModelProps {
  urgency: Urgency;
}

const WHEEL_POSITIONS: [number, number, number][] = [
  [0.85, -0.05, 0.55],
  [0.85, -0.05, -0.55],
  [-0.85, -0.05, 0.55],
  [-0.85, -0.05, -0.55],
];

export function CarModel({ urgency }: CarModelProps) {
  const groupRef = useRef<Group>(null);
  const color = URGENCY_COLORS[urgency];

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.15;
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[2.4, 0.6, 1.0]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} toneMapped={false} />
        <Edges color={color} lineWidth={1.5} />
      </mesh>

      {/* Cabin */}
      <mesh position={[-0.1, 0.85, 0]}>
        <boxGeometry args={[1.2, 0.5, 0.9]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} toneMapped={false} />
        <Edges color={color} lineWidth={1.5} />
      </mesh>

      {/* Wheels */}
      {WHEEL_POSITIONS.map((position, i) => (
        <mesh key={i} position={position} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 20]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
          <Edges color={color} lineWidth={1.5} />
        </mesh>
      ))}
    </group>
  );
}

export default CarModel;
