# Where things live

One folder per concern, and the rule for choosing between them is: **if two
files would always be changed together, they belong in the same folder.** That
is why the voice sits on its own rather than inside `app/` — the speech
pipeline, the fixed lines and the greeting logic move as one thing.

| Folder | What is in it |
| --- | --- |
| `app/` | The shell and the state it hangs on. Root, routing, layout, and the React contexts — auth, journey, car, focus, alerts — plus the three generic hooks. |
| `voice/` | Everything Phronesis says and hears. Speech out (`useSpeak`, `speechText`, `sentences`), speech in (`useDictation`), the fixed lines and their pre-rendered audio manifest, how he greets you, and the speak-aloud setting. |
| `avatar/` | The orb. `Halo` is the public component; `orbScene` builds the three layers and `orbSpec` is the state table both it and the mic level read. |
| `pages/` | One file per route. Nothing here is shared. |
| `ui/` | The design system, as running code. Every control, plus the icon set. Import from `ui`, not from the files inside it. |
| `lib/` | Talking to the outside world — the API client, Firebase, OBD over Bluetooth, places, money. No React. |
| `data/` | Static domain data and the types for it: findings, solutions, vehicles. |
| `styles/` | Tokens first, then atoms, then pages. Nothing outside this folder hard-codes a colour, radius, duration or font. |
| `diagnosis/`, `maps/`, `precar/` | Components belonging to one feature and used by one or two pages. They live beside the feature rather than in `ui/` because they are not general. |
| `styleguide/` | The atom gallery, on its own route so it can never drift from the components the pages import. |

## Naming

- **Components** are `PascalCase.tsx` — `Halo.tsx`, `OrbCanvas.tsx`, `Home.tsx`.
- **Everything else** is `camelCase.ts` — `useSpeak.ts`, `orbSpec.ts`, `money.ts`.
- **Contexts** are lowercase because they are modules that happen to export a
  provider: `auth.tsx`, `journey.tsx`, `settings.tsx`.
- **Tests** sit beside their subject as `<name>.test.ts`. There is no separate
  test tree; a test three folders away from what it covers does not get read.

## Two things that are generated

- `voice/manifest.ts` and `public/voice/*.mp3` come from
  `backend/scripts/prerender-voice.ts`. Change anything in `voice/lines.ts` and
  run `npm run voice:prerender` in `backend/`, or the new wording silently falls
  back to the live endpoint.
- `dist/` is the build. Nothing in it is edited by hand.

## The design documents

`frontend/design/` holds the written decisions — tokens, breakpoints, the
element inventory, the page map, and the pre-car journey. They are the argument
behind the code, not a description of it, and they are worth reading before
changing anything structural.
