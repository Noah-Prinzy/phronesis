import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { PART_ANCHOR, buildCar, tokenColor } from './carModel'
import type { Finding } from '../data/findings'
import { cx } from '../ui/cx'

export interface HologramProps {
  findings: Finding[]
  /** Dims everything but the selected finding's marker. */
  selectedId?: string | null
  onSelect?: (id: string) => void
  /** Sweeps the scan plane and hides markers. */
  scanning?: boolean
  vehicle?: string
  className?: string
}

interface Marker {
  id: string
  halo: THREE.Mesh
  core: THREE.Mesh
}

/** Half the car's worst-case projected extent, in model units. */
const CAR_RADIUS = 2.0

const SEVERITY_TOKEN: Record<string, [string, number]> = {
  critical: ['--critical', 0xff4d4d],
  high: ['--high', 0xff8a3d],
  warning: ['--warning', 0xf5a524],
  routine: ['--muted', 0x6e6e76],
  clear: ['--muted', 0x6e6e76],
}

export function Hologram({
  findings,
  selectedId,
  onSelect,
  scanning = false,
  vehicle,
  className,
}: HologramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  // Everything the render loop needs, kept out of React so a re-render never
  // rebuilds the scene.
  const gl = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    car: THREE.Group
    sweep: THREE.Mesh
    markers: Marker[]
    rot: number
    tilt: number
    drag: boolean
    scanning: boolean
    selected: string | null
    dist: number
    paint: (now: number) => void
  } | null>(null)

  /* ---------------------------------------------------------------- set-up */
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        // Lets the canvas be read back and saved. Cheap for a scene this size.
        preserveDrawingBuffer: true,
      })
    } catch {
      // No WebGL. The page still works; the car simply is not there.
      host.dataset.nogl = 'true'
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    const car = buildCar()
    scene.add(car)

    const sweep = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.5),
      new THREE.MeshBasicMaterial({
        color: tokenColor('--ember', 0xff7a2f),
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
      }),
    )
    sweep.rotation.x = -Math.PI / 2
    scene.add(sweep)

    const state = {
      renderer,
      scene,
      camera,
      car,
      sweep,
      markers: [] as Marker[],
      rot: 0.6,
      tilt: 0.35,
      drag: false,
      scanning: false,
      selected: null as string | null,
      dist: 6.5,
      paint: (_now: number) => {},
    }

    /**
     * Hand the renderer a concrete pixel size. Left to size itself from a
     * ResizeObserver it can park its loop and paint nothing — silently, with a
     * live context and correct layout. Same rule as the avatar.
     */
    const resize = (): void => {
      // Measure the canvas, not the host. The host has a 1px border, so its
      // border-box is 2px wider than the content box the canvas actually
      // fills — enough to leave the render permanently, subtly stretched.
      const w = Math.max(1, canvas.clientWidth)
      const h = Math.max(1, canvas.clientHeight)
      renderer.setSize(w, h, false)
      const aspect = w / h
      camera.aspect = aspect
      camera.updateProjectionMatrix()

      // Fit the camera to the box it was given rather than trusting one fixed
      // distance. A tall stage has a *narrower* horizontal field of view, so a
      // distance that frames the car on a wide panel crops it on a phone.
      const vHalf = Math.tan(((camera.fov / 2) * Math.PI) / 180)
      state.dist = CAR_RADIUS / (vHalf * Math.min(1, aspect))
    }

    const t0 = performance.now()
    state.paint = (now: number) => {
      const t = now - t0
      if (!state.drag) state.rot += 0.0032
      car.rotation.y = state.rot
      camera.position.set(0, 1.4 + state.tilt * 3.2, state.dist)
      camera.lookAt(0, 0.55, 0)

      // The sweep travels while scanning and rests once there is an answer.
      sweep.position.set(0, 0.02, state.scanning ? Math.sin(t * 0.0022) * 2.3 : -3.4)
      const mat = sweep.material as THREE.MeshBasicMaterial
      mat.opacity = state.scanning ? 0.3 : 0

      for (const m of state.markers) {
        const pulse = 0.5 + Math.sin(t * 0.0028) * 0.5
        const dim = state.selected && state.selected !== m.id ? 0.25 : 1
        const s = 1 + pulse * 0.22
        m.halo.scale.setScalar(s)
        ;(m.halo.material as THREE.MeshBasicMaterial).opacity = (0.1 + 0.1 * pulse) * dim
        ;(m.core.material as THREE.MeshBasicMaterial).opacity = dim
        m.halo.visible = !state.scanning
        m.core.visible = !state.scanning
      }

      renderer.render(scene, camera)
    }

    resize()
    // Paint once, synchronously. A hidden tab may never send a frame, and a
    // blank hologram is indistinguishable from a broken page.
    state.paint(performance.now())

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    if (!reduced) {
      const tick = (now: number) => {
        state.paint(now)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const remeasure = () => {
      resize()
      state.paint(performance.now()) // repaint now, do not wait for the loop
    }
    const ro = new ResizeObserver(remeasure)
    ro.observe(host)
    ro.observe(canvas)
    // ResizeObserver delivery rides the rendering lifecycle, so a paused or
    // backgrounded tab can miss it entirely and leave the buffer stale. The
    // window event is a cheap backstop that does not.
    window.addEventListener('resize', remeasure)

    gl.current = state

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', remeasure)
      renderer.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose?.()
        const mat = m.material
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose?.()
      })
      gl.current = null
    }
  }, [])

  /* ------------------------------------------------------- fault markers */
  useEffect(() => {
    const s = gl.current
    if (!s) return

    for (const m of s.markers) {
      s.car.remove(m.halo)
      s.car.remove(m.core)
      m.halo.geometry.dispose()
      m.core.geometry.dispose()
      ;(m.halo.material as THREE.Material).dispose()
      ;(m.core.material as THREE.Material).dispose()
    }
    s.markers = []

    for (const f of findings) {
      const [token, fallback] = SEVERITY_TOKEN[f.severity] ?? ['--muted', 0x6e6e76]
      const colour = tokenColor(token, fallback)
      const at = PART_ANCHOR[f.part]

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 14, 14),
        new THREE.MeshBasicMaterial({ color: colour, transparent: true }),
      )
      core.position.set(...at)

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 14, 14),
        new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.16 }),
      )
      halo.position.set(...at)

      s.car.add(core)
      s.car.add(halo)
      s.markers.push({ id: f.id, core, halo })
    }

    s.paint(performance.now())
  }, [findings])

  /* ------------------------------------------------- state passed to the loop */
  useEffect(() => {
    const s = gl.current
    if (!s) return
    s.scanning = scanning
    s.selected = selectedId ?? null
    s.paint(performance.now())
  }, [scanning, selectedId])

  /* ------------------------------------------------------------ orbit drag */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let last = { x: 0, y: 0 }

    const down = (e: PointerEvent) => {
      const s = gl.current
      if (!s) return
      s.drag = true
      last = { x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      const s = gl.current
      if (!s?.drag) return
      s.rot += (e.clientX - last.x) * 0.008
      s.tilt = Math.max(0.06, Math.min(1.1, s.tilt + (e.clientY - last.y) * 0.005))
      last = { x: e.clientX, y: e.clientY }
      s.paint(performance.now())
    }
    const up = () => {
      const s = gl.current
      if (s) s.drag = false
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    }
  }, [])

  return (
    <div ref={hostRef} className={cx('holo', className)}>
      <canvas ref={canvasRef} className="holo__canvas" />
      {vehicle && <span className="holo__vehicle">{vehicle}</span>}
      <span className="holo__hint">{scanning ? 'scanning…' : 'drag to orbit'}</span>
      {/* Markers are decorative in 3D; the findings list is the real control
          surface, so selection is driven from there rather than from picking
          a 3D object no keyboard can reach. */}
      {onSelect && <span className="sr-only">Fault markers are listed below the model.</span>}
    </div>
  )
}
