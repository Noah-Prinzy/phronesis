import * as THREE from 'three'
import { ORB_BLEND_MS, specAt } from './orbSpec'
import type { OrbSpec, OrbState } from './orbSpec'

/**
 * Phronesis, built rather than recorded.
 *
 * Three layers, and the order of them is the whole design:
 *
 *   1 · SOUL      an ember. A hard white core inside three widening haloes,
 *                 drifting slowly, breathing, and — this is the rule the rest
 *                 hangs on — THE ONLY LIGHT IN THE SCENE.
 *   2 · SKELETON  twelve bones on a Fibonacci sphere, each on its own clock.
 *                 They do not draw anything. They deform the skin, and every
 *                 state is expressed here and nowhere else.
 *   3 · SKIN      a veil. Barely a surface: you read the body from where the
 *                 light stops rather than from a lit shell.
 *
 * **Why layers.** The skin has no state logic at all — it only knows how to
 * follow bones. So the four states are one table of numbers about how the
 * bones move, and the material can be replaced entirely without touching any
 * behaviour.
 *
 * This replaces `avatar-loop.webm`, which was cut from a screen recording of
 * unknown provenance and was never cleared for release. It is also 1.5MB
 * smaller and sharp at any size, but the licence was the reason.
 */

/** Bones. Twelve was chosen by eye: fewer reads as lobes, more as noise. */
const NODES = 12

/**
 * How tightly each bone's pull is confined to its own direction.
 *
 * The single most important constant here. A low exponent blends every bone
 * into one smooth ball — six rigs tried at 2.4 were indistinguishable from one
 * another — and a high one keeps each bulge separate and legible. 6.5 is the
 * "boil": a surface that visibly roils rather than swelling.
 */
const SHARP = 6.5

/**
 * How deep the boil goes, as a fraction of what the bones would otherwise do.
 *
 * Tuned by eye against the live control: at 1.0 the lumps are pronounced
 * enough to read as agitation even at rest, which fights the one thing the
 * idle state is supposed to be. Half that keeps the roil legible — you can
 * still see it is boiling rather than breathing — without the body ever
 * looking troubled.
 *
 * It scales the lumps and nothing else. Speed, sharpness, the ember and the
 * veil are all independent of it.
 */
const BOIL_DEPTH = 0.5

/**
 * How much the live microphone moves him, 0–1.
 *
 * A fifth. At full reactivity every syllable visibly deformed the body, which
 * reads as a meter responding to input rather than a person reacting to you —
 * and it made a loud room look like agitation. At 0.2 the voice is present in
 * the movement without being the thing driving it.
 */
const VOICE_REACH = 0.2

/**
 * A slow breath with a fast tremor riding on it. A candle, not a strobe.
 *
 * Three periods that do not divide into one another, so the ember never
 * settles into a visible pulse — pure noise reads as a broken bulb and a
 * single sine reads as a machine.
 */
const flicker = (t: number) =>
  1 + Math.sin(t * 0.9) * 0.11 + Math.sin(t * 3.7 + 2.1) * 0.045 + Math.sin(t * 11.3 + 4.7) * 0.018

/** Bone directions, evenly spread with no clumping and no axis. */
const BONES = Array.from({ length: NODES }, (_, i) => {
  const y = 1 - (i / (NODES - 1)) * 2
  const r = Math.sqrt(Math.max(0.02, 1 - y * y))
  const a = i * 2.399963 // the golden angle
  return {
    dir: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).normalize(),
    // Irrational spacing, so no two bones ever come back into step.
    phase: i * 2.399963 * 3.1,
  }
})

/**
 * A soft dot. `hardness` pulls the falloff toward the middle — the core is
 * nearly a point, the outer haloes almost all falloff.
 *
 * The stack of four is what makes the ember read as a light SOURCE rather
 * than as fog. One soft sprite always looks like mist however bright it is;
 * a hard core inside a wide bloom is what a real light does to a lens.
 */
function dotTexture(hardness: number): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(hardness * 0.5, `rgba(255,255,255,${0.55 * (1 - hardness) + 0.2})`)
    grad.addColorStop(hardness, 'rgba(255,255,255,0.16)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, S, S)
  }
  return new THREE.CanvasTexture(c)
}

