# Breakpoints and the flow

Two breakpoints. Not three, and not one per device anyone happens to own.

| Width | Navigation | Layout |
| --- | --- | --- |
| `< 768px` | Tab bar, docked bottom | One column. Overlays are sheets |
| `≥ 768px` | Rail, 64px, left | One column until 900px, then splits |
| `≥ 900px` (container) | Rail | Side-by-side panels |

The second row and the third are the same DOM. Only the width differs.

## Why the split rule is a container query, not a media query

`@container (max-width: 900px)` is measured against **the page's own box**, not
the browser window. That matters because the rail already took 64px, and
because a panel does not care how wide the monitor is — it cares how much room
it was actually given.

```css
.desk { container-type: inline-size }

@container (max-width: 900px) {
  .diag-body  { flex-direction: column }        /* car above findings */
  .acct-grid  { grid-template-columns: 1fr }    /* settings stack */
  .ob3-grid   { grid-template-columns: 1fr }
  .maps-list  { width: 250px }                  /* give the map its room back */
}
```

A media query would get all four of these wrong the moment the app is embedded,
split-screened, or shown beside anything else.

## What actually changes across the whole range

Four things, and deliberately nothing else:

1. The **tab bar becomes a rail**.
2. **Sheets become panels** — the same content, no longer floating.
3. Anything a phone reaches with a **second tap** sits side by side.
4. The car becomes a **real, orbitable 3D model**.

Type scale, colours, radii, spacing and every component's anatomy are identical
at every width. A "desktop version" that also redesigns its controls is two
design systems wearing one name.

## Tablet

Tablet is not a third design; it is the `≥ 768px` layout in a narrower box.

- **Portrait (834×1112)** — rail, single column, splits collapsed. The extra
  vertical room is what makes stacking Diagnosis work: the car takes 250px and
  the findings list scrolls beneath it.
- **Landscape (1112×834)** — over 900px, so it is simply the desktop layout.

Two consequences worth stating, because both were bugs before they were rules:

- A collapsed panel must set **`overflow-y: auto`**. Stacking makes content
  taller than the viewport, and clipped content is unreachable content.
- Never animate the **width** of a scroll container. It janks on a real machine,
  and it is frozen — mid-transition — in any backgrounded tab.

---

# The flow

Identical on every width. No step is added, removed or reordered by screen size.

```
Loading  ─→  Welcome  ─→  Onboarding 1 · journey    "Do you own a car?"
                          Onboarding 2 · account     create / sign in / Google
                          Onboarding 3 · OBD         owners only, skippable
                      ─→  Home
                            ├─ Diagnosis  ─→  Solutions  ─→  Maps
                            └─ Account
```

**Onboarding 1 is the branch.** *I own a car* → the post-car journey, and the
OBD step in position 3. *Not yet* → the pre-car journey, which is Phase 3, and
which skips step 3 entirely.

The answer is not permanent: Account carries the same choice as a segmented
control, so a user who buys a car changes one switch rather than making a new
account.

**From Home, every page is reachable two ways** — by conversation ("Shall I
open Diagnosis?") and by manual navigation. Neither is a fallback for the
other. Conversational routing is the product's argument; manual navigation is
what makes it usable by someone who already knows where they are going.
