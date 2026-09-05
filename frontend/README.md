# frontend

A rebuild of the Phronesis frontend, from the bottom up. It replaced the
original `frontend/` wholesale in one migration; the previous version is in
git history at `d3421f8` and earlier.

Nothing here is wired to a backend yet — no `fetch`, no auth, no Firebase. The
serverless functions in `api/` are carried over intact from the previous
frontend and are **not yet called by anything**; connecting them is step 4.

## The order of work

1. **Design the atoms** — buttons, dropdowns, inputs, chips. On paper first,
   as a visual spec, before any of it is a component.
2. **Build the atoms** — one component library, one set of tokens.
3. **Compose the pages** — out of atoms that already exist and already agree
   with each other.
4. **Wire the backend** — last.

The point of that order is the thing V1 demonstrates: pages built first grow
their own controls, and the controls drift.

## What V1 taught us

A grep of `frontend/src` for element styles, before a line of V2 was written:

| Element | Found in V1 |
| --- | --- |
| Primary button | 6 variants — `px-6 py-3`, `px-4 py-2`, `px-8 py-3`, bare `py-2`, twice more |
| Hairline border | 3 opacities of the same colour — `/30`, `/40`, `/45` |
| Text input | 2 border opacities, 2 placeholder opacities (`/60`, `/70`) |
| Button focus state | none — only the global `:focus-visible` outline |
| Card | `rounded-lg border border-[#1c2b47] bg-[#0c1424] p-5`, repeated 7× by hand |

None of this is bad work; it is what happens when every control is authored
at the moment a page needs it. A component layer is the fix, and it only
works if it exists before the pages do.

## What carries over

- **The app flow.** Loading → Welcome → Onboarding → Home, with Diagnosis,
  Solutions and Account hanging off it. V2 changes how it looks, not where
  it goes.
- **The name and the voice.** Phronesis is an assistant that speaks first
  and is spoken to.
- **The four avatar states.** Idle, listening, thinking, responding, and the
  tap that toggles the mic. The *form* is being redesigned; what the form has
  to express is settled and stays.

## What is deliberately open

Everything visual, including the avatar.

The V1 avatar — the volumetric point cloud in
`frontend/src/components/AvatarElement/` — still runs and is worth keeping
around as a reference implementation while V2's replacement is designed. Two
things it learned the hard way are worth carrying into whatever replaces it,
whatever that looks like:

- Motion belongs in a table of plain numbers per state, not in bespoke code
  per state. That is what makes the transitions between states free.
- react-three-fiber must be handed a concrete pixel size. Left to measure
  itself it can park its render loop and paint nothing, silently, with a live
  GL context and correct layout. That failure cost a day in V1 and is the
  reason `Halo.tsx` measures its own box and paints synchronously.

V1's night ground and blue ramp existed to serve the old avatar — a cloud of
white points only reads on a dark ground. With the avatar itself open again,
that constraint is lifted, and the ground is genuinely an open question.

## Layout

