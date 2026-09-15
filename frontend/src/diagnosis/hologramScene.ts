import * as THREE from 'three'
import type { CarPart } from '../data/findings'

/**
 * The car, generated rather than modelled.
 *
 * There is no model file here and there is not going to be one until a real
 * one arrives. Each body is an extruded side profile plus a handful of
 * proportions taken from published dimensions — which are facts, not artwork,
 * so nothing in this file has a licence attached to it. That mattered after
 * the video: a demo cannot be held up waiting for someone to clear an asset.
 *
 * It also buys something a bought model would have cost us. A GLTF arrives as
 * one mesh, or as a hierarchy named by whoever built it, and isolating "front
 * brakes" means editing it in Blender. Here every part is created separately
 * with the id the app already uses, so marking a fault on one is free.
 *
 * When the real models land they replace `buildCar` and nothing else.
 */

export type HologramBody = 'saloon' | 'suv' | 'van'

/**
 * Which beat of the sequence the page is on.
 *
 * The three are one move, not three screens, and the order is the whole
 * proposal: the car is the page until there is something to say, and then he
 * takes the middle and shows you the thing itself.
 *
 * - `rest`   The car IS the page. He is a small presence in the corner.
 * - `centre` He takes the middle and the car moves out of the way.
 * - `lift`   He reaches in, takes the part out, and holds it up.
 */
export type Beat = 'rest' | 'centre' | 'lift'

export interface HologramOptions {
  body: HologramBody
  /** The part he is talking about: marked at rest, taken out on `lift`. */
  focus: CarPart | null
  /** Severity colour, already resolved to something THREE.Color accepts. */
  tone: string
  beat: Beat
  /** Whether dragging turns the car. Off for the idle state. */
  interactive: boolean
  reduceMotion: boolean
}

export interface Hologram {
  update(next: Partial<HologramOptions>): void
  /**
   * He turns the part over. One deliberate half-turn.
   *
   * This is the ONLY thing that ever moves a part he is holding. Anything
   * that turns under its own steam is a display model on a plinth — and a
   * flat part, a brake disc or a pane, sweeps through edge-on twice a
   * revolution and disappears while you are looking straight at it.
   */
  turn(): void
  dispose(): void
}

/** Walk a value toward a target. `k` comes from the frame time, not a count,
    so a move takes the same wall-clock time on a slow device as a fast one. */
const ease = (a: number, b: number, k: number) => a + (b - a) * k
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

const ACCENT = 0x6fb4ee
const ACCENT_HI = 0xa9dcff

/**
 * A body is a SIDE PROFILE extruded sideways.
 *
 * That is the whole trick, and it is why three very different vehicles come
 * out of one function: the silhouette of a car lives entirely in its profile,
 * and everything else — ride height, track, wheel size — is a number.
 *
 * Points run clockwise from the front bumper, along the bonnet, up the
 * windscreen, over the roof, down the back and along the sill. `screen` and
 * `rear` index into that list to find the greenhouse, and `doors` gives the
 * front edge, the B-pillar and the rear edge in x. Every pane and panel is
 * cut from those, so editing a profile moves the glazing with it rather than
 * leaving it floating where the old roof used to be.
 */
interface BodySpec {
  label: string
  profile: Array<[number, number]>
  width: number
  wheel: number
  wheelbase: number
  ride: number
  engine: [number, number, number]
  cabinAt: number
  screen: [number, number]
  rear: [number, number]
  doors: [number, number, number]
}

const BODIES: Record<HologramBody, BodySpec> = {
  /* Premio: 4595 × 1695 × 1475, wheelbase 2700, 195/65 R15.
     A formal three-box saloon — bonnet, cabin and boot are three distinct
     volumes, the roofline is level, and the whole thing is low. */
  saloon: {
    label: 'saloon',
    profile: [
      [-2.3, 0.42], [-2.27, 0.7], [-1.95, 0.8], [-1.3, 0.88],
      [-0.7, 0.95], [-0.3, 1.34], [0.25, 1.475], [0.8, 1.46],
      [1.35, 1.22], [1.85, 1.0], [2.24, 0.92], [2.3, 0.46],
      [2.0, 0.3], [-2.0, 0.3],
    ],
    width: 1.695, wheel: 0.317, wheelbase: 1.35, ride: 0.14,
    engine: [-1.55, 0.72, 0.9], cabinAt: 0.15,
    screen: [4, 5], rear: [7, 8], doors: [-0.6, 0.25, 1.0],
  },
  /* Harrier: 4720 × 1835 × 1690, wheelbase 2660, 225/65 R17.
     Taller and wider, but the giveaway is the roof — it starts dropping
     almost immediately and runs into a rakish tail, which is what makes this
     read as a Harrier and not a generic box on wheels. */
  suv: {
    label: 'SUV',
    profile: [
      [-2.36, 0.55], [-2.32, 0.92], [-1.95, 1.02], [-1.35, 1.1],
      [-0.8, 1.2], [-0.35, 1.6], [0.3, 1.69], [0.95, 1.66],
      [1.55, 1.5], [2.05, 1.2], [2.33, 1.0], [2.36, 0.58],
      [2.05, 0.4], [-2.05, 0.4],
    ],
    width: 1.835, wheel: 0.362, wheelbase: 1.33, ride: 0.175,
    engine: [-1.6, 0.85, 0.95], cabinAt: 0.2,
    // The tailgate glass is [8..10], not [7..], or the pane cuts a chord
    // through the C-pillar and hangs inside the body it belongs to.
    screen: [4, 5], rear: [8, 10], doors: [-0.7, 0.3, 1.05],
  },
  /* Noah: 4695 × 1695 × 1825, wheelbase 2850.
     One box. Barely any bonnet, a windscreen that is nearly upright, and a
     flat roof running almost the whole length — the longest wheelbase of the
     three inside the second-shortest body, which is the entire point of an
     MPV. */
  van: {
    label: 'van',
    profile: [
      [-2.35, 0.5], [-2.32, 0.86], [-2.2, 0.98], [-1.95, 1.15],
      [-1.55, 1.7], [-1.15, 1.825], [1.45, 1.825], [1.95, 1.75],
      [2.25, 1.3], [2.33, 0.95], [2.35, 0.52], [2.05, 0.36], [-2.05, 0.36],
    ],
    width: 1.695, wheel: 0.317, wheelbase: 1.425, ride: 0.155,
    engine: [-1.95, 0.8, 0.7], cabinAt: 0.05,
    // Nearly upright screen, so the front door starts a long way behind it.
    screen: [3, 4], rear: [6, 8], doors: [-1.35, 0.1, 1.25],
  },
}