const SHELLS = [
  { h: 0.1, s: 0.28, c: 0xffffff, o: 1.0 },
  { h: 0.3, s: 0.72, c: 0xa9dcff, o: 0.5 },
  { h: 0.55, s: 1.55, c: 0x6fb4ee, o: 0.2 },
  { h: 0.8, s: 3.3, c: 0x3f8fd8, o: 0.09 },
] as const

/**
 * The bones deform the surface, and the normal is rebuilt from it.
 *
 * That second half is not optional. Displacing geometry while still shading it
 * as a sphere is what makes a moving blob read as a flat picture of a blob —
 * the shape moves and the light does not. Each vertex samples the deformed
 * surface at two neighbours a small step away and crosses the tangents.
 */
const VERTEX = /* glsl */ `
  uniform vec3 uNodes[${NODES}];
  uniform float uSharp;
  varying vec3 vN;
  varying vec3 vP;

  float pull(vec3 d, vec3 node){
    float m = length(node);
    if (m < 0.0001) return 0.0;
    float a = max(dot(d, node / m), 0.0);
    return pow(a, uSharp) * (m - 1.0);
  }

  vec3 surface(vec3 d){
    float r = 1.0;
    for (int i = 0; i < ${NODES}; i++) r += pull(d, uNodes[i]);
    return d * max(r, 0.35);
  }

  void main(){
    vec3 d = normalize(position);
    vec3 p = surface(d);
    vec3 up = abs(d.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 t1 = normalize(cross(up, d));
    vec3 t2 = cross(d, t1);
    float e = 0.035;
    vec3 pa = surface(normalize(d + t1 * e));
    vec3 pb = surface(normalize(d + t2 * e));
    vN = normalize(normalMatrix * normalize(cross(pa - p, pb - p)));
    vP = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

/**
 * The veil.
 *
 * Two terms and nothing else. `thru` is light reaching the camera from the
 * ember through the far side of the surface; `fres` is the grazing edge. There
 * is no diffuse shading at all, which is the point — the body is defined by
 * where the light stops rather than by a lit shell, so it never acquires the
 * hard silhouette that made every earlier attempt look cut out of card.
 *
 * Drawn double-sided so the back of the veil is visible through the front.
 */
const FRAGMENT = /* glsl */ `
  uniform vec3 uSoul;
  uniform float uHeat;
  varying vec3 vN;
  varying vec3 vP;

  const vec3 ACCENT = vec3(0.435, 0.706, 0.933);
  const vec3 ACCENT_HI = vec3(0.663, 0.863, 1.0);

  void main(){
    vec3 N = normalize(vN);
    vec3 L = normalize(uSoul - vP);
    float thru = pow(max(dot(-N, L), 0.0), 1.1);
    float fres = pow(1.0 - abs(dot(N, vec3(0.0, 0.0, 1.0))), 3.2);
    vec3 col = ACCENT * thru * 0.30 + ACCENT_HI * fres * 0.85;
    gl_FragColor = vec4(col * uHeat, fres * 0.55 + thru * 0.10);
  }