```
frontend/
├─ design/          the spec. Not code, and it came first.
│  ├─ 00-element-inventory.md
│  ├─ 01-page-element-map.md
│  ├─ 02-tokens.md          canonical token values
│  ├─ 03-breakpoints.md     two breakpoints, and the app flow
│  ├─ 04-precar.md          the second journey, and what it costs
│  └─ page-01..09*.html     approved mockups
├─ api/            Vercel serverless functions — carried over, not yet called
│  ├─ chat.ts
│  ├─ diagnosis.ts
│  ├─ health.ts
│  └─ tts.ts · tts-local.ts
├─ public/         favicon, icons, and the Phronesis word marks
├─ src/
   ├─ styles/
   │  ├─ tokens.css   the ONLY place a colour is written down
   │  ├─ atoms.css    one class per atom, one atom per class
   │  ├─ pages.css    where atoms sit; it never restyles one
   │  └─ gallery.css  the style guide's own chrome, not the product
   ├─ app/
   │  ├─ routes.tsx      the entry flow and the hub
   │  ├─ Root.tsx        press-is-light + the journey provider
   │  ├─ AppLayout.tsx   the hub shell: tab bar or rail
   │  ├─ journey.tsx     owner vs buyer — the branch the flow turns on
   │  └─ useMediaQuery.ts
   ├─ avatar/
   │  ├─ renderer.ts     pure canvas 2D. No React, nothing to mock
   │  ├─ Halo.tsx        the loop, the sizing, the state blending
   │  └─ useMicLevel.ts  amplitude via a ref, never via state
   ├─ maps/
   │  └─ MapCanvas.tsx    stand-in map. One file to swap for an SDK
   ├─ diagnosis/
   │  ├─ carModel.ts      the low-poly car + where each fault pins to it
   │  ├─ Hologram.tsx     three.js: scene, orbit, markers, sizing
   │  └─ HologramLazy.tsx the code-split boundary
   ├─ components/
   │  ├─ FindingCard.tsx
   │  ├─ MechanicCard.tsx
   │  ├─ RepairOptionCard.tsx
   │  └─ CostBreakdown.tsx  parts vs labour, always split
   ├─ lib/
   │  └─ money.ts         currency in one place, since it is still open
   ├─ data/
   │  ├─ findings.ts      MOCK. Deleted outright in step 4
   │  └─ solutions.ts     MOCK. Deleted with it
   ├─ pages/
   │  ├─ Loading.tsx      the intro — the avatar as the letter O
   │  ├─ Welcome.tsx
   │  ├─ Onboarding.tsx   journey · account · OBD
   │  ├─ Home.tsx         the hub. Avatar centred, then docked
   │  ├─ Diagnosis.tsx    the hologram and the findings
   │  ├─ Solutions.tsx    what to have done, then who does it
   │  ├─ Account.tsx      you, your car, alerts, voice, your data
   │  ├─ Maps.tsx         mechanics, or dealers and sellers
   │  └─ Placeholder.tsx  named stand-ins so the nav is honestly clickable
   ├─ ui/             the component library
   │  ├─ index.ts     the barrel — one import site for the app
   │  ├─ Button.tsx   Button, IconButton
   │  ├─ Form.tsx     inputs, select, switch, checkbox, radio,
   │  │               segmented, slider, search
   │  ├─ Display.tsx  chip, severity, stars, card, row, spec,
   │  │               sheet, divider, bubble
   │  ├─ Nav.tsx      tabs, tab bar, rail, app bar
   │  ├─ Dialog.tsx   native <dialog>, for destructive confirms
   │  ├─ Status.tsx   meter, split, steps, spinner, skeleton,
   │  │               empty state, toast
   │  └─ usePressLight.ts
   ├─ icons.tsx
   └─ App.tsx         the living style guide: every atom, every state
```

`npm run dev` opens the app at `/`. `/styleguide` is the atom gallery. It is the element sheet from `design/`
as running code — which means it cannot drift from the components, because
it *is* the components.

## Status

- [x] **1. Design the atoms** — `design/`
- [x] **2. Build the atoms** — `src/ui/`, 24 components
- [x] **3. Compose the pages** — every screen in the flow is built
- [ ] **4. Wire the backend**
- [ ] **4. Wire the backend**

`tsc -b && vite build` and `oxlint` are clean at every commit.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Loading — holds 2.2s, then replaces itself with `/welcome` |
| `/welcome` | Welcome |
| `/start` | Onboarding 1 · journey. **The branch.** |
| `/join` | Onboarding 2 · account. The only required step |
| `/pair` | Onboarding 3 · OBD. Owner-only; a buyer is redirected to `/home` |
| `/home` | **Home** — the hub. Avatar centred until you speak, then docked |
| `/diagnosis` | **Diagnosis** — the orbitable car and the findings |
| `/solutions` | **Solutions** — `?finding=f1` selects what is being priced |
| `/account` | **Account** — the journey switch here really re-writes the nav |
| `/maps` | **Maps** — real chrome and interaction over a stand-in renderer |
| `/discover` `/compare` | Buyer hub pages — Phase 3 |
| `/styleguide` | Every atom, every state |

The buyer flow is genuinely two steps, not a two-segment progress bar over a
three-step flow: `steps` comes from the journey context, and `/pair` redirects
anyone who has no car to plug a reader into.

## The avatar

