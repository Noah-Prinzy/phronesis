// frontend/src/components/AvatarElement/avatarShader.ts
//
// GLSL for the avatar's point cloud.
//
// The look this targets: a VOLUMETRIC cloud of small, sharp, star-like
// points — dense and blown-out at the core, thinning to isolated specks at
// the rim — rather than a hollow shell of evenly-spread soft dots. Two
// things produce that read:
//
//   1. Distribution. Points fill the ball with a bias toward the centre
//      (see createAvatarGeometry), so the core is crowded and the rim is
//      sparse.
//   2. Additive blending. Overlapping points sum past white at the core
//      without any post-processing pass, which is what gives the bloom-ish
//      hot centre for free. On a light page additive would wash out into
//      the background, so the material switches to normal blending and dark
//      points there instead (see BLEND_MODE_BY_THEME in AvatarField.tsx).

import * as THREE from 'three';

export type AvatarTheme = 'light' | 'dark';

/**
 * The canvas height the point sizes in avatarStates.ts are authored against.
 * Rendering at any other size scales them proportionally, so a value tuned
 * in the lab looks the same in a 320px hero and a 48px docked corner.
 */
export const REFERENCE_HEIGHT_PX = 320;

/**
 * Point colours per page theme.
 *
 * `base` is the bulk of the cloud, `core` is what the brightest centre of
 * each point trends toward. On dark the cloud is essentially white with a
 * cool cast; on light it inverts to navy so it stays visible on white.
 */
export const AVATAR_THEME_COLORS: Record<AvatarTheme, { base: THREE.Color; core: THREE.Color }> = {
  dark: {
    base: new THREE.Color('#cfe0ff'),
    core: new THREE.Color('#ffffff'),
  },
  light: {
    base: new THREE.Color('#1e3a8a'),
    core: new THREE.Color('#0b1220'),
  },
};

// Classic 3D simplex noise — Ian McEwan / Ashima Arts (MIT licence).
// Drives the turbulent drift that keeps the cloud alive.
const snoiseGlsl = /* glsl */ `
  vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

export const avatarVertexShader = /* glsl */ `
  attribute float aSeed;    // stable per-point random, 0..1
  attribute float aRadius;  // this point's normalised distance from the core, 0..1

  uniform float uTime;
  uniform float uExpansion;
  uniform float uTurbulence;
  uniform float uChurn;
  uniform float uPulse;
  uniform float uPulseSpeed;
  uniform float uTwinkle;
  uniform float uPointSize;
  uniform float uMic;          // live mic amplitude, 0..1
  uniform float uMicResponse;  // how much this state cares about the mic
  uniform float uPixelRatio;
  uniform float uSizeScale;    // canvas height / REFERENCE_HEIGHT_PX

  varying float vBright;
  varying float vRadius;

  ${snoiseGlsl}

  void main() {
    vec3 p = position;

    // --- turbulent drift -------------------------------------------------
    // One noise field, sampled three times at offsets, so each point wanders
    // coherently with its neighbours instead of jittering independently.
    vec3 q = p * 1.7 + vec3(0.0, 0.0, uTime * uChurn);
    vec3 drift = vec3(
      snoise(q),
      snoise(q + vec3(31.4, 11.2, 0.0)),
      snoise(q + vec3(0.0, 17.7, 43.1))
    );
    p += drift * uTurbulence;

    // --- outward travelling wave (the "responding" ripple) ---------------
    // A crest sweeping core -> rim. Points ride it outward slightly, so the
    // cloud looks like it is pushing sound out of its centre.
    float wave = sin((aRadius * 5.5 - uTime * uPulseSpeed) * 3.14159265);
    p *= 1.0 + wave * uPulse * 0.14;

    // --- global expansion, plus live voice ------------------------------
    float mic = uMic * uMicResponse;
    p *= uExpansion + mic * 0.1;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // --- size ------------------------------------------------------------
    // Wide per-point size variance is a large part of the star-field read:
    // a few big bright points among many tiny ones.
    float sizeVariance = mix(0.35, 2.2, fract(aSeed * 91.7));
    float flickerRate = 1.4 + fract(aSeed * 13.3) * 4.0;
    float flicker = 1.0 + sin(uTime * flickerRate + aSeed * 6.2831853) * uTwinkle;

    // uPointSize is in CSS pixels at the reference camera distance and
    // reference canvas height; uSizeScale keeps that constant across render
    // sizes, so the 48px docked avatar is the same cloud shrunk rather than
    // the same dots in a smaller circle.
    gl_PointSize = uPointSize * sizeVariance * flicker
                 * uPixelRatio * uSizeScale * (3.4 / -mvPosition.z);

    // --- brightness ------------------------------------------------------
    // Core points are brighter, which — combined with them being packed
    // more densely — is what blows the centre out to white under additive
    // blending.
    float coreFalloff = 1.0 - smoothstep(0.0, 1.0, aRadius);
    vBright = (0.22 + coreFalloff * 1.0)
            * mix(0.45, 1.3, fract(aSeed * 57.3))
            * flicker
            * (1.0 + mic * 0.5);
    vRadius = aRadius;
  }