/* ------------------------------------------------------------ surfacing */

/**
 * The shell is lit by facing, not by a lamp.
 *
 * A flat translucent film reads as smoked perspex, because every pixel of the
 * body comes out the same brightness whatever the surface is doing
 * underneath. What an X-ray of a car actually looks like is Fresnel — dark
 * where the surface faces you and bright where it turns away, so the
 * silhouette and every curve glow while the flat panels fall back. That one
 * term is most of the difference between a model and a projection, and it is
 * the same trick the avatar's veil uses.
 *
 * Double-sided on purpose: near the silhouette you see the far wall of the
 * body through the near one and the two rims stack, which is exactly the
 * build-up a real volume gives you.
 */
const HOLO_VERT = `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const HOLO_FRAG = `
  uniform vec3 uColour;
  uniform float uBase;
  uniform float uRim;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float rim = pow(1.0 - facing, 2.4);
    gl_FragColor = vec4(uColour, uBase + rim * uRim);
  }
`

/**
 * Round every corner of a polyline before it is extruded.
 *
 * A profile is a list of straight runs, and extruding one gives a silhouette
 * with a hard crease at every point — bonnet to windscreen, windscreen to
 * roof, roof to boot. No amount of shading hides that; it is the geometry.
 * Each corner becomes a short quadratic arc instead, clamped so a short run
 * cannot be swallowed by its own fillet, which keeps the bumpers crisp while
 * the roofline goes smooth.
 */
function filletPath(
  points: ReadonlyArray<readonly [number, number]>,
  radius = 0.14,
  steps = 5,
): Array<[number, number]> {
  const len = points.length
  const at = (i: number) => points[(i + len) % len]
  const out: Array<[number, number]> = []
  for (let i = 0; i < len; i += 1) {
    const c = at(i)
    const a = at(i - 1)
    const b = at(i + 1)
    const ax = a[0] - c[0]
    const ay = a[1] - c[1]
    const bx = b[0] - c[0]
    const by = b[1] - c[1]
    const la = Math.hypot(ax, ay) || 1
    const lb = Math.hypot(bx, by) || 1
    const r = Math.min(radius, la * 0.45, lb * 0.45)
    const s0 = [c[0] + (ax / la) * r, c[1] + (ay / la) * r]
    const s1 = [c[0] + (bx / lb) * r, c[1] + (by / lb) * r]
    for (let k = 0; k <= steps; k += 1) {
      const t = k / steps
      const u = 1 - t
      out.push([
        u * u * s0[0] + 2 * u * t * c[0] + t * t * s1[0],
        u * u * s0[1] + 2 * u * t * c[1] + t * t * s1[1],
      ])
    }
  }
  return out
}

/** The body's top and bottom at a given x, read straight off the profile. */
function sectionAt(
  profile: ReadonlyArray<readonly [number, number]>,
  x: number,
): [number, number] | null {
  const ys: number[] = []
  for (let i = 0; i < profile.length; i += 1) {
    const [x0, y0] = profile[i]
    const [x1, y1] = profile[(i + 1) % profile.length]
    if (x0 !== x1 && (x0 - x) * (x1 - x) <= 0) {
      ys.push(y0 + (y1 - y0) * ((x - x0) / (x1 - x0)))
    }
  }
  return ys.length >= 2 ? [Math.min(...ys), Math.max(...ys)] : null
}

/** A cross-section of the body at x, as a rounded rectangle standing in z/y. */
function ribPoints(x: number, lo: number, hi: number, half: number, r: number) {
  const loop = filletPath([[-half, lo], [half, lo], [half, hi], [-half, hi]], r, 4)
    .map(([z, y]) => new THREE.Vector3(x, y, z))
  loop.push(loop[0].clone())
  return loop
}

/**
 * A block with its corners taken off.
 *
 * Nothing under a bonnet is a cuboid. A plain BoxGeometry reads as a crate no
 * matter how it is lit, and six of them in a row was most of why this felt
 * boxy — so every internal part is extruded from a rounded outline instead.
 */
function roundedBox(w: number, h: number, d: number, r = 0.05) {
  const x = -w / 2
  const y = -h / 2
  const s = new THREE.Shape()
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d, bevelEnabled: true,
    bevelSize: r * 0.5, bevelThickness: r * 0.5, bevelSegments: 2, curveSegments: 5,
  })
  g.translate(0, 0, -d / 2)
  return g
}

/** A tyre: a cylinder with its shoulders rolled off, turned to face sideways. */
function tyreGeometry(radius: number, width: number) {
  const half = width / 2
  const shoulder = radius * 0.1
  const g = new THREE.LatheGeometry([
    new THREE.Vector2(radius * 0.42, -half),
    new THREE.Vector2(radius - shoulder, -half),
    new THREE.Vector2(radius, -half + shoulder),
    new THREE.Vector2(radius, half - shoulder),
    new THREE.Vector2(radius - shoulder, half),
    new THREE.Vector2(radius * 0.42, half),
  ], 28)
  g.rotateX(Math.PI / 2)
  return g
}

/**
 * A pane that spans the car: the windscreen, and the backlight.
 *
 * Stretched between two points of the side profile and bowed outward across
 * the middle, because a flat quad reads as cardboard — the crown is most of
 * what makes glass look like glass once it is only edges and a faint film. It
 * narrows toward the roof as well, since a screen with parallel sides reads
 * as a bus rather than a car.
 *
 * `top` says which end of the run is the roof end, so the same function
 * serves a windscreen leaning back and a backlight leaning forward without
 * either the taper or the outward bow coming out inverted.
 */
function spanningGlass(
  a: readonly [number, number],
  b: readonly [number, number],
  width: number,
  top: 0 | 1,
  crown = 0.05,
  inset = 0.9,
) {
  const g = new THREE.PlaneGeometry(1, 1, 14, 3)
  const pos = g.attributes.position
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  // The profile winds clockwise, so this is the outward face of that edge.
  const nx = -dy / len
  const ny = dx / len
  const half = (width / 2) * inset
  /* Pulled in at both ends. The shell's corners are rounded, so a pane
     stretched to the raw profile points would poke through the roof it is
     supposed to sit under. */
  const tuck = Math.min(0.16, 0.07 / len)
  for (let i = 0; i < pos.count; i += 1) {
    const u = pos.getX(i) + 0.5
    const t = tuck + (pos.getY(i) + 0.5) * (1 - tuck * 2)
    const taper = 1 - 0.07 * (top ? t : 1 - t)
    const bow = Math.cos((u - 0.5) * Math.PI) * crown
    pos.setXYZ(
      i,
      a[0] + dx * t + nx * bow,
      a[1] + dy * t + ny * bow,
      (u - 0.5) * 2 * half * taper,
    )
  }
  g.computeVertexNormals()
  return g
}

/**
 * A flat panel scribed on the flank — a door, or the glass above it.
 *
 * Drawn in profile coordinates and extruded barely any depth at all, so what
 * you see is its outline lying on the side of the body. That is the right
 * answer for a hologram: a door is a shut line and an aperture, not a slab.
 */
function sidePanel(points: Array<[number, number]>, z: number, thickness = 0.02) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)))
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
  g.translate(0, 0, z - thickness / 2)
  return g
}

/**
 * Glass, as a look rather than a colour.
 *
 * Marker colour is rewritten as the verdict changes, so a tint would not
 * survive; what survives is weight. Glazing sits back from the structure — a
 * thinner shell and a fainter line — which is enough to read as glass against
 * the panels around it, and leaves the severity palette free to mean only
 * safety.
 */
const GLASS = { face: 0.05, edge: 0.55 }

interface Look {
  face?: number
  edge?: number
  outlines?: Array<{ points: THREE.Vector3[]; weight?: number }>
}

function holoMaterials(colour: number, look: Look = {}) {
  const base = look.face ?? 0.075
  return {
    face: new THREE.ShaderMaterial({
      vertexShader: HOLO_VERT,
      fragmentShader: HOLO_FRAG,
      uniforms: {
        uColour: { value: new THREE.Color(colour) },
        uBase: { value: base },
        uRim: { value: base * 7 },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }),
    edge: new THREE.LineBasicMaterial({
      color: colour, transparent: true, opacity: look.edge ?? 0.85,
    }),
  }
}

/**
 * One part: a translucent shell plus its own lines.
 *
 * The lines are what make it a hologram. Surfaces alone read as smoked glass;
 * the wireframe over the top is what says "projection", and it is also what
 * lets crude geometry look intentional.
 */
function part(
  id: string,
  geometry: THREE.BufferGeometry,
  position: [number, number, number] | null,
  crease = 24,
  look: Look = {},
): THREE.Group {
  const m = holoMaterials(ACCENT, look)
  const group = new THREE.Group()
  const mesh = new THREE.Mesh(geometry, m.face)
  // The frame loop dims and brightens from these, so a part with a different
  // resting weight keeps it instead of being flattened back to the default.
  mesh.userData.base = look.face ?? 0.075
  group.add(mesh)

  if (look.outlines) {
    /* Drawn lines rather than derived ones.
       EdgesGeometry is the wrong tool once a body is smooth: there are no
       creases left to find, so it returns either nothing or — at a low
       threshold — every facet of every arc, which is how a rounded car ends
       up looking like a barrel made of staves. What a projection of a car
       actually shows is its silhouette and a few sections, so that is what
       gets drawn, from the very same outline the surface was built from. */
    for (const o of look.outlines) {
      const weight = (look.edge ?? 0.85) * (o.weight ?? 1)
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(o.points),
        holoMaterials(ACCENT, { edge: weight }).edge,
      )
      line.userData.base = weight
      group.add(line)
    }
  } else {
    /* `crease` is the angle below which an edge is NOT drawn. At a low
       threshold every facet of a cylinder gets its own line, so a wheel
       arrives as a barrel made of staves. Raised, only real creases and
       silhouettes survive — which is what a projection would show. */
    let outline = new THREE.EdgesGeometry(geometry, crease)
    /* A threshold this high can match NOTHING on a part made entirely of
       curves, and a 7%-opacity shell with no wireframe over it is invisible —
       which is exactly how the mirrors once disappeared. Rather than tune a
       number per part and hope, anything that comes back empty falls back to
       a threshold that cannot. */
    if (outline.attributes.position.count === 0) {
      outline = new THREE.EdgesGeometry(geometry, 12)
    }
    const edges = new THREE.LineSegments(outline, m.edge)
    edges.userData.base = look.edge ?? 0.85
    group.add(edges)
  }

  if (position) group.position.set(...position)
  group.userData.id = id
  return group
}

interface Built {
  car: THREE.Group
  parts: THREE.Group[]
}

/**
 * Give back a car's geometry and materials.
 *
 * Every part builds its own, which is the point: a shared material cannot be
 * tinted per part, and a reflection that dims when you dim the original is
 * not a reflection. The cost is that none of it is reference-counted, so
 * changing body type without this strands two entire vehicles on the GPU —
 * and body type is the one thing here somebody will switch back and forth.
 */
function free(node: THREE.Object3D) {
  node.traverse((o) => {
    const carrier = o as THREE.Mesh
    if (carrier.geometry) carrier.geometry.dispose()
    const mat = carrier.material
    if (Array.isArray(mat)) for (const m of mat) m.dispose()
    else if (mat) mat.dispose()
  })
}

function scrap(old: Built | null, parent: THREE.Group) {
  if (!old) return
  parent.remove(old.car)
  free(old.car)
}

/**
 * Colour and weight for one part and its reflection.
 *
 * Opacity is scaled from each object's own resting weight rather than set
 * from one constant, or glass would light up exactly as brightly as the shell
 * it sits inside, and the reflection would be as solid as the car.
 */
function tint(p: THREE.Object3D, colour: number, lit: boolean, mul: number) {
  p.traverse((o) => {
    const carrier = o as THREE.Mesh | THREE.Line
    const base = o.userData.base as number | undefined
    const mat = carrier.material as THREE.Material | undefined
    if (base === undefined || !mat) return
    const isLine = (o as THREE.Line).isLine === true
    const op = (isLine
      ? (lit ? Math.min(1, base * 1.2) : base)
      : (lit ? base * 2.1 : base)) * mul
    const shader = mat as THREE.ShaderMaterial
    if (shader.uniforms) {
      ;(shader.uniforms.uColour.value as THREE.Color).setHex(colour)
      shader.uniforms.uBase.value = op
      shader.uniforms.uRim.value = op * (lit ? 9.5 : 7)
    } else {
      ;(mat as THREE.LineBasicMaterial).color.setHex(colour)
      mat.opacity = op
    }
  })
}

function buildCar(spec: BodySpec): Built {
  const car = new THREE.Group()
  const parts: THREE.Group[] = []
  const add = (p: THREE.Group) => {
    car.add(p)
    parts.push(p)
    return p
  }

  /* ---- shell, from the profile, with every corner rounded first */
  const outline = filletPath(spec.profile, 0.15, 5)
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)))
  const shell = new THREE.ExtrudeGeometry(shape, {
    // Modest. The bevel used to be the only highlight along a panel edge;
    // with Fresnel doing that job it only has to stop the flanks meeting the
    // roof at a dead right angle.
    depth: spec.width, bevelEnabled: true,
    bevelSize: 0.045, bevelThickness: 0.05, bevelSegments: 2,
  })
  shell.translate(0, spec.ride, -spec.width / 2)

  const half = spec.width / 2 - 0.002
  const flank = (z: number) => {
    const loop = outline.map(([x, y]) => new THREE.Vector3(x, y + spec.ride, z))
    loop.push(loop[0].clone())
    return loop
  }
  const outlines: Array<{ points: THREE.Vector3[]; weight?: number }> = [
    { points: flank(half) },
    { points: flank(-half) },
  ]
  /* Three ribs — near each axle and at the cabin. A car drawn only in
     silhouette reads as a sticker; a few cross-sections are what say it has a
     width. Three, not thirty: the moment they become a mesh they stop being
     information and start being noise. */
  for (const rx of [-spec.wheelbase * 0.95, spec.cabinAt, spec.wheelbase * 0.95]) {
    const sec = sectionAt(spec.profile, rx)
    if (sec) {
      outlines.push({
        points: ribPoints(rx, sec[0] + spec.ride, sec[1] + spec.ride, half, 0.16),
        weight: 0.4,
      })
    }
  }
  add(part('cabin', shell, null, 26, { outlines }))

  /* ---- wheels, in pairs so brakes and tyres can be named separately */
  const wheelGeo = tyreGeometry(spec.wheel, 0.22)
  const discGeo = new THREE.CylinderGeometry(spec.wheel * 0.56, spec.wheel * 0.56, 0.05, 24)
  discGeo.rotateX(Math.PI / 2)

  for (const [axle, x] of [['front', -spec.wheelbase], ['rear', spec.wheelbase]] as const) {
    const tyres = new THREE.Group()
    const brakes = new THREE.Group()
    for (const z of [-spec.width / 2 - 0.02, spec.width / 2 + 0.02]) {
      // 44° so only the tyre's silhouette and its two shoulders draw. Lower
      // and a lathe of 28 segments becomes a barrel of staves.
      tyres.add(part(`${axle}-tyres`, wheelGeo, [x, spec.wheel + spec.ride, z], 44))
      brakes.add(part(`${axle}-brakes`, discGeo, [x, spec.wheel + spec.ride, z * 0.88], 44))
    }
    tyres.userData.id = `${axle}-tyres`
    brakes.userData.id = `${axle}-brakes`
    add(tyres)
    add(brakes)
  }

  /* ---- engine and battery, sitting where the bonnet is */
  const [ex, ey, ew] = spec.engine
  add(part('engine', roundedBox(0.74, 0.46, ew, 0.07), [ex, ey, 0], 28))
  add(part('battery', roundedBox(0.3, 0.22, 0.34, 0.035), [ex + 0.54, ey + 0.14, -0.42], 28))

  /* ---- the greenhouse
     Where the beltline is, and where the roof is above any point along it.
     Both come out of the profile rather than being typed in per body, which
     is what stops the glazing drifting out of register with the shell. */
  const [screenX, screenY] = spec.profile[spec.screen[0]]
  const [pillarX] = spec.profile[spec.screen[1]]
  const belt = screenY
  const sillY = Math.min(...spec.profile.map((pt) => pt[1]))
  const roofRun = spec.profile.slice(spec.screen[1], spec.rear[1] + 1)
  const roofYAt = (x: number) => {
    const cx = Math.max(roofRun[0][0], Math.min(roofRun[roofRun.length - 1][0], x))
    for (let i = 1; i < roofRun.length; i += 1) {
      const [x0, y0] = roofRun[i - 1]
      const [x1, y1] = roofRun[i]
      if (cx <= x1 || i === roofRun.length - 1) {
        return y0 + (y1 - y0) * ((cx - x0) / ((x1 - x0) || 1))
      }
    }
    return roofRun[0][1]
  }
  // Everything below is built in profile coordinates, which sit `ride` lower
  // than the shell does, so each part is lifted by exactly that.
  const onBody: [number, number, number] = [0, spec.ride, 0]

  /* ---- mirrors
     A pod on a stalk with a flat glass face. The face matters: a part made
     only of curves can have no crease steep enough for EdgesGeometry to find,
     and a 7%-opacity shell with no wireframe is invisible. The height hangs
     off the beltline, which every body has by construction. */
  const mirrors = new THREE.Group()
  const mirrorX = screenX + 0.42
  const mirrorY = belt + spec.ride - 0.04
  const podGeo = new THREE.SphereGeometry(0.105, 10, 7)
  podGeo.scale(1.15, 0.8, 0.58)
  const capGeo = roundedBox(0.17, 0.115, 0.024, 0.03)
  capGeo.rotateY(Math.PI / 2)
  const armGeo = new THREE.CylinderGeometry(0.022, 0.03, 0.14, 8)
  armGeo.rotateX(Math.PI / 2)
  for (const side of [-1, 1]) {
    const z = side * (spec.width / 2 + 0.17)
    mirrors.add(part('mirrors', podGeo, [mirrorX, mirrorY, z], 24))
    mirrors.add(part('mirrors', capGeo, [mirrorX + 0.1, mirrorY, z], 24, GLASS))
    mirrors.add(part('mirrors', armGeo,
      [mirrorX - 0.04, mirrorY - 0.02, side * (spec.width / 2 + 0.06)], 24))
  }
  mirrors.userData.id = 'mirrors'
  add(mirrors)

  /* ---- windscreen and backlight, each spanning the car */
  add(part('windscreen',
    spanningGlass(spec.profile[spec.screen[0]], spec.profile[spec.screen[1]], spec.width, 1),
    onBody, 30, GLASS))
  add(part('rear-glass',
    spanningGlass(spec.profile[spec.rear[0]], spec.profile[spec.rear[1]], spec.width, 0),
    onBody, 30, GLASS))

  /* ---- doors, and the glass above them
     Two per side, split at the B-pillar. The metal runs forward past the
     A-pillar — as it does on a real car — but the glass cannot, so the
     aperture starts at the pillar and its top edge follows the roofline
     instead of being level. That last detail is why each body reads as
     itself: the shape of the daylight opening says more about which car this
     is than the bonnet does. */
  const [doorFront, doorSplit, doorRear] = spec.doors
  const doorLo = sillY + 0.09
  const doorZ = spec.width / 2 + 0.085
  const glassZ = spec.width / 2 + 0.055
  const glassTop = (x: number) => Math.max(belt + 0.1, roofYAt(x) - 0.06)

  const doors = new THREE.Group()
  const doorGlass = new THREE.Group()
  const handleGeo = roundedBox(0.16, 0.045, 0.035, 0.018)

  for (const side of [-1, 1]) {
    for (const [x0, x1] of [[doorFront, doorSplit - 0.02], [doorSplit + 0.02, doorRear]]) {
      doors.add(part('doors', sidePanel(
        [[x0, doorLo], [x1, doorLo], [x1, belt], [x0, belt]], side * doorZ,
      ), onBody, 30))
      doors.add(part('doors', handleGeo,
        [x1 - 0.2, belt + spec.ride - 0.115, side * (doorZ + 0.03)], 28))

      // The aperture: never forward of the A-pillar, and capped under the roof.
      const gx0 = Math.max(x0 + 0.045, pillarX + 0.03)
      const gx1 = x1 - 0.045
      if (gx1 - gx0 < 0.08) continue
      const shape2: Array<[number, number]> = [[gx0, belt + 0.035], [gx1, belt + 0.035]]
      for (let i = 6; i >= 0; i -= 1) {
        const x = gx0 + (gx1 - gx0) * (i / 6)
        shape2.push([x, glassTop(x)])
      }
      doorGlass.add(part('door-glass', sidePanel(shape2, side * glassZ), onBody, 30, GLASS))
    }
  }
  doors.userData.id = 'doors'
  doorGlass.userData.id = 'door-glass'
  add(doors)
  add(doorGlass)

  /* ---- lights, wrapped round the corner of the nose rather than stuck on */
  const lights = new THREE.Group()
  const lampGeo = new THREE.SphereGeometry(0.11, 14, 10)
  lampGeo.scale(0.55, 0.62, 1.45)
  const nose = spec.profile[0][0]
  for (const z of [-spec.width * 0.32, spec.width * 0.32]) {
    lights.add(part('lights', lampGeo, [nose + 0.14, spec.profile[1][1] + spec.ride - 0.06, z], 40))
  }
  lights.userData.id = 'lights'
  add(lights)

  /* ---- exhaust
     A real tailpipe runs along the car and pokes out under the bumper, so the
     geometry is turned onto the X axis — and turned BEFORE `part()` builds
     its lines from it. Rotating afterwards leaves the wireframe describing
     the upright shape while the surface describes the lying-down one, and the
     wireframe is what you see. */
  const tail = spec.profile.find((p) => p[0] > 2) ?? [2.2, 0.5]
  const pipeGeo = new THREE.CylinderGeometry(0.048, 0.055, 0.46, 16)
  pipeGeo.rotateZ(Math.PI / 2)
  const tipGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.1, 16)
  tipGeo.rotateZ(Math.PI / 2)
  const exhaust = new THREE.Group()
  const pipeY = spec.ride + 0.1
  const pipeZ = spec.width * 0.26
  exhaust.add(part('exhaust', pipeGeo, [tail[0] - 0.28, pipeY, pipeZ], 44))
  exhaust.add(part('exhaust', tipGeo, [tail[0] + 0.02, pipeY, pipeZ], 44))
  exhaust.userData.id = 'exhaust'
  add(exhaust)

  return { car, parts }
}

/* ---------------------------------------------------------- the marker */

/**
 * Two sprite textures, drawn once and shared.
 *
 * Sprites rather than meshes because a fault marker has to stay the same size
 * and face you however the car is turned — it is a label, not an object, and
 * a dot that shrinks as the car turns away is a dot you stop trusting.
 */
function spriteTexture(draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  if (ctx) draw(ctx)
  return new THREE.CanvasTexture(c)
}

function makeTextures() {
  const spot = spriteTexture((g) => {
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    rg.addColorStop(0, 'rgba(255,255,255,1)')
    rg.addColorStop(0.16, 'rgba(255,255,255,0.98)')
    rg.addColorStop(0.3, 'rgba(255,255,255,0.34)')
    rg.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = rg
    g.fillRect(0, 0, 64, 64)
  })
  const halo = spriteTexture((g) => {
    g.strokeStyle = 'rgba(255,255,255,1)'
    g.lineWidth = 3.5
    g.beginPath()
    g.arc(32, 32, 25, 0, Math.PI * 2)
    g.stroke()
  })
  return { spot, halo }
}

/* ------------------------------------------------------------- the scene */

export function createHologram(
  canvas: HTMLCanvasElement,
  initial: HologramOptions,
): Hologram | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    // No WebGL. The caller keeps its own drawing on screen.
    return null
  }

  const opts: HologramOptions = { ...initial }
  const tex = makeTextures()
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))

  const scene = new THREE.Scene()
  /* No fog. It existed to fade the far grid into a horizon, and with the
     grid gone the only thing left for it to eat is the far side of the car
     itself — which is the half a Fresnel shell is supposed to show you. */

  /* Aimed at the middle of the car rather than just above its sill. It used
     to sit low to keep a reflection in frame; with nothing under the car,
     the only thing worth centring on is the car. */
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  const eye = new THREE.Vector3(4.6, 1.75, 6.9).normalize()
  const aim = new THREE.Vector3()

  /**
   * Everything the beat changes, as a target the loop eases toward.
   *
   * Nothing here is set directly. A beat writes `want` and the frame loop
   * walks `live` to it, which is what makes changing beat a move rather than
   * a cut — and it means a beat can change mid-move without anything
   * snapping, because the only thing that ever happened was the destination.
   */
  const live = { dist: 7.6, aimX: 0, aimY: 0, lift: 0, others: 1, spinRate: 1 }
  const want = { ...live }

  /**
   * How the car gets out of his way.
   *
   * By the camera's aim moving across rather than the car being pushed, which
   * reads as the view panning off it rather than as a sticker sliding
   * sideways — and leaves the car turning on its own axis the whole time.
   */
  const BEATS: Record<Beat, Omit<typeof live, never>> = {
    rest: { dist: 7.6, aimX: 0, aimY: 0, lift: 0, others: 1, spinRate: 1 },
    centre: { dist: 8.4, aimX: 2.3, aimY: 0.1, lift: 0, others: 0.28, spinRate: 0.5 },
    lift: { dist: 8.2, aimX: 2.8, aimY: 0.1, lift: 1, others: 0.09, spinRate: 0.26 },
  }

  /**
   * Nothing underneath it.
   *
   * There were five layers here — two grids, a dot field, a pool of light and
   * a whole second car flipped upside down as a reflection — on the argument
   * that a car standing on nothing reads as a model. The answer to that is
   * the one the avatar already uses: it does not stand anywhere. It hangs,
   * and a soft glow behind it in CSS does what a floor was doing, for
   * nothing.
   *
   * What went with the floor: the fog that faded its far edge, the hard
   * horizontal line where the grid plane stopped (the "box" round the car),
   * and half the geometry in the scene, because the reflection was a second
   * complete vehicle built, tinted and drawn every frame.
   */
  const holder = new THREE.Group()
  scene.add(holder)

  /* Where a part goes once he has taken it out. Outside the rotating holder
     on purpose: he is holding it still, not letting the car turn it. */
  const stage = new THREE.Group()
  scene.add(stage)

  const marker = new THREE.Group()
  const pip = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex.spot, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }))
  pip.scale.setScalar(0.46)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex.halo, transparent: true, depthTest: false, depthWrite: false,
  }))
  marker.add(pip, halo)
  marker.visible = false
  holder.add(marker)

  let built: Built | null = null
  const bounds = new THREE.Box3()
  const centre = new THREE.Vector3()

  function build() {
    scrap(built, holder)
    built = buildCar(BODIES[opts.body])
    holder.add(built.car)

    /* Hung on its own middle rather than sat on a floor.
       The profile is drawn from the sill upward, so a car left at its own
       origin is weighted below centre — which was invisible while there was
       ground under it and obvious the moment there is not. Centring it on
       its bounds is what makes it float rather than sag. */
    bounds.setFromObject(built.car)
    bounds.getCenter(centre)
    built.car.position.set(-centre.x, -centre.y, -centre.z)

    placeMarker()
  }

  const markerAt = new THREE.Vector3()
  let markerLive = false

  function placeMarker() {
    markerLive = false
    marker.visible = false
    if (!built || !opts.focus) return
    const hit = built.parts.find((p) => p.userData.id === opts.focus)
    if (!hit) return
    bounds.setFromObject(hit)
    bounds.getCenter(markerAt)
    /* Box3.setFromObject already returns world coordinates, and the holder is
       the only thing between the part and the world — so convert back into
       the holder's space rather than multiplying by its matrix a second time.
       The update first is not optional: `setFromObject` refreshes the PART's
       world matrix and not its parents', so on the first build the holder's
       is still the identity and the marker lands a whole rotation away. */
    holder.updateWorldMatrix(true, false)
    marker.position.copy(holder.worldToLocal(markerAt.clone()))
    const tone = new THREE.Color(opts.tone)
    ;(pip.material as THREE.SpriteMaterial).color = tone
    ;(halo.material as THREE.SpriteMaterial).color = tone
    marker.visible = true
    markerLive = true
  }

  /* ------------------------------------------------- taking a part out
     How far in front of the camera he holds it, and where on screen its
     centre sits — 0 to 1, across and down. Both the size and the position
     are fractions of the VIEW rather than world measurements, which is what
     stops a brake disc (physically wide) arriving across the whole screen
     while an engine arrives small. Every part is brought to the same share
     of what the camera can see. */
  const HOLD_DIST = 3.4
  const HOLD_RADIUS_FRAC = 0.27
  const HOLD_FX = 0.5
  const HOLD_FY = 0.42
  /** A slight lean, so a flat part still reads as an object, not a decal. */
  const HOLD_TILT = 0.17

  let held: THREE.Object3D | null = null
  let heldHome: { parent: THREE.Object3D; position: THREE.Vector3 } | null = null
  let heldScale = 1
  let turnNow = 0
  let turnWant = 0
  const heldFrom = new THREE.Vector3()
  const holdAt = new THREE.Vector3()
  const camFwd = new THREE.Vector3()
  const camUp = new THREE.Vector3()
  const camRight = new THREE.Vector3()
  const measure = new THREE.Box3()
  const ball = new THREE.Sphere()

  /** Half the world-height the camera sees where he holds things. */
  function viewHalfHeight() {
    return Math.tan((camera.fov * Math.PI) / 360) * HOLD_DIST
  }

  /**
   * The thing actually taken out of the car.
   *
   * Parts that come in pairs are a group of two, and lifting the pair puts
   * the whole width of the car in his hands — so a wheel arrives the size of
   * a coin. He takes ONE, which is also what he says: "the disc off your
   * front left", not "your front brakes, both of them".
   */
  function liftable(id: CarPart): THREE.Object3D | null {
    if (!built) return null
    const group = built.parts.find((p) => p.userData.id === id)
    if (!group) return null
    const first = group.children[0]
    if (first && first.userData && first.userData.id === id) return first
    return group
  }

  function takeOut(id: CarPart) {
    const p = liftable(id)
    if (!p || held === p) return
    putBack()

    measure.setFromObject(p)
    measure.getBoundingSphere(ball)
    heldScale = (viewHalfHeight() * HOLD_RADIUS_FRAC) / Math.max(0.06, ball.radius)

    held = p
    heldHome = { parent: p.parent as THREE.Object3D, position: p.position.clone() }
    // Its world position while it is still IN the car, so the journey out
    // starts from where it actually was rather than from nowhere.
    p.getWorldPosition(heldFrom)
    stage.add(p)
    p.position.copy(heldFrom)
    turnNow = 0
    turnWant = 0
  }

  function putBack() {
    if (!held || !heldHome) return
    heldHome.parent.add(held)
    held.position.copy(heldHome.position)
    held.rotation.set(0, 0, 0)
    held.scale.setScalar(1)
    held = null
    heldHome = null
  }

  /** Put the beat's targets in place, and take out or put back accordingly. */
  function applyBeat() {
    Object.assign(want, BEATS[opts.beat])
    if (opts.beat === 'lift' && opts.focus) takeOut(opts.focus)
    else putBack()
    // The pip marks a fault on a whole car. Once he is holding the part
    // itself there is nothing left to point at.
    marker.visible = markerLive && opts.beat !== 'lift'
  }

  build()
  applyBeat()

  /* ---- drag to turn */
  const spin = { x: 0.14, y: 0.62 }
  let drag: { x: number; y: number; sx: number; sy: number } | null = null

  const onDown = (e: PointerEvent) => {
    if (!opts.interactive) return
    drag = { x: e.clientX, y: e.clientY, sx: spin.x, sy: spin.y }
    canvas.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    if (!drag) return
    spin.y = drag.sy + (e.clientX - drag.x) * 0.008
    spin.x = Math.max(-0.32, Math.min(0.85, drag.sx + (e.clientY - drag.y) * 0.006))
  }
  const onUp = () => { drag = null }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)

  /* ---- the loop */
  let frame = 0
  let last = performance.now()

  function tick(now: number) {
    frame = requestAnimationFrame(tick)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    const w = canvas.clientWidth || 480
    const h = canvas.clientHeight || 320
    const pr = renderer.getPixelRatio()
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }

    /* Walk to the beat's targets. Framerate-independent, so the move takes
       the same time on a slow device as on a fast one. */
    const k = opts.reduceMotion ? 1 : 1 - Math.pow(0.0015, dt)
    live.dist = ease(live.dist, want.dist, k)
    live.aimX = ease(live.aimX, want.aimX, k)
    live.aimY = ease(live.aimY, want.aimY, k)
    live.lift = ease(live.lift, want.lift, k)
    live.others = ease(live.others, want.others, k)
    live.spinRate = ease(live.spinRate, want.spinRate, k)

    aim.set(live.aimX, live.aimY, 0)
    camera.position.copy(aim).addScaledVector(eye, live.dist)
    camera.lookAt(aim)
    camera.updateMatrixWorld()

    if (!opts.reduceMotion && !drag) spin.y += dt * 0.2 * live.spinRate
    holder.rotation.set(spin.x, spin.y, 0)

    const heldTone = new THREE.Color(opts.tone).getHex()

    if (built) {
      for (const p of built.parts) {
        const lit = markerLive && opts.beat === 'rest' && p.userData.id === opts.focus
        const colour = lit ? ACCENT_HI : ACCENT
        // Everything that is not the subject falls back as he starts talking.
        tint(p, colour, lit, Math.max(0.02, live.others))
      }
    }

    /* ---- the part he is holding.
       Detached, so the car's rotation cannot reach it. It faces the camera
       and STAYS facing it: the only thing that ever changes is `turnWant`,
       and only he changes that. */
    if (held) {
      camera.getWorldDirection(camFwd)
      // The camera's own axes, not the world's: it is tilted down at the car,
      // so moving the part along world Y or X would also push it away.
      camUp.set(0, 1, 0).applyQuaternion(camera.quaternion)
      camRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
      const halfH = viewHalfHeight()
      holdAt
        .copy(camera.position)
        .addScaledVector(camFwd, HOLD_DIST)
        .addScaledVector(camUp, (0.5 - HOLD_FY) * 2 * halfH)
        .addScaledVector(camRight, (HOLD_FX - 0.5) * 2 * halfH * camera.aspect)

      const e = easeOut(Math.min(1, live.lift))
      held.position.lerpVectors(heldFrom, holdAt, e)
      held.scale.setScalar(1 + (heldScale - 1) * e)

      turnNow = ease(turnNow, turnWant, opts.reduceMotion ? 1 : 1 - Math.pow(0.004, dt))
      const camYaw = Math.atan2(camera.position.x - aim.x, camera.position.z - aim.z)
      held.rotation.set(HOLD_TILT, camYaw + turnNow, 0)

      // It is out of `built.parts` now, so it takes its colour on its own —
      // at full strength, because it is the only thing left to look at.
      tint(held, heldTone, true, 1)
    }

    /* The marker breathes. A static dot on a body reads as a blemish in the
       model; one that pulses reads as an instrument saying look here. */
    if (marker.visible) {
      const pulse = opts.reduceMotion ? 0.35 : 0.5 + 0.5 * Math.sin(now * 0.0035)
      halo.scale.setScalar(0.52 + pulse * 0.5)
      ;(halo.material as THREE.SpriteMaterial).opacity = 0.75 * (1 - pulse) + 0.14
    }

    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(tick)

  return {
    update(next) {
      const was = { body: opts.body, focus: opts.focus, beat: opts.beat }
      Object.assign(opts, next)
      if (opts.body !== was.body) {
        // A new car has new parts, so whatever he was holding no longer
        // exists. Put it back before the old one is scrapped under it.
        putBack()
        build()
      } else if (opts.focus !== was.focus) {
        placeMarker()
      }
      if (opts.beat !== was.beat || opts.focus !== was.focus) applyBeat()
    },
    turn() {
      if (held) turnWant += Math.PI
    },
    dispose() {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      free(scene)
      for (const t of Object.values(tex)) t.dispose()
      renderer.dispose()
    },
  }
}

/** Every hologram part a fault can currently be pinned to. */
export function bodyFor(body: string | undefined): HologramBody {
  // `hatch` is a real body type in Discover and is not worth a fourth
  // profile: on a diagram at this size it is a short saloon.
  if (body === 'suv') return 'suv'
  if (body === 'van') return 'van'
  return 'saloon'
}
