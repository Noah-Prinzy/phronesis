import { z } from 'zod'
import { VEHICLES, type Vehicle } from './vehicles'

/**
 * Export stock, as the app is willing to receive it.
 *
 * **This file is the contract.** A scraper produces JSON; this decides whether
 * the app will look at it. Everything below is validated on load and a file
 * that fails is refused whole — because the failure mode being defended
 * against is not a crash, it is a half-parsed feed quietly rendering a
 * plausible wrong number into somebody's buying decision.
 *
 * Three rules the shape enforces, each of which exists because the opposite
 * would be dangerous:
 *
 * 1. **Aggregates only.** Never the listings themselves. A quarter of a
 *    million rows is gigabytes the app has no use for; what it needs is a
 *    count and a spread per model and year, which is a few hundred kilobytes.
 *
 * 2. **The currency and the basis are in the field names.** `fobUsd`, not
 *    `price`. An export figure in dollars and a Kampala figure in shillings
 *    are both "the price", and the only reliable way to stop one being used
 *    where the other belongs is to make them impossible to confuse at the
 *    point of reading.
 *
 * 3. **Nothing is converted here.** No exchange rate, no duty multiplier, no
 *    landed estimate. Those are real calculations with real inputs that go
 *    stale independently, and burying them in an importer would produce a
 *    number with no working shown. This file reports what the exporter is
 *    asking. Landing it is a separate, sourced step.
 */

/** ISO calendar date, and only that. Timestamps go stale silently. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'capturedOn must be a plain YYYY-MM-DD date')

/**
 * A spread, in US dollars, as the exporter quotes it.
 *
 * FOB — free on board — is the car sitting at the Japanese port. It excludes
 * freight, insurance, URA duty, VAT, registration and any dealer margin, all
 * of which happen after this number and several of which scale with the car's
 * age. It is roughly half of what the same car costs on a Kampala forecourt,
 * and the ratio is not a constant.
 */
const fobUsd = z
  .object({
    low: z.number().positive(),
    median: z.number().positive(),
    high: z.number().positive(),
  })
  .refine((b) => b.low <= b.median && b.median <= b.high, {
    message: 'fobUsd must satisfy low <= median <= high',
  })

const yearRow = z.object({
  /** Model year. Not the import year, and not the registration year. */
  year: z.number().int().min(1980).max(2100),
  /** How many were listed. This is the supply signal, and it is load-bearing. */
  count: z.number().int().positive(),
  fobUsd,
  /** Median odometer reading across the listings, in kilometres. */
  medianKm: z.number().int().nonnegative().optional(),
  /**
   * Monthly medians, oldest first, in the same USD/FOB basis.
   *
   * **This is the part of the feed that survives the currency gap.** The
   * absolute level does not transfer to Kampala; the direction and size of a
   * month-on-month move largely does, because duty and freight move far more
   * slowly than stock prices do.
   *
   * It carries its own start month rather than being a fixed twelve, and that
   * is deliberate. A tracker that has been running since January has five
   * real months in May; demanding twelve would mean either waiting a year to
   * show anything, or inventing the other seven. Five real months plotted and
   * labelled "since January" is worth more than twelve of anything made up,
   * and it can land the week after the tracker starts.
   *
   * Two is the floor because one point is not a trend, and twenty-four the
   * ceiling because a sparkline that wide stops being readable.
   */
  trailing: z
    .object({
      /** The month the series starts, so the chart can say what it spans. */
      fromMonth: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'fromMonth must be YYYY-MM'),
      medianUsd: z.array(z.number().positive()).min(2).max(24),
    })
    .optional(),
})

const modelRow = z.object({
  /** As the exporter spells it. Normalised when matched, never before. */
  make: z.string().min(1),
  model: z.string().min(1),
  years: z.array(yearRow).min(1),
})

export const marketImportSchema = z.object({
  /** Who this came from, for the line the user reads. */
  source: z.string().min(1),
  capturedOn: isoDate,
  /**
   * Declared rather than assumed, and checked.
   *
   * A feed that one day starts quoting CIF, or yen, would otherwise look
   * exactly like this one and be wrong by a factor nobody would notice until
   * a user did.
   */
  currency: z.literal('USD'),
  basis: z.literal('fob'),
  /** Every listing behind the aggregate, for "70,204 available" style facts. */
  totalListings: z.number().int().nonnegative(),
  models: z.array(modelRow),
})

export type MarketImport = z.infer<typeof marketImportSchema>
export type MarketImportYear = z.infer<typeof yearRow>

/** One model-year of export stock, already matched to a car we know about. */
export interface ImportStock {
  vehicle: Vehicle
  year: number
  count: number
  fobUsd: { low: number; median: number; high: number }
  medianKm?: number
  trailing?: { fromMonth: string; medianUsd: number[] }
  capturedOn: string
  source: string
}

/** Same string test on both sides. Exporters are inconsistent about case. */
const key = (make: string, model: string) => `${make.trim()}|${model.trim()}`.toLowerCase()

/**
 * The catalogue, indexed once.
 *
 * Module level because `VEHICLES` is a literal — rebuilding this map on every
 * parse would be work done repeatedly to reach the same answer.
 */
const CATALOGUE = new Map<string, Vehicle[]>()
for (const v of VEHICLES) {
  const k = key(v.make, v.model)
  const list = CATALOGUE.get(k)
  if (list) list.push(v)
  else CATALOGUE.set(k, [v])
}

/**
 * Is this something we have specs for?
 *
 * Exported because the same question is asked twice, at two different times:
 * here at runtime, as the last guard, and by `scripts/trimMarket.ts` before
 * the file is ever committed. Two copies of the answer is two things that
 * must agree and nothing making them.
 */
export function isKnownModel(make: string, model: string): boolean {
  return CATALOGUE.has(key(make, model))
}

/**
 * Turn a validated feed into stock the app can show, and drop the rest.
 *
 * Unmatched rows are dropped ON PURPOSE and without complaint. The exporter
 * lists hundreds of models; we have a catalogue of eight, and the answer to a
 * Mazda Demio in the feed is silence rather than a page about a car nobody
 * here has specs for. What is NOT dropped silently is a malformed file —
 * `parseMarketImport` throws for that.
 */
export function parseMarketImport(raw: unknown): ImportStock[] {
  const feed = marketImportSchema.parse(raw)

  const out: ImportStock[] = []
  for (const row of feed.models) {
    const matches = CATALOGUE.get(key(row.make, row.model))
    if (!matches) continue
    for (const y of row.years) {
      /* Matched on model, then pinned to the nearest year we carry. Our
         catalogue holds one year per model and the feed holds many, so an
         exact-year match would throw away almost everything useful. */
      const vehicle = matches.reduce((best, v) =>
        Math.abs(v.year - y.year) < Math.abs(best.year - y.year) ? v : best,
      )
      out.push({
        vehicle,
        year: y.year,
        count: y.count,
        fobUsd: y.fobUsd,
        medianKm: y.medianKm,
        trailing: y.trailing,
        capturedOn: feed.capturedOn,
        source: feed.source,
      })
    }
  }
  return out
}

/**
 * How old the feed is, in days.
 *
 * Stock lists go stale fast — a count of three is a different fact a month
 * later — so anything reading this should say how old it is rather than
 * presenting it as current.
 */
export function ageInDays(capturedOn: string, now = new Date()): number {
  const then = new Date(`${capturedOn}T00:00:00Z`).getTime()
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000))
}
