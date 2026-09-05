# The pre-car journey

Phase 3. Written now because it constrains the component library, not because
it is being built yet.

## The app does not become a different app

Journey is a mode, not a fork — §3.2 gives a user one *primary* journey and
lets them hold both. So both journeys live in one shell, and the shell barely
moves:

| Slot | Post-car | Pre-car |
| --- | --- | --- |
| 1 | Home | Home |
| 2 | Diagnosis | **Discover** |
| 3 | Solutions | **Compare** |
| 4 | Maps | Maps |
| 5 | Account | Account |

Loading, Welcome, Onboarding 1–2, Home, Maps, Account, Notifications and 404
are shared. **Two slots swap. That is the entire structural change.**

## Why those two pages

The parallel is exact, and that is the argument for the split:

| | Understand the situation | Decide and act, with money and a counterparty |
| --- | --- | --- |
| Post-car | **Diagnosis** — what is wrong | **Solutions** — what it costs, and who does it |
| Pre-car | **Discover** — what exists | **Compare** — which one, and what it should cost |

### Discover · §5.2.1

Search and browse by make, model, year. The spec sheet carries engine, parts,
country of manufacture, mileage, fuel consumption, tank size, transmission,
dimensions, safety and warranty.

It **reuses the hologram viewer** — the same component as Diagnosis, with a
different overlay. There you rotate the car that is broken; here you rotate the
car you are considering. Same geometry, no fault markers.

### Compare · §5.2.2–5.2.3

Up to three vehicles side by side with pros and cons, and a **Market tab**
carrying the price band, regional differences and the trend.

Market is a tab rather than a sixth page: a price only means something next to
a specific car, and it keeps the nav at five slots matching post-car. The cost
of that decision is that price-watching is not a habit-forming destination —
if deal alerts become a retention mechanic, Market earns its own slot and this
gets revisited.

### Recommendations is deliberately not a page · §5.2.2

The avatar asks budget and use case in conversation, then drops the user into
Compare with three vehicles already loaded. Building it as a form would mean
shipping a wizard that competes with the assistant, which inverts the product's
own argument.

## The pre-car journey has no colour

There is no severity here. Nothing is critical, nothing is a warning. Red and
amber therefore **never appear anywhere in this journey**, and the price scale
is expressed the way the rest of the system already works — position on the
monochrome ramp, with ember as the marker for where a given car sits on the
band.

This sharpens the existing rule rather than straining it:

> Red and amber exist in Phronesis only where safety is at stake.

No green for "good deal", consistent with removing green everywhere else. A
good price is a **position**, not a colour.

## What changes in the shared pages

| Page | Change |
| --- | --- |
| Onboarding | Step 3 (OBD) never shows. Pre-car is a **two-step** flow — the progress bar has two segments, not three |
| Home | Different opening line and suggestion chips; routing targets swap |
| Maps | Dealerships and private sellers, not mechanics. Filters become type / price / distance; the sheet is a seller card |
| Account | No OBD section. "Your car" becomes a saved shortlist |
| Notifications | Deal alerts instead of fault alerts |

The journey toggle lives in **Account only**, not the nav. It is irrelevant
95% of the time, and §3.3 already covers the crossover case conversationally —
*"I heard a weird noise"* while in pre-car gets *"Do you own this car?"* — which
needs no chrome at all.

## Component ledger

**Reused unchanged:** button, chip, card, text input, dropdown, search field,
star rating, tabs, bottom sheet, map, composer, message bubbles, switch,
severity badge (unused here), hologram viewer, halo avatar.

**New — seven atoms:**

| Atom | Used by | Note |
| --- | --- | --- |
| Spec row / spec table | Discover | Label left, value right, mono figures |
| Vehicle card | Discover, Compare | The pre-car twin of the mechanic card |
| Comparison table | Compare | 3 columns; on a phone it scrolls horizontally with a sticky label column |
| Price band | Compare · Market | Market range, average hairline, ember marker for this car |
| Trend sparkline | Compare · Market | Canvas, one stroke, no axes |
| Budget range slider | Discover, Compare | Ember fill to the handle |
| Pro / con list | Compare | Filled dot vs hollow dot — brightness, not hue |

Seven new atoms against roughly forty reused is the payoff for building the
component library before the pages.

## What actually gates Phase 3

Not the screens. The post-car journey generates its own data — the OBD reads
codes, the user describes symptoms. **Pre-car has no such source.** Discover
and Compare are only as good as a vehicle-specification and Ugandan
market-price corpus that does not exist yet, and the regional comparison
(§5.2.3, *"cheaper in Nairobi than Kampala"*) needs cross-border listing data
maintained continuously rather than scraped once.

That is a data-acquisition problem. The screens are about a week once the
component library exists.
