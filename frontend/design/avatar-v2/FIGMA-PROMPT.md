# Figma prompt — Phronesis avatar v2

Paste the block below into Figma (Make / First Draft / an AI plugin). Upload
`keyframes/pose_00.png` … `pose_11.png` alongside it. `pose_00` is the hero
pose. `pose_02` / `pose_06` / `pose_10` are the "band has sunk to the bottom
rim" poses and `pose_03` / `pose_07` / `pose_11` the "band is riding the top
rim" ones — in all six the front face is essentially black.

---

## PROMPT

Build a Figma component set for a voice-assistant avatar called **Phronesis** —
a hexagonal-plated sphere with a band of light sweeping around it. I've attached
12 reference frames from the 3D source; match them, don't reinterpret them.

### The object

A sphere skinned in **11 latitude rows of separate hexagonal plates**. Every
plate is its own shape, floating slightly off the surface, with a dark gap all
the way around it — the shell reads as armour panels, not as a wireframe or a
texture. Row 1 and row 11 are the poles and hold the fewest plates; the equator
row holds the most (about 16 across the visible face).

Draw it as a **flat 2D projection of a 3D sphere**, not an isometric grid:

- Plates near the centre of the face are the largest and read as regular
  hexagons, flat-top orientation.
- Plates compress horizontally as they approach the left and right limb —
  squash each one toward the sphere's centre by `cos(longitude)`. At the very
  limb they become thin slivers, and you see their *edges* rather than their
  faces.
- Plates compress vertically as they approach the poles, by `cos(latitude)`.
- Every plate's own axis tilts to follow the sphere's curvature — the grid lines
  bow outward, they never stay straight.
- The gap between plates is roughly **12–15% of a plate's width**, pure black,
  and it stays visually constant, so it looks proportionally wider near the limb.

### The light

One band of light wraps the sphere, about **3 plate-rows tall**, tilted roughly
12° off horizontal. Everything outside it is nearly black.

Colours, exactly:

| token | hex | use |
|---|---|---|
| `orb/void` | `#000000` | background and the gaps between plates |
| `orb/plate-shadow` | `#0A0B10` | unlit plates on the dark hemisphere |
| `orb/plate-dark` | `#161C25` | unlit plates picking up rim light |
| `orb/plate-mid` | `#2A3848` | the row immediately outside the band |
| `orb/steel` | `#3F5873` | band falloff |
| `orb/band-mid` | `#52799E` | band, off-centre |
| `orb/band-bright` | `#6495C5` | band body |
| `orb/band-hot` | `#70AAE2` | band core |
| `orb/band-peak` | `#8AD7FB` | leading edge of the band |
| `orb/band-max` | `#ABF3FE` | specular hits where the band meets the limb |

Rules for applying them:

- Brightness falls off **across** the band (centre row hottest, the row above
  and below a step or two down) **and along** it (hottest slightly left of
  centre, cooling toward both limbs) — but the very last plates at each limb
  spike back up to `orb/band-max`, because that's the specular edge. That
  double falloff with bright limb tips is the single most recognisable thing
  about this avatar. Don't flatten it.
- Give each plate one flat fill. No gradient inside a plate — the gradient lives
  in the *difference between* plates. Individual flat facets are the look.
- Add a top-left bevel highlight one step brighter than the fill on lit plates
  only, about 8% of the plate height.
- The sphere's outer limb keeps a faint cool rim even when unlit: a 1–2px
  `#2A3848` arc, strongest where the band exits the silhouette.
- Around the lit band only, an outer glow: `#3AD6FF` at 30% opacity, ~24px blur,
  no spread. Nothing else glows.
- Roughly 60% of the plates should sit at `orb/plate-shadow` or `orb/plate-dark`.
  The orb is mostly dark and the band is what carries it — if it reads as an
  evenly-lit disco ball, the value structure is wrong.

### What to produce

**1. A component `Avatar / Orb`** with two properties:

- `Pose` — 12 variants, `01` through `12`, one per attached reference frame.
  They step through **three crossings** of the same motion, not one:

  > band across the face → sinks toward the bottom → the front face goes fully
  > black and only the **bottom rim** glows → the light reappears on the **top
  > rim** → it sweeps back down across the face → repeat.

  Poses 1, 5, 6 and 9 are face-crossings. Poses 3, 7 and 11 are bottom-rim.
  Poses 4, 8 and 12 are top-rim. Pose 2 is the one in-between frame where the
  top and bottom rims are lit at the same time and the sphere reads as a hollow
  ring — worth building carefully, it's the most distinctive frame in the set.

  The two rim states are **not** mirror images and must not be built as one
  flipped variant: the bottom-rim poses are dim, roughly a third of the lit area
  of the top-rim ones, because there the band has passed behind the sphere. The
  top-rim poses are bright — the band is passing in front, over the top.

  In every rim pose, every front-facing plate is `orb/plate-shadow` and only the
  one limb row carries the band. Getting these right matters more than getting
  the in-between poses right.
- `State` — `Idle`, `Listening`, `Thinking`, `Responding`. State only changes
  the light, never the geometry:
  - `Idle` — band at 80% brightness, 3 rows tall
  - `Listening` — 110% brightness, band widened to 4 rows
  - `Thinking` — 95% brightness, band narrowed to 2 rows and tightened to the
    core colours
  - `Responding` — 120% brightness, 3 rows, and the outer glow doubled

**2. Frames at 512, 256, 140, 88, 40, and 24 px.** These are real sizes in the
product, and the plate count must drop as they shrink or it turns to mush:
- 512 / 256 — all 11 rows
- 140 — 9 rows
- 88 — 7 rows
- 40 — 5 rows, no bevels
- 24 — drop the plates entirely: a plain dark circle with a single lit arc
  across it, `orb/band-hot` → `orb/band-peak`

In every frame, **the orb occupies 80% of the square** and sits dead centre. The
remaining 20% is breathing room for the glow.

**3. A 2×6 spec sheet page** showing all 12 poses on `#000000` at 200px, then a
detail callout at 400px on pose 1 with the plate gap, bevel, and band falloff
annotated.

### Constraints

- Background is `#000000` everywhere. Never white, never transparent.
- Everything is vector. No image fills, no bitmap effects other than the layer
  blur on the glow.
- Publish the ten colours above as Figma variables under an `orb/` collection —
  don't hard-code hexes on shapes.
- One artboard per size, named `avatar/orb/{size}`.
- No text, no labels, no UI chrome anywhere on the artboards except the spec
  sheet.

---

## Notes for whoever runs this

The animation is a **135-frame, 4.500s loop at 30fps** (the underlying render is
~20fps — a third of the captured frames are duplicates). Inside that loop the
band crosses the face three times, once every 45 frames / 1.5s; the three
crossings differ slightly because the rotation axis precesses, which is why the
loop is 4.5s and not 1.5s. Figma variants won't animate it; they're for spec and
handoff. The actual motion ships as
`frontend/public/avatar/avatar-loop.webm`, or gets rebuilt as a canvas/WebGL
renderer the way `frontend/src/avatar/renderer.ts` does today.

`orb/band-peak` (`#8AD7FB`) and the glow colour `#3AD6FF` are the existing
`--hud` token in `frontend/src/styles/tokens.css` — the new avatar is already on
palette, so don't let Figma drift the hue.
