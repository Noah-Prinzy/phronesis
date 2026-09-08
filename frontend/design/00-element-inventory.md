# Element inventory

Every atom Phronesis needs, and what each has to do. Written before any
visual direction is chosen, so it holds regardless of what the reference
images turn out to say. This is the checklist the design has to satisfy —
not a description of how it should look.

Derived from what the V1 pages actually use: Loading, Welcome, Onboarding,
Home, Diagnosis, Solutions, Account.

---

## Constraints that shape all of it

These come from the product, not from taste, so they survive any direction.

- **Phone first.** Uganda and Africa-wide. The desktop layout is the
  afterthought here, not the other way round.
- **One-handed, outdoors.** Controls sit in thumb reach; contrast has to hold
  up in daylight on a phone screen at partial brightness.
- **Touch, not hover.** Hover is a nicety. **Pressed** is the state that
  actually communicates, and it is the one usually left undesigned.
- **Modest hardware and modest data.** Prefer native controls that cost
  nothing to ship and already work offline over custom ones that need
  JavaScript to open.
- **The avatar is the loudest thing on screen.** Whatever it becomes, the
  controls stay quieter than it. If a button competes with the assistant for
  attention, the button is wrong.

---

## Priority 1 — this pass

### Button

The most-used and most-drifted element in V1.

| Variant | Used for | Live example in V1 |
| --- | --- | --- |
| Primary | The one action a screen exists for | "Send", "Sign In", "Create Account" |
| Secondary | The real alternative to the primary | "NO" on the journey question |
| Ghost | Tertiary, navigation, dismissal | Back arrows, "Sign Up" tab |
| Danger | Destructive and irreversible | "Sign out" |

Sizes: **small** (dense rows, chips of action), **medium** (default),
**large** (the single primary action on a mostly-empty screen — Welcome,
Onboarding).

States each variant must define: `default`, `hover`, **`pressed`**, `focus`
(keyboard, visible), `disabled`, `loading`. V1 defines two of six.

Also needs: an **icon-only** form (V1 has two — account, run diagnosis) with
its own accessible label, and a minimum hit area of 44px regardless of how
small it is drawn.

### Dropdown / select

V1 has no real dropdown — the journey choice is two large buttons and the
account journey switcher is a stack of them. V2 needs a proper one for
vehicle make, model, year, region, language.

The open question to settle at design time, not build time: **native
`<select>` or a custom listbox.** Native gets the OS picker, full
accessibility, and zero JS for free — which matters a lot on a low-end
Android — at the cost of not being stylable inside the popup. Custom gets
full control and costs a keyboard-navigation implementation and a popup that
has to be positioned. The recommendation is native wherever the options are
plain text, custom only where an option needs more than a label.

Needs: closed state, open state, selected state, placeholder/empty, disabled,
error, and a long-list case (vehicle models run to hundreds).

---

## Priority 2 — the pass after

- **Text input** — email, password, and the chat composer, which is its own
  thing: multiline, grows, and sits beside a send control.
- **Field** — the wrapper that carries label, hint, error and required mark.
  Error text has to say what to do, not just what failed.
- **Segmented control** — Sign In / Sign Up; pre-car / post-car.
- **Chip / badge** — severity on Diagnosis. Semantic colour (ok / warning /
  critical) is a separate scale from the brand accent and must not borrow it.
- **Card** — hand-rolled seven times in V1. Diagnosis findings, mechanic
  listings, account sections.
- **Message bubble** — assistant and user, with a streaming state, since
  replies arrive token by token.

## Priority 3

- Toggle / switch, checkbox, radio
- Link
- Spinner and skeleton
- Divider with a label (the "OR" rule on Onboarding)
- Toast / inline banner
- Bottom sheet or modal

---

## The avatar

Being redesigned, so its form is open — but what it has to express is not:

| State | Means |
| --- | --- |
| `idle` | Present, not demanding anything |
| `listening` | Mic is live and it is taking in what you say |
| `thinking` | Working — a request is in flight |
| `responding` | Speaking, ideally in time with the actual audio |

Plus: tapping it toggles the microphone, it has to read at both a
screen-dominating size and a small docked one, and it moves between those two
positions when content needs the room.

One state V1 never had and the product arguably needs: something for
**alarm** — the honest answer is sometimes "stop driving this car." Worth
deciding whether the new avatar can say that.
