# frontend

A rebuild of the Phronesis frontend, from the bottom up. It replaced the
original `frontend/` wholesale in one migration; the previous version is in
git history at `d3421f8` and earlier.

Step 4 is nearly done. Chat, voice, diagnosis, the vehicle record, preferences
and account management all run against the Express server in `backend/`; the
Map draws real OpenStreetMap data. **No screen runs on mock data any more.**

The Vercel functions in `api/` are carried over from the previous frontend and
are *not* used — `backend/` is the chosen server, and the two overlap on every
endpoint.

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
├─ api/             Vercel serverless functions — superseded by backend/
├─ public/          favicon, icons, and the Phronesis word marks
└─ src/
   ├─ styles/
   │  ├─ tokens.css   the ONLY place a colour is written down
   │  ├─ atoms.css    one class per atom, one atom per class
   │  ├─ pages.css    where atoms sit; it never restyles one
   │  └─ gallery.css  the style guide's own chrome, not the product
   ├─ app/            providers, routing, and the cross-cutting hooks
   │  ├─ routes.tsx · Root.tsx · AppLayout.tsx · Surface.tsx
   │  ├─ auth.tsx · car.tsx · journey.tsx · voice.tsx · alerts.tsx · focus.tsx
   │  └─ useSpeak · useDictation · useMediaQuery · useRootFontSize
   │                 · useRouteAnnounce · browserSpeech
   ├─ ui/             the component library — one barrel export
   │  ├─ Button · Form · Display · Nav · Status · Dialog · SpokenText
   │  └─ index.ts     everything a page is allowed to use
   ├─ avatar/
   │  ├─ Halo.tsx     the loop, the sizing, the state blending
   │  ├─ orbSpec.ts · OrbVideo.tsx
   │  └─ useMicLevel.ts  amplitude via a ref, never via state
   ├─ diagnosis/
   │  └─ CarHologram.tsx  an SVG placeholder, swappable for a real model
   ├─ maps/
   │  └─ MapView.tsx      real OpenStreetMap / ArcGIS tiles
   ├─ components/     composites: FindingCard, MechanicCard,
   │                  RepairOptionCard, CostBreakdown
   ├─ lib/
   │  ├─ api.ts       the only module that knows the backend's shape
   │  ├─ userdata.ts · alerts.ts · places.ts
   │  ├─ firebase.ts  tolerant of missing configuration on purpose
   │  └─ money.ts     currency in one place, since it is still open
   ├─ data/           TYPES ONLY. The mock fixtures are gone; what is left
   │  ├─ findings.ts  is CarPart and Finding
   │  └─ solutions.ts and RepairOption and Mechanic
   ├─ pages/          one file per screen
   └─ styleguide/     the atom gallery, and Principles — which measures itself
