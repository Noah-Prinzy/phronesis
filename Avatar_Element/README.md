# Avatar_Element

A volumetric point cloud with four states and a tap-to-toggle microphone —
the Phronesis assistant's face.

> **The element now lives in the app**, at
> `frontend/src/components/AvatarElement/`. This folder keeps only the
> standalone lab, which imports from there — so there is one copy of the
> code, not two. The old avatar (`frontend/src/components/Avatar/`) is gone.
>
> The in-app studio at **`/avatar-studio`** does everything the lab does and
> runs against the real pages. Prefer it. The lab remains for looking at the
> element with nothing else on the screen.

---

## What it looks like

A cloud of small, sharp, star-like points filling a ball — packed and
blown-out at the core, thinning to isolated specks at the rim. Achromatic
white on a dark page, navy on a light one. The bloom at the centre comes from
additive blending rather than a post-processing pass, so there is no
dependency on `@react-three/postprocessing`.

## The four states

Each state is a set of numbers in `avatarStates.ts` — no state has bespoke
code. That is what makes transitions free: the renderer eases the live values
toward the active state's targets instead of cutting between them.

| State | Reads as | What actually changes |
| --- | --- | --- |
| `idle` | at rest | slow drift, dim core, wide and relaxed |
| `listening` | attention | cloud expands, core brightens, whole body breathes with live mic amplitude |
| `thinking` | effort | contracts inward, fast turbulent churn, heavy shimmer |
| `responding` | speaking | a wave travels core → rim in time with speech, core at full brightness |

## The microphone

Tapping the avatar toggles the mic. That is deliberate rather than incidental:
`getUserMedia` only resolves from a user gesture, so the tap that turns the mic
on **is** the gesture that permits it.

When the mic is off the cloud dims and cools without changing shape, so it
reads as the same object in a quieter mode. When it is on, `useMicrophone`
samples amplitude and drives the cloud with it.

The stream and its `AudioContext` are torn down whenever the mic goes off, so
the browser's recording indicator disappears. Nothing is buffered, stored or
sent anywhere — the amplitude number never leaves the component.

---

## Seeing it

From the repo root:

```bash
node frontend/node_modules/vite/bin/vite.js --config Avatar_Element/preview/vite.config.mts
```

Then open <http://localhost:5180>.

It borrows Vite and the shared packages from `frontend/node_modules` — this
folder has no `node_modules` and no install step of its own.

The lab gives you the avatar at 360 px, 96 px and 48 px at once, a switch
between the white and night grounds, the four state buttons, and a slider for
every motion value. Turn **Live tuning** on, drag until it looks right, then
**Copy block** and paste the result over that state in `avatarStates.ts`.
Tuning the real component beats designing it in another tool and porting the
result — the shader running in the lab is the shader that ships.

---

## Using it

```tsx
import { AvatarElement } from './components/AvatarElement';

<AvatarElement
  state={assistantState}       // 'idle' | 'listening' | 'thinking' | 'responding'
  size={360}
  theme="dark"                 // Phronesis runs on a night ground
  micOn={micOn}
  onMicToggle={setMicOn}
/>
```

Peer requirements — all already in `frontend/package.json`, nothing new to
install:

- `react` 19
- `three`
- `@react-three/fiber` 9

### Props

| Prop | Default | Notes |
| --- | --- | --- |
| `state` | derived | Leave it off and the element runs itself: idle when muted, listening when live. Pass it once your app owns the conversation. |
| `size` | `320` | Number = pixels. Any CSS length works. |
| `theme` | `'dark'` | `'light'` switches to navy points and normal blending so it stays visible on white. |
| `micOn` / `onMicToggle` | uncontrolled | Standard controlled pair. |
| `captureMic` | `true` | Set `false` if your app already captures audio, and feed `micLevel` yourself. |
| `micLevel` | `0` | External amplitude 0–1, used when `captureMic` is false. |
| `onMicError` | — | Called with a display-ready message when the browser refuses the mic. |
| `pointCount` | `5000` | Lower it for small renders and low-end devices. |
| `coreBias` | `0.62` | `0.33` is an evenly filled ball; higher crowds the core. |
| `interactive` | `true` | `false` drops the button semantics — use for a decorative render. |
| `respectReducedMotion` | `true` | Calms the motion when the viewer asks for that. |

Point sizes are authored in CSS pixels at a 320 px reference height and scaled
from there, so one set of tuned numbers holds from a full-screen hero down to
a 48 px docked corner.

### Accessibility

The element is a real button when interactive: focusable, `aria-pressed`
tracking mic state, Enter and Space both toggle, and the current state is
announced through a visually-hidden live region. The focus ring sits on the
wrapper because a `<canvas>` cannot carry one.

---

## Files

```
frontend/src/components/AvatarElement/
├─ AvatarElement.tsx   the component; owns the tap/mic behaviour
├─ AvatarField.tsx     everything inside the R3F canvas; eases state → uniforms
├─ AvatarDock.tsx      centre ↔ corner placement (app plan §4.4)
├─ avatarShader.ts     GLSL, theme colours, and the point distribution
├─ avatarStates.ts     the four states as plain numbers  ← tune this
├─ useMicrophone.ts    getUserMedia + amplitude, with teardown
└─ index.ts            public exports

Avatar_Element/preview/   the standalone lab. Not part of the element.
```

## One trap to know about

react-three-fiber sizes itself from a ResizeObserver and its render loop
stays parked until that reports. Where the observer is slow or never fires,
the failure is silent and total — the canvas lays out at the right size,
holds a live WebGL context, and paints nothing at all. `AvatarElement`
therefore measures its own box synchronously and hands the number down, and
nothing should give it a size it cannot resolve to pixels (no percentages).
`AvatarDock` animates real geometry for the same reason.

## Notes for whoever integrates this

- `avatarStates.ts` is the design surface. Change how the avatar feels there,
  not in the shader.
- Keep the element controlled in the real app. The self-driving fallback is a
  demo convenience, not conversation logic.
- Phronesis ships dark (`--color-bg: #050914`), so `theme="dark"` is the
  normal case; `"light"` exists for any surface that is actually white.
- The docking behaviour — centred while the user talks, shrunk to the corner
  once results appear — is `AvatarDock`, kept separate from the element so
  the avatar itself stays a pure render. Home uses it; other pages place the
  avatar directly.
