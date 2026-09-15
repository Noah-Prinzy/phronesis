import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isKnownModel, marketImportSchema } from '../src/data/marketImport'

/**
 * Drop everything we have no specs for, before the file is committed.
 *
 * **Why this exists, and why runtime filtering is not enough.**
 *
 * The aggregator sends every make and model it found, which is right: it means
 * the exporter's spelling and our catalogue are compared in exactly one place
 * rather than two that can drift apart. `parseMarketImport` then discards what
 * it cannot match.
 *
 * But that discarding happens in the browser, AFTER the file has been
 * downloaded. A full aggregate of a quarter of a million listings covers
 * thousands of models across twenty years of build dates; we have specs for
 * eight cars. So a statically imported feed ships megabytes to a phone in
 * order to throw away over ninety-nine per cent of it on arrival — and this
 * app is built for people paying for that data by the megabyte.
 *
 * So: match once here, commit the small file, and let the runtime guard stay
 * what it is — a guard, not the only line of defence.
 *
 *   npm run market:trim -- path/to/marketImport.full.json
 *
 * Writes `src/data/marketImport.json` and prints what it dropped.
 */

const IN = process.argv[2]
/* `URL.pathname` is not a filesystem path on Windows — it hands back
   `/D:/…`, which then joins into `D:\D:\…`. `fileURLToPath` is the one that
   knows the difference. */
const OUT = fileURLToPath(new URL('../src/data/marketImport.json', import.meta.url))

if (!IN) {
  console.error('Usage: npm run market:trim -- <path-to-full-feed.json>')
  process.exit(1)
}

const raw: unknown = JSON.parse(readFileSync(IN, 'utf8'))

/* Validated BEFORE trimming, so a malformed feed is caught while the whole
   file is still in front of us. Trimming first would silently discard the
   rows a validation error was about to point at. */
const feed = marketImportSchema.parse(raw)

const kept = feed.models.filter((m) => isKnownModel(m.make, m.model))
const trimmed = { ...feed, models: kept }

writeFileSync(OUT, `${JSON.stringify(trimmed, null, 2)}\n`, 'utf8')

const rows = (list: typeof kept) => list.reduce((n, m) => n + m.years.length, 0)
const before = statSync(IN).size
const after = statSync(OUT).size
const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0

console.log(`  in   ${feed.models.length} models, ${rows(feed.models)} model-years, ${(before / 1024).toFixed(0)}kB`)
console.log(`  out  ${kept.length} models, ${rows(kept)} model-years, ${(after / 1024).toFixed(0)}kB  (${pct}% smaller)`)

if (kept.length === 0) {
  /* Loudly, because an empty file is indistinguishable from a working one
     until somebody opens Compare and finds every car missing. */
  console.error('\n  Nothing matched. Check the feed spells makes and models as our catalogue does.')
  process.exit(1)
}