`src/avatar/renderer.ts` is pure canvas 2D — no React, no framework, nothing to
mock. `Halo.tsx` owns only the loop and the sizing. Two rules in it are
load-bearing, both learned expensively in V1:

1. **Hand the canvas a concrete pixel size.** Left to measure itself, a
   renderer can sit with a live context, correct layout, and a parked loop,
   painting nothing at all — silently.
2. **Paint once synchronously, and again on resize.** Never wait for the first
   animation frame. A backgrounded tab may never send one, and a blank avatar
   is indistinguishable from a broken app.

Motion lives in a table of plain numbers, one row per state
(`idle / listening / thinking / responding`). That is what makes transitions
between states free — the renderer interpolates two rows and every intermediate
frame is already valid.

## Docking

On Home the avatar is centred until the conversation starts, then it docks into
the composer as the microphone. It is **one canvas, mounted once**, living in an
absolutely-positioned layer and moved between two measured slots by `transform`
alone — never re-parented, so it never remounts and never repaints from scratch.

Two rules the implementation is shaped by:

- **Measure at the moment of the move.** V1 latched the target ahead of time
  and framer-motion animated to a stale one, parking the avatar off-screen.
- **The dock target must not be a transitioning box.** The composer's mic slot
  snaps to its final width instead of animating from zero, because a target
  measured mid-animation reads as zero — and a zero-size guard that silently
  bails leaves the avatar parked at its old position for good. The guard now
  retries on the next frame rather than giving up.

The microphone is only ever started by the user tapping the avatar. Permission
is theirs to grant, so it is never requested on mount or speculatively, and the
level reaches the renderer through a **ref** — level in React state would
re-render the page sixty times a second.

## Why the styling is CSS and not utility classes

Tailwind v4 is installed and the tokens are exposed to it through
`@theme inline`, so page-level layout can use utilities against the same
palette — `.bg-ember` compiles to `background-color: var(--ember)`, not to a
second copy of the hex.

But the atoms themselves are plain CSS classes, because the failure V1
demonstrated is *drift at the call site*, and a utility-first control is
authored at the call site by definition. `<Button variant="primary">` is the
only way to get a button, and the only place its padding is decided.

## The hologram

`diagnosis/carModel.ts` builds the car; `Hologram.tsx` owns the scene, the
orbit and the sizing. It follows the same two rules as the avatar — a concrete
pixel size, and a synchronous first paint — plus three of its own:

- **three.js is code-split.** It is ~530kB, more than the rest of the app put
  together, and it is fetched only when a hologram actually renders. Someone
  who only opens Home never downloads it. The findings list paints first
  either way; the car arrives underneath it.
- **Severity colours are read from the CSS tokens**, not hard-coded as hex in
  the scene. Otherwise the 3D view quietly becomes a second source of truth for
  the palette.
- **The camera fits the box it is given.** A tall stage has a narrower
  *horizontal* field of view, so one fixed distance that frames the car on a
  desktop panel crops it on a phone.

The car is the treatment, not the asset. In production it becomes a compressed
glTF, and five generic bodies — sedan, hatch, SUV, pickup, minibus — cover
almost every car in Uganda without licensing a model per vehicle.

### Two layout rules this page proved the hard way

- An **`@container` rule cannot style its own container**. The stacked layout
  silently did nothing until the flex row moved one level down, inside the
  container, into `.diag__cols`.
- **Measure the canvas, not its host.** The host carries a 1px border, so its
  border-box is 2px wider than the content box the canvas fills — enough to
  leave every frame permanently, subtly stretched.

## Solutions

Two decisions in order: **what to have done**, then **who does it**. On a phone
those are two steps; above 768px they are two columns, and the estimate breaks
down on the right instead of inside the card.

Which finding is being priced lives in the URL — `/solutions?finding=f1` — so
the page is linkable and the back button behaves.

### Why every price is split

A single total is what you get quoted at the gate and have no way to argue
with. `CostBreakdown` refuses to render one: it is always parts *and* labour,
and on the detail panel it is itemised with the hours. The difference between
"UGX 280,000" and "150,000 of that is two hours of someone's time" is the whole
reason the page exists.

