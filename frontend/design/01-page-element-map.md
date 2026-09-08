# Page and element map

Every screen in Phronesis and every element on it, read out of
`docs/PHRONESIS_APP_PLAN_COMPLETE.md` — not out of what V1 happens to have
built. Several of these screens do not exist yet in any form.

The point of the map is that the component library falls out of it: build the
atoms these pages actually need, in the order the pages need them.

Legend: **✅ built in V1** · **◐ partly built** · **○ not built**

---

## Entry flow

### 1. Loading / splash ✅
Wordmark with the avatar as the "O", tagline "Understand before you repair."
→ *wordmark lockup, avatar (letter size), progress or timed hold*

### 2. Welcome ✅
Avatar centred and speaking its introduction; tap to continue.
→ *avatar (hero), staged text reveal, hint label, full-bleed page*

### 3. Sign in / Sign up / Google ◐
Two tabs, email + password, confirm on signup, Google button, divider.
Firebase Auth is wired in V1; the screen is UI-complete.
→ *segmented control, text input, password input, primary button, social
button, labelled divider, form error, link*

### 4. Journey detection ✅
"Do you own a car?" → YES routes post-car, NO routes pre-car. §3.1
→ *avatar (mid), question heading, two large choice buttons*

### 5. OBD pairing ○
Prompted during post-car onboarding, deferrable. §8.1–8.3
→ *device list with live scan, connection status, pair/retry buttons,
permission-denied state, "skip for now", fallback-mode explainer*

---

## The hub

### 6. Home / Avatar chat ◐
The centre of the product. Avatar centred until the conversation starts, then
docked. Intent routing sends the user to every other page from here. §7
→ *avatar (hero → docked), message bubbles (user / assistant / **streaming**),
composer with text + voice + camera + attachment, mic toggle, send,
suggestion chips, typing indicator, route-confirmation prompt
("Shall I open Diagnosis?"), scroll-to-latest, header with account*

Multi-modal input is specified for both journeys — §5.2.4 and §6.2.4 — so the
composer is not just a text box: **text, voice, audio recording, video
recording, image upload**.

---

## Pre-car journey

### 7. Car information library ○
Browse by make/model/year, or ask. Engine, parts, country of manufacture,
mileage, fuel consumption, tank size, transmission, dimensions, safety,
warranty. §5.2.1
→ *search field, make/model/year **dropdowns**, spec table, spec row,
vehicle card, image gallery, tabs*

### 8. Recommendations & comparison ○
Budget and use-case questions, then matched vehicles; **compare up to 3
side by side** with pros and cons. §5.2.2
→ *comparison table (3 columns, horizontally scrollable on a phone), vehicle
card, pro/con list, budget slider or range input, checkbox selection*

### 9. Price gauging & market analysis ○
Market price ranges by region, condition, year. Deal alerts. Price trend over
time. Regional differences — "cheaper in Nairobi than Kampala". §5.2.3
→ *price-range bar, **trend chart**, region selector, deal badge,
comparison rows, currency-formatted figures*

---

## Post-car journey

### 10. Diagnosis ◐
3D car hologram, audio analysis, OBD codes, findings with confidence and
urgency. §6.2.5–6.2.6
→ *3D hologram viewer with part selection and **colour-coded urgency
overlay**, part callout/tooltip, finding card, **confidence meter**,
**urgency badge** (Critical / High / Medium / Low), root-cause disclosure,
must-fix vs nice-to-have grouping, scan-progress state, live OBD readouts*

### 11. Solutions & marketplace ◐
Ranked mechanic partners, smart matching, cost options, comparison. §9
→ *mechanic card (rating, distance, specialisation), **star rating**, sort and
filter controls, cost-range bar, **parts vs labour breakdown**, quote request,
compare drawer, contact buttons (call / message / directions)*

### 12. Service report ○
The Phronesis report, later a mechanic-generated counterpart. Parts vs labour,
urgency, priority, timeline, warranty. §6.2.8, §9.4
→ *report header, itemised cost table, timeline, warranty block, print/share,
severity summary*

### 13. Feedback & resolution ○
Mark resolved (OBD can verify by retest), rate 1–5 with comments, upload
photos of completed work. §6.2.9
→ *star input, comment textarea, **photo upload with thumbnails**, resolved
confirmation, retest prompt*

---

## Shared

### 14. Maps & navigation ○
Dealerships and sellers (pre-car), mechanic routing (post-car). Live turn-by-
turn, traffic-aware ETA. §5.2.5, §6.2.10
→ *map canvas, pin and cluster, bottom sheet with place detail, route line,
ETA chip, filter chips (type / price / distance), recentre control,
directions button*

### 15. Notifications & alerts ○
Critical / warning / informational, with user-set thresholds. §6.2.3
→ *alert row with severity stripe, unread dot, group header, threshold
settings, **toast** for live alerts, empty state*

### 16. Account ◐
Email, username (the avatar uses it), phone, profile picture, primary journey
toggle, secondary journey access, connected OBD devices, chat history,
privacy and data settings, sign out. §2.5
→ *avatar/profile image with upload, editable field rows, **toggle switches**,
journey selector, device list, destructive button, section headers*

### 17. Not found ✅
→ *message, link home*

---

## The atom list this produces

Ordered by how many screens need them.

**Tier 1 — needed by nearly every screen**
Button (primary / secondary / ghost / danger · sm / md / lg · icon-only ·
default / hover / **pressed** / focus / disabled / loading) · Text input ·
**Dropdown / select** · Card / panel · Icon button · Field wrapper (label,
hint, error, required)

**Tier 2 — needed by a specific journey**
Segmented control · Chip / filter chip · **Severity badge** · Star rating ·
Message bubble (incl. streaming) · Toggle switch · Checkbox · Radio ·
Search field · Bottom sheet · Tabs · Table / spec row · Slider / range

**Tier 3 — supporting**
Toast · Inline banner · Progress bar and ring · Skeleton · Spinner ·
Labelled divider · Avatar / profile image · Photo upload tile · Tooltip ·
Empty state · Modal

**Composite, page-specific**
Vehicle card · Mechanic card · Finding card · Cost-breakdown block ·
Comparison table · Map bottom sheet · Hologram viewer · OBD readout tile

---

## One constraint the map makes non-negotiable

The documentation specifies a **colour-coded urgency scale** in three separate
places — §6.2.5 (`red = critical, yellow = warning, green = healthy`), §6.2.6
(Critical / High / Medium / Low), §6.2.3 (critical / warning / informational).

That scale is load-bearing product meaning, not decoration. It has first claim
on red, amber and green, and the brand accent has to be chosen so it never
reads as one of them. This is the single hardest constraint on the palette.
