import * as THREE from 'three'
import type { CarPart } from '../data/findings'

/**
 * The car, as a hologram.
 *
 * Low-poly primitives with edge wireframes and a faint fill. This is the
 * *treatment*, not the final asset: in production it becomes a compressed
 * glTF, and five generic bodies — sedan, hatch, SUV, pickup, minibus — cover
 * almost every car in Uganda without licensing a model per vehicle or pushing
 * 20MB down a mobile connection.
 */

const EDGE = 0xe6ebf5
const FILL = 0xffffff

/** Where each part sits in model space, so a finding can be pinned to it. */
export const PART_ANCHOR: Record<CarPart, [number, number, number]> = {
  'front-brakes': [-0.95, 0.3, -1.35],
  'rear-brakes': [-0.95, 0.3, 1.42],
  engine: [0, 0.55, -1.72],
  cabin: [0, 1.05, -0.18],
  battery: [0.7, 0.55, -1.6],
}

export function buildCar(): THREE.Group {
  const g = new THREE.Group()

  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const geo = new THREE.BoxGeometry(w, h, d)
    // Object3D.position is read-only — set through it, never over it.
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: FILL, transparent: true, opacity: 0.045 }),
    )
    mesh.position.set(x, y, z)
    g.add(mesh)

    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.55 }),
    )
    line.position.set(x, y, z)
    g.add(line)
  }

  box(1.85, 0.62, 4.2, 0, 0.42, 0) // body
  box(1.62, 0.58, 1.95, 0, 0.98, -0.18) // cabin
  box(1.74, 0.3, 1.15, 0, 0.36, -1.72) // bonnet
  box(1.74, 0.34, 0.95, 0, 0.4, 1.72) // boot

  const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 18)
  const wheelEdges = new THREE.EdgesGeometry(wheel)
  for (const [x, z] of [
    [-0.95, -1.35],
    [0.95, -1.35],
    [-0.95, 1.42],
    [0.95, 1.42],
  ]) {
    const line = new THREE.LineSegments(
      wheelEdges,
      new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.4 }),
    )
    line.rotation.z = Math.PI / 2
    line.position.set(x, 0.3, z)
    g.add(line)
  }

  const grid = new THREE.GridHelper(9, 14, 0x3a3a42, 0x2a2a30)
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  gridMat.opacity = 0.32
  grid.position.y = -0.02
  g.add(grid)

  return g
}

/**
 * Reads a colour out of the design tokens rather than hard-coding a hex here.
 * The severity palette lives in tokens.css and has exactly one definition —
 * that has to hold in WebGL too, or the 3D view quietly becomes a second
 * source of truth.
 */
export function tokenColor(name: string, fallback: number): THREE.Color {
  if (typeof window === 'undefined') return new THREE.Color(fallback)
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return new THREE.Color(fallback)
  try {
    return new THREE.Color(raw)
  } catch {
    return new THREE.Color(fallback)
  }
}