`

export interface OrbScene {
  /** Advance and draw. `level` is the live audio, 0–1. */
  frame(nowMs: number, state: OrbState, level: number): void
  resize(width: number, height: number): void
  dispose(): void
}

/**
 * Build the orb into a canvas. Returns null when WebGL is unavailable, so the
 * caller can fall back rather than crash — a browser without WebGL should get
 * a plain glow, not a blank hole where the avatar was.
 */
export function createOrbScene(canvas: HTMLCanvasElement): OrbScene | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    return null
  }

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100)
  camera.position.set(0, 0, 8.4)
  camera.lookAt(0, 0, 0)

  /* ------------------------------------------------------ 3 · the skin */

  const uniforms = {
    uNodes: { value: Array.from({ length: NODES }, () => new THREE.Vector3()) },
    uSharp: { value: SHARP },
    uSoul: { value: new THREE.Vector3() },
    uHeat: { value: 1 },
  }

  const skin = new THREE.Mesh(
    // Subdivided well past where facets show. Visible polygon edges on a curve
    // were half of what read as "blocky" in earlier passes.
    new THREE.SphereGeometry(1, 168, 84),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    }),
  )
  scene.add(skin)

  /* ------------------------------------------------------ 1 · the soul */

  const ember = new THREE.Group()
  const shells: THREE.Sprite[] = []
  for (const s of SHELLS) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dotTexture(s.h),
        color: s.c,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
        opacity: s.o,
      }),
    )
    sprite.scale.setScalar(s.s)
    ember.add(sprite)
    shells.push(sprite)
  }
  scene.add(ember)

  /* ------------------------------------------------------ shared state */

  const live = Array.from({ length: NODES }, () => new THREE.Vector3())
  const soul = new THREE.Vector3()
  const up = new THREE.Vector3()
  const t1 = new THREE.Vector3()
  const t2 = new THREE.Vector3()

  let clock = Math.random() * 50
  let lastMs = 0
  let from: OrbState = 'idle'
  let to: OrbState = 'idle'
  let changedAt = -Infinity
  let spin = 0

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function step(spec: OrbSpec, dt: number, level: number) {
    const lvl = level * spec.react * VOICE_REACH

    /* The boil, under the state table. Idle simmers around 0.4 and thinking
       rolls around 3.3 — an eightfold range, which is what lets one rig be
       both "at peace" and "working hard" rather than needing two. */
    if (!reduced) clock += dt * (0.1 + Math.pow(spec.sweep, 1.8) * 0.85)

    const heat = 0.55 + spec.peak * 0.85 + lvl * 1.1

    // 1 · the soul drifts, breathes, and lights everything.
    const sr = 0.07 + spec.band * 0.16
    soul.set(
      Math.sin(clock * 0.31) * sr,
      Math.sin(clock * 0.23 + 2.1) * sr,
      Math.sin(clock * 0.19 + 4.7) * sr,
    )
    ember.position.copy(soul)
    const f = flicker(clock) * heat
    shells.forEach((sprite, i) => {
      const base = SHELLS[i]
      sprite.scale.setScalar(base.s * (1 + lvl * 0.25) * (0.9 + f * 0.16))
      const mat = sprite.material as THREE.SpriteMaterial
      mat.opacity = Math.min(1, base.o * f * (0.75 + spec.glow * 0.5))
    })

    // 2 · the bones. Every state is these three numbers.
    const reach = 1.28 * spec.scale * (1 + (spec.lift - 1) * 0.6)
    const amp = (0.1 + spec.band * 0.62 + lvl * 0.16) * BOIL_DEPTH

    BONES.forEach((bone, i) => {
      const t = clock + bone.phase
      const out = reach * (1 + Math.sin(t) * amp)
      up.set(0, 1, 0)
      if (Math.abs(bone.dir.y) > 0.92) up.set(1, 0, 0)
      t1.crossVectors(up, bone.dir).normalize()
      t2.crossVectors(bone.dir, t1)
      // A little lateral drift as well as radial, or the body pumps in and
      // out instead of squirming.
      live[i]
        .copy(bone.dir)
        .addScaledVector(t1, Math.sin(t * 0.63) * amp * 0.5)
        .addScaledVector(t2, Math.cos(t * 0.47) * amp * 0.5)
        .normalize()
        .multiplyScalar(out)
      uniforms.uNodes.value[i].copy(live[i])
    })

    // 3 · the skin follows, and knows nothing about state.
    uniforms.uSoul.value.copy(soul)
    uniforms.uHeat.value = 0.72 + spec.peak * 0.5 + lvl * 0.55

    if (!reduced) spin += dt * 0.05
    scene.rotation.set(0.08, spin, 0)
  }

  return {
    frame(nowMs, state, level) {
      const dt = lastMs ? Math.min(0.05, (nowMs - lastMs) / 1000) : 0
      lastMs = nowMs

      if (state !== to) {
        from = to
        to = state
        changedAt = nowMs
      }
      const elapsed = changedAt === -Infinity ? ORB_BLEND_MS : nowMs - changedAt
      step(specAt(from, to, elapsed), dt, level)

      renderer.render(scene, camera)
    },

    resize(width, height) {
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
    },

    dispose() {
      skin.geometry.dispose()
      ;(skin.material as THREE.Material).dispose()
      for (const sprite of shells) {
        const mat = sprite.material as THREE.SpriteMaterial
        mat.map?.dispose()
        mat.dispose()
      }
      renderer.dispose()
    },
  }
}