For the same reason **best match is not cheapest**. It weighs rating against
distance, because sorting a marketplace by price alone quietly turns it into a
race to the bottom — and the promise here is a mechanic worth trusting.

### Two rules this page added

- **Exactly one option may be "recommended".** A flag that appears three times
  is not a recommendation. It is enforced in the data shape's comment and by
  there being one per set.
- **No control inside a control.** The speciality labels on a mechanic card
  look like Chips but are static `.tag` spans — a Chip is a `<button>`, the
  card is already a button, and nesting them is invalid markup that hands a
  screen reader two controls where there is one.

## Account

The one page where a setting changes the shape of the app: the **Journey**
control writes to the same context the nav reads, so switching to "Looking to
buy" swaps Diagnose/Fix for Discover/Compare and drops the "Your car" section
in the same render. It is the claim from `design/04-precar.md` made executable
rather than asserted.

### Two rules it enforces

- **Critical alerts cannot be switched off.** The control is rendered and
  visibly on, but disabled. A preference that lets someone mute the one alert
  that might keep them safe is not a preference.
- **Destructive actions confirm, and the safe choice comes first.** "Keep my
  account" precedes "Delete everything", so the destructive button is not where
  a thumb lands by reflex.

`Dialog` is the native `<dialog>` element. Focus trapping, the top layer, page
inertness, Escape and the backdrop are all the platform's, because those are
exactly the things hand-rolled modals get subtly wrong.

### One thing the delete dialog will not pretend to know

Reviews you have left for mechanics are other people's reputation as much as
they are your data, and whether deleting an account removes them is **not
decided**. The dialog says so in as many words rather than promising an outcome
either way. That copy is a placeholder for a policy, and it is flagged in
`Account.tsx` — it must be answered before this ships.

## Maps

The map is the page; everything else is glass laid over it.

### The one hard layout rule

**The chrome lives in the layout flow, never absolutely positioned over the
map.** Floating the search row, the filters, the ETA and the sheet
independently is exactly what made them collide in the mockup — twice, at
different heights. Flow order decides who sits where, so the sheet can grow to
any height and nothing lands on anything:

```
search row → filters → ETA → flexible spacer → sheet → tab bar
```

The spacer is what lets the map show through. It is the whole trick.

### The renderer is a stand-in, on purpose

`maps/MapCanvas.tsx` draws the same *shapes* a tiled map will — streets, a
route, pins, your position — because the SDK choice (Google versus MapLibre)
turns on billing and Ugandan routing quality, and nothing on this page needs it
settled first.

Everything around it is real and does not change when the tiles do: the glass
chrome, the filters, the sheet, list/​pin selection, the route redrawing, the
fallback when a filter hides the selected place. **The swap replaces one file
and turns `x`/`y` into `lat`/`lng`.**

## A bug worth remembering

Canvas `resize()` functions that skip work when the size is unchanged must
still assign their local `w`/`h`:

```ts
// WRONG — leaves w/h at 0 whenever the canvas is already the right size
if (nw === canvas.width && nh === canvas.height) return false

// RIGHT
const changed = nw !== canvas.width || nh !== canvas.height
if (changed) { canvas.width = nw; canvas.height = nh }
w = nw; h = nh
```

StrictMode re-runs every effect, and the second run meets a canvas that is
already correctly sized — so the early return left the new closure painting
into a 0×0 box forever. On the map it silently broke pin hit-testing; the same
line was in the avatar. Neither looked broken, because the canvas still showed
what the *first* closure had painted.

## What survived the migration

Replacing the frontend meant deleting the previous application wholesale. Four
things were deliberately kept, because none of them is frontend UI and the app
would be worse or broken without them:

| Kept | Why |
| --- | --- |
| `api/` | Five Vercel serverless functions. This is the backend step 4 wires to |
| `.env` | Six Firebase keys, and **gitignored** — deleting it would have been unrecoverable |
| `vercel.json` | The SPA rewrite. Without it every deep link (`/diagnosis`, `/maps`) 404s on refresh |
| `public/` | The favicon and the real Phronesis word marks |

`.gitignore` is the old frontend's rather than this one's, because it ignores
`.env` and `.env.*` and the replacement did not.
