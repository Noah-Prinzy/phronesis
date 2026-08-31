// frontend/src/components/Avatar/avatarShader.ts

import * as THREE from 'three';

export type AvatarTheme = 'light' | 'dark';

/**
 * Brand colors for the 3D sphere shader, one pair per page theme.
 *
 * Dark mode sits on a black page, so blue-to-white reads great. Light mode
 * sits on a white page, where anything close to white would nearly
 * disappear — so it swaps to a dark-navy-to-blue pair that stays visible
 * against a white background instead.
 */
export const AVATAR_THEME_COLORS: Record<AvatarTheme, { primary: THREE.Color; accent: THREE.Color }> = {
  dark: {
    primary: new THREE.Color('#1369f5'), // blue, sphere base
    accent: new THREE.Color('#ffffff'), // white, sphere top / highlights
  },
  light: {
    primary: new THREE.Color('#0b1220'), // near-black navy, sphere base
    accent: new THREE.Color('#2563eb'), // saturated blue, sphere top / highlights
  },
};

/** Fixed, camera-relative light direction (view space) — top-right of the viewer. */
export const AVATAR_LIGHT_DIRECTION = new THREE.Vector3(0.55, 0.65, 0.85).normalize();

export const avatarVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uDisplacementStrength;

  varying vec3 vNormal;
  varying vec3 vObjectPosition;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  // Classic 3D simplex noise — Ian McEwan / Ashima Arts (MIT license).
  // Standard, widely-used snippet for organic vertex displacement.
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

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

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
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  // Asymmetric power curve: pushes most values toward flat while letting
  // the extremes punch through sharply — crests read as tall spikes and
  // troughs as deep, punchy dips, instead of one smooth uniform ripple.
  // Troughs get a steeper curve + bigger boost than crests, so they carve in
  // harder than the peaks rise.
  float shapeWave(float n) {
    float s = sign(n);
    float a = abs(n);
    float sharpness = s > 0.0 ? 1.5 : 1.85;
    float boost = s > 0.0 ? 1.5 : 1.9;
    return s * pow(a, sharpness) * boost;
  }

  // Two octaves of flowing noise, sampled along the surface normal — a slow
  // "liquid" layer plus a smaller/faster one riding on top of it.
  float displacementAt(vec3 p) {
    float slowTime = uTime * 0.2;
    float n1 = snoise(p * 1.6 + vec3(0.0, 0.0, slowTime));
    float n2 = snoise(p * 3.4 + vec3(slowTime * 0.6, slowTime * -0.4, 0.0)) * 0.5;
    float wave = shapeWave(n1 + n2);

    // Coarse, low-frequency noise so different regions of the sphere ripple
    // with different intensity — smoothly, so it stays stable under the
    // finite-difference normal reconstruction below (a per-vertex random
    // value here would make the recomputed normals jitter).
    float ampVariance = mix(0.55, 1.65, (snoise(p * 0.6) + 1.0) * 0.5);

    return wave * ampVariance * uDisplacementStrength;
  }

  void main() {
    vUv = uv;

    vec3 displaced = position + normal * displacementAt(position);

    // Reconstruct the normal from the displaced surface via finite
    // differences, so lighting actually reveals the surface's motion instead
    // of the shape just wobbling in silhouette with unchanged shading.
    float eps = 0.02;
    vec3 tangent1 = normalize(cross(normal, abs(normal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 tangent2 = normalize(cross(normal, tangent1));
    vec3 pA = position + tangent1 * eps;
    vec3 pB = position + tangent2 * eps;
    vec3 displacedA = pA + normal * displacementAt(pA);
    vec3 displacedB = pB + normal * displacementAt(pB);
    vec3 perturbedNormal = normalize(cross(displacedA - displaced, displacedB - displaced));
    perturbedNormal = faceforward(perturbedNormal, -normal, perturbedNormal);

    vNormal = normalize(normalMatrix * perturbedNormal);
    vObjectPosition = displaced;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const avatarFragmentShader = /* glsl */ `
  uniform vec3 uColorPrimaryFrom;
  uniform vec3 uColorPrimaryTo;
  uniform vec3 uColorAccentFrom;
  uniform vec3 uColorAccentTo;
  uniform float uThemeWipe;
  uniform vec3 uLightDir;
  uniform float uShimmer;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vObjectPosition;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    // Theme change reveal: vViewPosition.xy is the point's offset from the
    // camera's optical axis, which is ~0 for the point facing the viewer
    // dead-on and grows toward the silhouette rim — exactly "distance from
    // the visual center of the orb." uThemeWipe sweeps 0->1 on a theme
    // change, so this reveals the new palette from the center outward.
    float radial = clamp(length(vViewPosition.xy), 0.0, 1.2);
    float reveal = 1.0 - smoothstep(uThemeWipe - 0.22, uThemeWipe + 0.22, radial);
    vec3 uColorPrimary = mix(uColorPrimaryFrom, uColorPrimaryTo, reveal);
    vec3 uColorAccent = mix(uColorAccentFrom, uColorAccentTo, reveal);

    // Two-color vertical brand gradient: dark (bottom) -> light (top),
    // with a slow traveling wave folded into the sampling position so the
    // gradient ripples across the surface instead of sitting static.
    float waveRaw = sin(vObjectPosition.x * 2.2 + vObjectPosition.z * 1.6 + uTime * 0.6);
    float t = clamp((vObjectPosition.y + 1.0) * 0.5 + waveRaw * 0.12, 0.0, 1.0);
    vec3 baseColor = mix(uColorPrimary, uColorAccent, t);

    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vViewPosition);
    vec3 lightDir = normalize(uLightDir);
    vec3 halfDir = normalize(lightDir + viewDir);

    float diffuse = max(dot(normal, lightDir), 0.0);
    // Moderate specular: defined enough to read as a real highlight/shadow
    // (not flat and rigid), without the tight, glossy-plastic look of a high exponent.
    float specular = pow(max(dot(normal, halfDir), 0.0), 26.0) * uShimmer;

    // Fine halftone dot mesh, tiled over the sphere's UVs at high density
    // for a small, crisp point pattern. Multiplying by the diffuse term
    // makes dots read as denser/brighter in lit regions and fade into
    // shadow, following the sphere's own curvature for free.
    vec2 dotUv = vUv * vec2(140.0, 70.0);
    vec2 cellUv = fract(dotUv) - 0.5;
    float dotDist = length(cellUv);
    float dotMask = 1.0 - smoothstep(0.12, 0.17, dotDist);

    float lightTerm = 0.45 + diffuse * 0.65;
    vec3 color = baseColor * lightTerm;
    color += dotMask * diffuse * 0.4 * uColorAccent;
    color += specular * 0.5 * uColorAccent;

    // Hollow shell: nearly transparent everywhere except right at each dot,
    // so the far hemisphere's dots show through the near one as the sphere
    // turns — that layering is what reads as depth, instead of a solid fill.
    float baseAlpha = 0.04;
    float dotAlpha = dotMask * (0.55 + diffuse * 0.45);
    float alpha = clamp(baseAlpha + dotAlpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Builds a fresh uniforms object for one sphere instance (uniforms must not
 * be shared across materials). `theme` seeds both the "from" and "to" color
 * pairs so the sphere starts fully settled on that theme, with no reveal in
 * progress — AvatarSphere.tsx re-points "to" and resets uThemeWipe whenever
 * the theme prop actually changes.
 */
export function createAvatarUniforms(theme: AvatarTheme) {
  const colors = AVATAR_THEME_COLORS[theme];
  return {
    uColorPrimaryFrom: { value: colors.primary.clone() },
    uColorPrimaryTo: { value: colors.primary.clone() },
    uColorAccentFrom: { value: colors.accent.clone() },
    uColorAccentTo: { value: colors.accent.clone() },
    uThemeWipe: { value: 1 },
    uLightDir: { value: AVATAR_LIGHT_DIRECTION },
    uShimmer: { value: 1 },
    uTime: { value: 0 },
    uDisplacementStrength: { value: 0.05 },
  };
}

export type AvatarUniforms = ReturnType<typeof createAvatarUniforms>;
