# Design tokens

Locked decisions. These are the values the component library is built from.

## Ground rules

The palette is **monochrome**. Hierarchy comes from brightness and elevation,
not from hue. A primary button is not blue — it is simply the brightest
surface on the screen.

Two consequences, both deliberate:

1. **Severity gets colour to itself.** Red and amber never have to compete
   with a brand accent, which was the single hardest constraint in the plan
   document (§6.2.3, §6.2.5, §6.2.6). Colour in this app means one thing.
2. **The avatar is the brightest thing in the app, not the most colourful.**
   It is a white object lit warm, and it holds attention by being the only
   thing that emits rather than the only thing with a hue.

## Colour

### Ground and surfaces
| Token | Value | Use |
| --- | --- | --- |
| `--ground` | `#1a1a1c` | Page. Neutral charcoal, not navy |
| `--ground-lift` | `#202023` | Large raised regions, sheet backdrops |
| `--panel` | `#2a2a2e` | Cards, list rows, inputs at rest |
| `--panel-hi` | `#34343a` | Hover, selected row, **primary button** |
| `--panel-top` | `#3f3f46` | Pressed, and the brightest affordance |
| `--line` | `#34343a` | Hairlines |
| `--line-hi` | `#4a4a52` | Borders that need to be seen |

### Ink
| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#f4f4f6` | Primary text |
| `--ink-dim` | `#a8a8ae` | Secondary text, most icons |
| `--muted` | `#6e6e76` | Tertiary, placeholder, disabled |

### Light
| Token | Value | Use |
| --- | --- | --- |
| `--ember` | `#ff7a2f` | **Light only.** The warm rim behind the avatar, focus glow, active nav indicator |
| `--ember-wash` | `rgba(255,122,47,0.30)` | Bleed and shadow tint |

`--ember` is a light source, never a fill and never a label colour. The moment
it labels something it starts competing with `--warning`, and the whole reason
for a monochrome UI is lost.

### Severity — product-owned, never restyled
| Token | Value | Meaning |
| --- | --- | --- |
| `--critical` | `#ff4d4d` | Stop driving. Critical fault |
| `--high` | `#ff8a3d` | Fix within days |
| `--warning` | `#f5a524` | Fix when convenient |
| *(none)* | `--muted` | **Nothing wrong.** Neutral, no hue |

There is no green. "Nothing is wrong" is the default state of every screen in
the app, and spending a colour on the default is what makes a palette feel
noisy. Clear findings, healthy readings and success toasts are all neutral;
colour marks the exception, never the norm.

### The avatar — Halo

One ring of light. No hue of its own: white light going warm where it is
hottest, with the ember bloom behind it.

- Light travels the ring on **three incommensurate rhythms**, so the pattern
  never repeats and never reads as a loading spinner.
- The ring breathes; its tilt drifts as though turning to face you.
- A second, fainter ring counter-rotates inside it.
- A small warm core pulses at the centre — the thing that makes it feel
  inhabited rather than decorative.

**Two states are driven by real audio.** Each of the ring's 300 segments maps
to one frequency band, so the ring becomes the shape of the sound:

| State | Source | Reads as |
| --- | --- | --- |
| `idle` | internal rhythm | Awake, asking for nothing |
| `listening` | **microphone** | Your voice, live |
| `thinking` | internal rhythm | Light races, ring draws tight |
| `responding` | **TTS output audio** | Phronesis speaking; rings leave on syllable onsets |

Angle maps to band across `0..π` and mirrors back across `π..2π`, so the ring
closes on itself with no seam. Wiring in the app: one `AnalyserNode`
(`fftSize: 256`), source-switched between the mic stream and the reply audio
element. Nothing else in the renderer changes.

## Type

| Role | Face | Used for |
| --- | --- | --- |
| Display | **XSPACE** *(Orbitron stands in until the licence file lands)* | Wordmark, page titles, large HUD figures. ~2% of words |
| Interface | **IBM Plex Sans** | Everything read: chat, labels, buttons, specs, errors |
| Data | **IBM Plex Mono** | DTC codes, prices, confidence, ratings, distances. Tabular figures |

Scale: `12 · 13 · 15 · 18 · 24 · 32 · 48+`, base 15px.

## Geometry

Radii: `999px` pills for buttons and chips · `14px` cards · `20px` sheets and
modals · `10px` inputs · `8px` small tiles.

Spacing: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.

Minimum touch target `44px`, regardless of drawn size.

## Glass

Approved, with a guard. The recipe:

```css
background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025));
backdrop-filter: blur(20px) saturate(1.3);
border: 1px solid rgba(255,255,255,0.09);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.16),   /* the specular top edge */
            0 18px 40px -20px rgba(0,0,0,0.8);
```

`backdrop-filter` is expensive on low-end Android. It is allowed on
**transient, small surfaces** — sheets, modals, toasts, the docked avatar
plate — and **not** on long scrolling lists, where every row would composite
its own blur. List rows use flat `--panel` instead. One token,
`--glass-enabled`, turns it off wholesale if field testing says to.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--t-fast` | `120ms` | Press feedback |
| `--t-base` | `220ms` | Hover, colour, opacity |
| `--t-move` | `420ms` | Position and size |
| `--t-stage` | `620ms` | Avatar docking, page transitions |
| `--ease` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances |

All of it collapses under `prefers-reduced-motion`.

## Interaction: press is light

One rule for everything clickable — buttons, chips, dropdown options, tabs,
nav items, list rows, the lot:

1. It **sinks** a fraction: `translateY(1px) scale(0.985)`.
2. It **warms from the contact point** — a soft ember bloom whose origin is
   the actual pointer position, set as `--px` / `--py` on `pointerdown`.

In fast, out slow: `90ms` to acknowledge, `300ms` to relax. Anything longer
reads as lag on a phone.

The bloom is ember rather than a grey ripple because ember is this system's
light, so contact lighting the control is the palette's own logic rather than
an imported convention. One delegated `pointerdown` listener drives all of it.

Where continuity carries meaning, the indicator **moves** instead of jumping:

| Control | Behaviour |
| --- | --- |
| Segmented control | The thumb slides and resizes between options |
| Tabs | The underline travels |
| Dropdown | Options stagger in, 22ms apart, capped at 160ms |
| Checkbox | The tick draws itself |
| Radio | The dot springs in, slight overshoot |
| Switch | The knob overshoots, the way a real one would |
| Pressable row | Lifts on hover, sinks on press |

The blooms are disabled entirely under `prefers-reduced-motion`; the state
changes still happen, just without the travel.
