import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { ORB_RAMP, specAt } from './orbSpec'
import type { OrbRendererProps } from './OrbVideo'

/**
 * The generative orb.
 *
 * A sphere skinned in rows of separate hexagonal plates, each floating a
 * little off the shell, with a band of light sweeping around a tilted axis —
 * the same object the video shows, but built rather than recorded. That is the
 * whole point: a recording can only be played faster or brighter, whereas this
 * can genuinely change shape per state. `thinking` pulls the plates in tight
 * and narrows the band; `responding` opens both and rides the voice.
 *
 * It renders onto a transparent canvas, so unlike the video it needs no
 * `screen` blend to drop a black background — there isn't one.
 *
 * Behind a flag until it beats the render it replaces. See orbMode.ts.
 */

const TAU = Math.PI * 2
/** Plate-shell radius, in model units. Everything else is relative to it. */
const R = 1
/** How far a plate floats off the shell at lift 1. */
const GAP = 0.055
/** Latitude rows. The reference has about eleven. */
const ROWS = 11
/** Plates around the equator; every other row scales by its own latitude. */
const AROUND = 26

interface Plate {
  /** Unit outward normal — fixed in shell space. */
  n: THREE.Vector3
}

function buildPlates(): Plate[] {
  const out: Plate[] = []
  for (let r = 0; r < ROWS; r++) {
    // Area-uniform in latitude, so rows do not bunch at the poles.
    const lat = Math.acos(1 - (2 * (r + 0.5)) / ROWS)
    const ring = Math.max(1, Math.round(AROUND * Math.sin(lat)))
    // Offset every other row so the plates interlock rather than forming
    // visible columns down the sphere.
    const stagger = (r % 2) * 0.5
    for (let i = 0; i < ring; i++) {
      const lon = ((i + stagger) / ring) * TAU
      out.push({
        n: new THREE.Vector3(
          Math.sin(lat) * Math.cos(lon),
          Math.cos(lat),
          Math.sin(lat) * Math.sin(lon),
        ),
      })
    }
  }
  return out
}

/** The sampled palette as a gradient lookup. */
function rampColor(t: number, out: THREE.Color): THREE.Color {
  const x = Math.min(1, Math.max(0, t))
  for (let i = 1; i < ORB_RAMP.length; i++) {
    const b = ORB_RAMP[i]
    if (x <= b.at) {
      const a = ORB_RAMP[i - 1]
      const k = (x - a.at) / (b.at - a.at || 1)
      return out.setHex(a.hex).lerp(new THREE.Color(b.hex), k)
    }
  }
  return out.setHex(ORB_RAMP[ORB_RAMP.length - 1].hex)
}

export function OrbThree({ state, size, level = 0, levelRef, hostRef }: OrbRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const live = useRef({ state, from: state, since: 0, level })
  live.current.level = level
  useEffect(() => {
    const l = live.current
    if (l.state === state) return
    l.from = l.state
    l.state = state
    l.since = performance.now()
  }, [state])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    } catch {
      // No WebGL. The orb simply is not there; the page still works.
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0, 4.3)

    const shell = new THREE.Group()
    scene.add(shell)

    // An opaque core, so plates on the far side are hidden. Without it the
    // sphere reads as a wireframe cloud rather than a solid object — and the
    // "band passes behind and the face goes dark" moment stops working.
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(R - GAP * 0.5, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x05070a }),
    )
    shell.add(core)

    const plates = buildPlates()
    const hex = new THREE.CircleGeometry(0.108, 6)
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false })
    const mesh = new THREE.InstancedMesh(hex, mat, plates.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    shell.add(mesh)

    const dummy = new THREE.Object3D()
    const colour = new THREE.Color()
    const axis = new THREE.Vector3()
    const Z = new THREE.Vector3(0, 0, 1)

    const layout = (lift: number) => {
      const d = R + GAP * lift
      for (let i = 0; i < plates.length; i++) {
        dummy.position.copy(plates[i].n).multiplyScalar(d)
        dummy.lookAt(0, 0, 0) // +Z ends up pointing outward
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }

    const resize = () => {
      const w = Math.max(1, canvas.clientWidth)
      const h = Math.max(1, canvas.clientHeight)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }

    let phase = 0
    let lastLift = -1
    let last = performance.now()

    const paint = (now: number) => {
      const l = live.current
      const spec = specAt(l.from, l.state, l.since ? now - l.since : Number.POSITIVE_INFINITY)
      const lvl = (levelRef?.current ?? l.level) * spec.react

      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000

      // The band is the great circle perpendicular to a rotating axis; the
      // axis tilt wanders, so the three passes across the face are never
      // quite the same and the loop has no visible period.
      phase += dt * spec.sweep * TAU
      const tilt = 0.42 + Math.sin(t * 0.17) * 0.16
      axis.set(Math.cos(phase), 0, Math.sin(phase)).applyAxisAngle(Z, tilt)

      const lift = spec.lift + lvl * 0.12
      if (Math.abs(lift - lastLift) > 0.002) {
        layout(lift)
        lastLift = lift
      }

      const width = spec.band + lvl * 0.05
      const peak = spec.peak + lvl * 0.3

      for (let i = 0; i < plates.length; i++) {
        const d = Math.abs(plates[i].n.dot(axis))
        // Gamma-shaped falloff keeps the core narrow instead of smearing the
        // brightness around the whole shell.
        const lit = d >= width ? 0 : Math.pow(1 - d / width, 1.6)
        rampColor(lit * peak, colour)
        mesh.setColorAt(i, colour)
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

      shell.scale.setScalar(spec.scale + lvl * 0.04)
      // A slow drift, so the lattice itself is never quite still.
      shell.rotation.y = t * 0.06

      host.style.setProperty('--orb-glow', Math.min(1, spec.glow + lvl * 0.2).toFixed(3))
      renderer.render(scene, camera)
    }

    resize()
    layout(1)
    // Paint once, synchronously: a backgrounded tab may never deliver a frame,
    // and a blank orb is indistinguishable from a broken page.
    paint(performance.now())

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    if (!reduced) {
      const tick = (now: number) => {
        paint(now)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const remeasure = () => {
      resize()
      paint(performance.now())
    }
    const ro = new ResizeObserver(remeasure)
    ro.observe(canvas)
    window.addEventListener('resize', remeasure)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', remeasure)
      hex.dispose()
      mat.dispose()
      core.geometry.dispose()
      ;(core.material as THREE.Material).dispose()
      mesh.dispose()
      renderer.dispose()
    }
  }, [hostRef, levelRef])

  return <canvas ref={canvasRef} className="orb__canvas" width={size} height={size} aria-hidden="true" />
}
