# Phronesis avatar v2 — hex-shell orb

Frames chopped from `phronesis New Avatar.mp4` (1432×812, 30fps, 62s screen
recording). Everything here is reference material; only `avatar-loop.webm` /
`.mp4` under `frontend/public/avatar/` is meant to ship.

## What the source actually is

A sphere skinned in ~11 latitude rows of **separate hexagonal plates**, each
plate floating a little off the surface with a visible dark gap around it. A
band of ~3 rows lights up and the whole shell rotates about a tilted axis, so
the lit band sweeps across the face, sinks to the bottom rim, passes behind, and
reappears on the top rim. While it's behind, the front face goes fully black and
the sphere reads as a hollow ring.

The band crosses the face **three times per loop** — once every 45 frames /
1.5s. The three crossings aren't identical (the axis precesses), which is why
the loop closes at 4.5s rather than 1.5s. The two rim phases are asymmetric: the
bottom-rim phase is dim (~1.5–2% of the frame lit) because the band is behind
the sphere, the top-rim phase bright (~5–6%) because it's passing in front.

## Extraction

| | |
|---|---|
| Source crop | `crop=704:704:354:54` (orb bbox is x 426–987, y 127–686; centre 706.5, 406.5) |
| Loop start | t = **32.3667s** |
| Loop length | **135 frames = 4.500s exactly** — verified: frame 135 of the source matches frame 0 to 0.3/255 mean abs error |
| Orb / frame | 562px orb inside a 704px crop → orb fills **~80%** of the square |

Loop length was found by sliding-window search over the whole clean stretch of
the recording; 135 beat every other candidate, and its double (270) confirmed it.

**The source render is ~20fps, not 30.** 44 of the 135 captured frames are
byte-near duplicates of their predecessor — the recording is a 30fps capture of
a ~20fps animation. The duplicates are kept so playback timing matches the
original exactly; two transitions (59→60, 134→0) are ~2× a normal step, which is
a dropped frame in the capture.

## Contents

- `loop/frame_000.png` … `frame_134.png` — 512×512, the full seamless loop
- `keyframes/pose_00.png` … `pose_11.png` — 1024×1024, 12 poses evenly spaced
  across the loop. **These are the ones to hand to Figma.**
- `avatar-sprite-256.png` — 3840×2304, 15 cols × 9 rows, 256px cells, row-major
  from frame 0. Cell (col, row) for frame *n*: `col = n % 15`, `row = n / 15`.
- `avatar-poses.png` — all 12 poses on one sheet, for quick reference

## Palette (median-sampled from the video)

| role | hex | where |
|---|---|---|
| void | `#000000` | background, gaps between plates |
| plate shadow | `#0A0B10` | unlit plates on the dark hemisphere |
| plate dark | `#161C25` | unlit plates catching a little rim light |
| plate mid | `#2A3848` | plates just outside the band |
| steel | `#3F5873` | band falloff |
| band mid | `#52799E` | band, off-centre |
| band bright | `#6495C5` | band body |
| band hot | `#70AAE2` | band core |
| band peak | `#8AD7FB` | leading edge of the band |
| band peak max | `#ABF3FE` | specular hits at the limb |

Roughly 60% of the orb's pixels sit below `#2A3848` — the thing is mostly dark,
and the band is what carries it. Don't lift the floor.

## Compositing

The asset is a glow on pure black with no alpha channel, and the dark plates are
part of the artwork — keying black out would eat them. On a dark surface,
composite it additively instead:

```css
.avatar { mix-blend-mode: screen; }   /* or plus-lighter */
```

## Relationship to the current avatar

`frontend/src/avatar/renderer.ts` drives a canvas-2D ring through four states
(`idle` / `listening` / `thinking` / `responding`) off a table of numbers. The
same four states map onto this orb: band sweep speed, band width, shell tilt,
and peak brightness are the four knobs, so the state table survives the redesign
even if the renderer doesn't.