`;

export const avatarFragmentShader = /* glsl */ `
  uniform vec3 uColorBase;
  uniform vec3 uColorCore;
  uniform float uMuted;    // 1 while the mic is off — the cloud dims and cools
  uniform float uOpacity;

  varying float vBright;
  varying float vRadius;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;

    // A tight bright centre plus a wide soft halo — a star, not a blob.
    float core = pow(1.0 - d, 3.0);
    float halo = pow(1.0 - d, 1.1) * 0.32;
    float alpha = (core + halo) * vBright * uOpacity;
    if (alpha <= 0.001) discard;

    vec3 color = mix(uColorBase, uColorCore, clamp(core * 1.5, 0.0, 1.0));

    // Muted (mic off): drop the energy without changing the silhouette, so
    // it is obviously the same object in a quieter mode.
    color = mix(color, color * 0.5, uMuted);
    alpha *= mix(1.0, 0.62, uMuted);

    gl_FragColor = vec4(color, alpha);
  }
`;

/** Uniforms for one avatar instance. Never share these between materials. */
export function createAvatarUniforms(theme: AvatarTheme) {
  const colors = AVATAR_THEME_COLORS[theme];
  return {
    uTime: { value: 0 },
    uExpansion: { value: 1 },
    uTurbulence: { value: 0.035 },
    uChurn: { value: 0.09 },
    uPulse: { value: 0 },
    uPulseSpeed: { value: 1 },
    uTwinkle: { value: 0.12 },
    uPointSize: { value: 2.6 },
    uMic: { value: 0 },
    uMicResponse: { value: 0 },
    uPixelRatio: { value: 1 },
    uSizeScale: { value: 1 },
    uColorBase: { value: colors.base.clone() },
    uColorCore: { value: colors.core.clone() },
    uMuted: { value: 0 },
    uOpacity: { value: 1 },
  };
}

export type AvatarUniforms = ReturnType<typeof createAvatarUniforms>;

/**
 * Scatters `count` points through a ball, biased toward the centre.
 *
 * Uniform-by-volume would be `r = u^(1/3)`. Raising that exponent pulls
 * points inward; `coreBias` is that exponent, so 0.33 is a physically even
 * ball and higher values crowd the core. The default lands close to the
 * dense-centre / sparse-rim distribution the reference clip shows.
 *
 * Also writes the two per-point attributes the shader needs: a stable
 * random seed, and the point's normalised radius (kept separately because
 * the shader displaces `position` and would otherwise lose it).
 */
export function createAvatarGeometry(count: number, coreBias = 0.62): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const radii = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Even direction on the sphere: cos(phi) must be uniform in [-1, 1],
    // otherwise points bunch at the poles.
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const s = Math.sqrt(Math.max(0, 1 - u * u));

    const r = Math.pow(Math.random(), coreBias);

    positions[i * 3] = Math.cos(theta) * s * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = Math.sin(theta) * s * r;

    seeds[i] = Math.random();
    radii[i] = r;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
  return geometry;
}
