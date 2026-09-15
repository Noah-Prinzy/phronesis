import { describe, expect, it } from 'vitest'
import example from './marketImport.example.json'
import { ageInDays, parseMarketImport } from './marketImport'

/**
 * The importer's job is to refuse things.
 *
 * Most of these cases are a malformed feed being rejected, and that is the
 * point of the file: the dangerous failure is not a crash, it is a feed that
 * parses far enough to render a plausible wrong price. So every test below is
 * really the same test — does the bad number get in.
 */

/**
 * The published example, cloned so a case can corrupt exactly one field.
 *
 * Typed loosely on purpose: every test below writes a value the real schema
 * forbids, which is the whole point, and a type that allowed only valid feeds
 * would make the invalid cases unwritable.
 */
interface LooseFeed {
  source: string
  capturedOn: string
  currency: string
  basis: string
  totalListings: number
  models: Array<{
    make: string
    model: string
    years: Array<{
      year: number
      count: number
      fobUsd: { low: number; median: number; high: number }
      medianKm?: number
      trailing?: { fromMonth: string; medianUsd: number[] }
    }>
  }>
}

function feed(): LooseFeed {
  return structuredClone(example) as unknown as LooseFeed
}

describe('parseMarketImport', () => {
  it('accepts the published example', () => {
    expect(() => parseMarketImport(feed())).not.toThrow()
  })

  it('matches models we carry and drops the ones we do not', () => {
    const stock = parseMarketImport(feed())
    const models = stock.map((s) => s.vehicle.model)
    expect(models).toContain('Premio')
    expect(models).toContain('Harrier')
    // In the feed, not in our catalogue. Silence is the right answer.
    expect(models).not.toContain('Demio')
  })

  it('pins a feed year to the nearest year we carry', () => {
    const stock = parseMarketImport(feed())
    const premio = stock.filter((s) => s.vehicle.model === 'Premio')
    // Two feed years, 2015 and 2016, both against the one Premio we hold.
    expect(premio).toHaveLength(2)
    expect(premio.map((p) => p.year).toSorted()).toEqual([2015, 2016])
    expect(new Set(premio.map((p) => p.vehicle.id))).toEqual(new Set(['premio-2015']))
  })

  it('carries the capture date onto every row', () => {
    for (const row of parseMarketImport(feed())) {
      expect(row.capturedOn).toBe('2026-09-15')
    }
  })

  /* ------------------------------------------------------------ refusals */

  it('refuses a spread that is not ordered', () => {
    const bad = feed()
    // A median above the high: arithmetically impossible, and exactly what a
    // half-finished aggregation step produces.
    bad.models[0].years[0].fobUsd = { low: 3100, median: 9999, high: 6400 }
    expect(() => parseMarketImport(bad)).toThrow()
  })

  it('refuses a currency it was not told to expect', () => {
    const bad = feed()
    bad.currency = 'JPY'
    expect(() => parseMarketImport(bad)).toThrow()
  })

  it('refuses a basis that is not FOB', () => {
    const bad = feed()
    // CIF includes freight and insurance. It looks identical and is not.
    bad.basis = 'cif'
    expect(() => parseMarketImport(bad)).toThrow()
  })

  it('accepts a short but honest trailing series', () => {
    const ok = feed()
    // Three real months from a tracker that started in March. Fewer than the
    // twelve this once demanded, and worth more than twelve invented ones.
    ok.models[0].years[0].trailing = { fromMonth: '2026-03', medianUsd: [4100, 4180, 4250] }
    expect(() => parseMarketImport(ok)).not.toThrow()
  })

  it('refuses a single point as a trend', () => {
    const bad = feed()
    bad.models[0].years[0].trailing = { fromMonth: '2026-09', medianUsd: [4250] }
    expect(() => parseMarketImport(bad)).toThrow()
  })

  it('refuses a series that will not say when it starts', () => {
    const bad = feed()
    // Without the month, a chart cannot label the span and the reader
    // supplies their own assumption — usually "the last year".
    bad.models[0].years[0].trailing = { fromMonth: '2026-9', medianUsd: [4100, 4250] }
    expect(() => parseMarketImport(bad)).toThrow()
  })

  it('refuses a timestamp where a date belongs', () => {
    const bad = feed()
    bad.capturedOn = '2026-09-15T02:00:00Z'
    expect(() => parseMarketImport(bad)).toThrow()
  })

  it('refuses a zero count', () => {
    const bad = feed()
    // Nothing in stock is a row that should not have been emitted at all.
    bad.models[0].years[0].count = 0
    expect(() => parseMarketImport(bad)).toThrow()
  })
})

describe('ageInDays', () => {
  it('counts whole days since capture', () => {
    expect(ageInDays('2026-09-15', new Date('2026-09-15T12:00:00Z'))).toBe(0)
    expect(ageInDays('2026-09-15', new Date('2026-09-22T00:00:00Z'))).toBe(7)
  })

  it('never reports a negative age for a feed dated ahead of us', () => {
    expect(ageInDays('2026-12-01', new Date('2026-09-15T00:00:00Z'))).toBe(0)
  })
})