```

## Status

- [x] **1. Design the atoms** — `design/`
- [x] **2. Build the atoms** — `src/ui/`
- [x] **3. Compose the pages** — every screen in the flow is built
- [ ] **4. Wire the backend** — mostly done; see the table below

| Surface | Source |
| --- | --- |
| Chat | `POST /api/chat` — SSE, streaming |
| Voice | `POST /api/tts` — Microsoft neural, via msedge-tts |
| Diagnosis | `POST /api/diagnosis` — a real report, with a parts/labour split |
| Solutions | derived from the saved diagnosis, not from a price table |
| Account · car · preferences | `/api/car-profile`, `/api/preferences`, `/api/account` |
| Auth | Firebase on the client, `Bearer` ID token to the server |
| Map | OpenStreetMap and ArcGIS tiles, direct — no backend hop |

**Not wired:** `/api/history` exists on the server and nothing calls it. Chat
sessions are auto-saved server-side when a token is present, but the frontend
never reads them back, so there is no "your past conversations" anywhere.

`tsc -b && vite build` and `oxlint` are clean at every commit.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Loading — holds 1.4s, then goes to `/home` if signed in, else `/welcome` |
| `/welcome` | Welcome |
| `/start` | Onboarding 1 · journey. **The branch.** |
| `/join` | Onboarding 2 · account. Name, email and password in one form |
| `/pair` | Onboarding 3 · OBD. Owner-only; a buyer is redirected to `/home` |
| `/home` | **Home** — the hub. Avatar centred until you speak, then docked |
| `/diagnosis` | **Diagnosis** — a real report, with the fault marked on the car |
| `/solutions` | **Solutions** — priced from the saved diagnosis |
| `/account` | **Account** — the journey switch here really re-writes the nav |
| `/maps` | **Maps** — Leaflet, real OSM garages on Esri dark tiles |
| `/discover` `/compare` | Buyer hub pages — Phase 3, still placeholders |
| `/styleguide` | Every atom, every state — and Principles, which self-checks |

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

## The car

`diagnosis/CarHologram.tsx` draws a generic side profile in SVG and marks the
faulted part on it. It is a placeholder, deliberately: the props are the
contract, and the marker anchors are **fractions of the viewBox rather than
pixels**, so a real model — Blender, Sketchfab, or generated from a photo —
drops in without moving a single fault off the part it belongs to.

There was a three.js version: a low-poly wireframe you could orbit, with the
camera fitted to its container and severity colours read from the CSS tokens.
It was replaced by the SVG and then sat unimported for several commits before
being deleted, along with `three` and `@types/three`. Rollup had been
tree-shaking it out, so nobody was downloading it — which is exactly why it
survived so long unnoticed. Two lessons from it are worth keeping even though
the code is gone:

- **Hand a canvas a concrete pixel size.** Left to size itself from a
  ResizeObserver, a renderer can sit with a live context, correct layout and a
  parked loop, painting nothing at all — silently.
- **Measure the canvas, not its host.** The host carried a 1px border, so its
  border-box was 2px wider than the content box the canvas filled — enough to
  leave every frame permanently, subtly stretched.

And one that cost a day and applies to any container query:

- **An `@container` rule cannot style its own container.** A stacked layout did
  nothing at all until the flex row moved one level down, *inside* the element
  carrying `container-type`.

## Solutions

Two decisions in order: **what to have done**, then **who does it**. On a phone
those are two steps; above 768px they are two columns, and the estimate breaks
down on the right instead of inside the card.

It prices the most recent saved diagnosis rather than taking a finding in the
URL — the report already knows what is wrong, and asking the URL to carry it
too was a second source of truth for the same fact.

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

### The renderer

`maps/MapView.tsx` is Leaflet on Esri's World Dark Gray tiles, and the places
are real garages from OpenStreetMap (`lib/places.ts`). The stand-in canvas that
used to live here is gone.

Three things that decision cost, recorded because each was found the hard way:

- **MapLibre lost to Leaflet** on setup, not on quality. MapLibre is the better
  engine but wants a vector tile provider — a second account before anything
  renders at all.
- **CARTO's dark basemap had to be abandoned on sight.** It still serves tiles;
  they just come back stamped "API KEY REQUIRED" across the image. A keyless
  tile service can start demanding a key *without the request failing*, and only
  looking at the map catches it.
- **OSM has names and positions and almost nothing else.** Measured, not
  assumed: of 60 garages in central Kampala, one had a phone number, one had
  opening hours, three had a street. No ratings exist in OSM at all. The UI
  shows what is there and says what is missing rather than inventing stars.

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

## Talking to the backend

`backend/` runs on `:3001`; the frontend reads `VITE_API_BASE_URL` from `.env`.
Both must be running:

```bash
npm --prefix backend run dev     # :3001
npm --prefix frontend run dev    # :5173
```

`src/lib/api.ts` is the only module that knows the base URL, the auth header
and the wire format.

### Chat

`POST /api/chat` answers with **Server-Sent Events over a POST**, so
`EventSource` is out — it only does GET. The client reads the body stream and
parses frames itself, which means handling the thing hand-rolled SSE readers
get wrong: a chunk boundary can land anywhere, including mid-frame and
mid-UTF-8-character. Hence the buffer and `decode(..., { stream: true })`.

The endpoint is stateless, so the whole thread is sent every turn. Two
consequences the UI has to respect:

- The history built for the request comes from what is on screen **plus** the
  new turn — not from reading state back after `setMsgs`, which is one render
  behind and would silently drop the newest message.
- **A failed send rolls the whole turn back** and returns the text to the
  composer. Leaving an unanswered user message in the thread looks kinder, but
  it puts two consecutive `user` roles into every later request — a malformed
  conversation that some providers reject outright.

### Auth

Firebase on the client, `Authorization: Bearer <idToken>` to the server. The
chat endpoint uses `optionalAuth`: it answers signed-out users and only saves
history when a token is present.

`src/lib/firebase.ts` tolerates missing configuration on purpose — a build with
no Firebase keys still runs, and Onboarding says sign-in is unavailable rather
than the whole app failing at module load.

Firebase error codes are mapped to human sentences in `app/auth.tsx`. The
sign-in failure stays deliberately vague about *which* of the email or password
was wrong; that vagueness is a security property, not an oversight.

## Scale

The interface is sized in `rem`, and the root is fluid:

```css
html { font-size: clamp(15px, 13.4px + 0.35vw, 19px) }
```

15px on a phone, 19px on a large monitor. Everything follows because
everything is relative to it — type, control heights, content column widths,
and the avatar canvas (which is drawn in JavaScript and so reads the root size
through `useRootFontSize`).

It was pinned to 15px before, and the app read as a postage stamp on a 27"
screen. Fixed sizes are the bug; a fixed *ratio* is the design.

Breakpoints stay in px, because those are questions about the device rather
than about the type.

## Principles, measured

`/styleguide` opens with a **Principles** section that measures the live page
and reports pass/fail. It is not documentation of intent — it reads the real
computed styles of the real components, so lowering a contrast ratio or
shrinking a control turns it red on its own.

It has already earned its keep. The audit that produced it found:

| Found | Was | Now |
| --- | --- | --- |
| `--muted` text contrast | 2.07–3.44:1 — failed AA on **every** surface | 5.5:1 on panel |
| `--critical` as text | 4.37:1 on panel | 5.15:1 |
| `--line-hi` control borders | 1.6:1, under the 3:1 non-text floor | raised |
| Smallest text | 8px | 11px floor, enforced |
| Interactive star rating | **14×14px** targets | 36×44px |
| Route changes | silent — no title, no focus move, nothing announced | title, focus, polite announcement |
| Skip link | none | first tab stop on every page |

Two contrast "failures" are left standing deliberately: the unfilled stars in a
read-only rating. They are `aria-hidden`, the rating is also given as text
beside them, and they are decorative by WCAG's definition. Lifting them until
they pass would stop them reading as empty.
