import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  Chip,
  EmptyState,
  PriceBand,
  ProConList,
  SectionHead,
  Tabs,
  TrendSparkline,
} from '../ui'
import { ComparisonTable } from '../precar/ComparisonTable'
import { money, moneyShort } from '../lib/money'
import { VEHICLES, vehicleById, vehicleName, type Vehicle } from '../data/vehicles'

/**
 * Compare · which one, and what it should cost.
 *
 * The pre-car twin of Solutions. There you see what a repair costs and who can
 * do it; here you see what a car costs and whether this one is priced fairly.
 *
 * **Market is a tab, not a sixth page.** A price only means anything next to a
 * specific car, so putting it beside the comparison rather than in the nav
 * keeps both journeys at five slots. The cost of that is that price-watching
 * never becomes a destination — if deal alerts turn out to be what brings
 * people back, Market earns its own slot and this gets revisited.
 *
 * **The shortlist lives in the URL** (`/compare?cars=premio-2015,axio-2016`),
 * which is what lets Phronesis drop somebody straight into a loaded
 * comparison after asking about budget and use in conversation. That was the
 * argument for not building a recommendations wizard: a form here would
 * compete with the assistant, which inverts the product's own case.
 */

/** Three columns is the limit. A fourth stops being readable on a phone. */
const MAX_CARS = 3

type View = 'specs' | 'market'

export function Compare() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>('specs')

  const chosen = useMemo(() => {
    const ids = (params.get('cars') ?? '').split(',').filter(Boolean)
    const out: Vehicle[] = []
    for (const id of ids) {
      const v = vehicleById(id)
      if (v && !out.some((x) => x.id === v.id)) out.push(v)
      if (out.length === MAX_CARS) break
    }
    return out
  }, [params])

  /** The car whose market and pros/cons are shown. The first one chosen. */
  const subject = chosen[0] ?? null

  function setCars(next: Vehicle[]) {
    if (next.length === 0) setParams({}, { replace: true })
    else setParams({ cars: next.map((v) => v.id).join(',') }, { replace: true })
  }

  function toggle(v: Vehicle) {
    const already = chosen.some((c) => c.id === v.id)
    if (already) setCars(chosen.filter((c) => c.id !== v.id))
    else if (chosen.length < MAX_CARS) setCars([...chosen, v])
  }

  const full = chosen.length >= MAX_CARS

  return (
    <main id="main" className="page">
      <header className="page__head">
        <h1 className="page__title">Compare</h1>
      </header>

      <div className="page__body cmp">
        <SectionHead>
          <span className="label">
            {chosen.length === 0
              ? 'Pick up to three'
              : `${chosen.length} of ${MAX_CARS}`}
          </span>
          {chosen.length > 0 && (
            <button type="button" className="linklike" onClick={() => setCars([])}>
              Clear
            </button>
          )}
        </SectionHead>

        <div className="cmp__picker" role="group" aria-label="Cars to compare">
          {VEHICLES.map((v) => {
            const on = chosen.some((c) => c.id === v.id)
            return (
              <Chip
                key={v.id}
                pressed={on}
                disabled={!on && full}
                onClick={() => toggle(v)}
              >
                {v.model} <span className="cmp__yr">{v.year}</span>
              </Chip>
            )
          })}
        </div>

        {chosen.length === 0 ? (
          <EmptyState
            title="Nothing to compare yet"
            body="Pick two or three above, or ask me what suits you and I will load them for you."
            action={
              <Button variant="secondary" onClick={() => navigate('/discover')}>
                Browse in Discover
              </Button>
            }
          />
        ) : (
          <>
            <Tabs
              label="Compare view"
              options={[
                { value: 'specs', label: 'Side by side' },
                { value: 'market', label: 'Market' },
              ]}
              value={view}
              onChange={setView}
            />

            {view === 'specs' ? (
              <>
                <ComparisonTable cars={chosen} />

                {subject && (
                  <section className="cmp__verdict" aria-label={`${vehicleName(subject)} in short`}>
                    <SectionHead>
                      <span className="label">{vehicleName(subject)} · in short</span>
                    </SectionHead>
                    <ProConList pros={subject.pros} cons={subject.cons} />
                  </section>
                )}
              </>
            ) : (
              <MarketView car={subject} />
            )}
          </>
        )}
      </div>
    </main>
  )
}

/**
 * What this model goes for.
 *
 * One car at a time on purpose: three overlapping price bands is a chart
 * nobody can read on a phone, and the question people actually have is "is
 * this one fairly priced", which is about a single car.
 */
function MarketView({ car }: { car: Vehicle | null }) {
  if (!car) return null

  const band = car.market
  if (!band) {
    return (
      <EmptyState
        title="No market data for this one"
        body="I have the specification but not what it sells for here. I will not guess at a price."
      />
    )
  }

  /* Three sources, three sentences, and the differences are the point. An
     import figure is deliberately the wordiest: it is the one a reader is
     most likely to mistake for something it is not. */
  const source =
    band.from.kind === 'listings'
      ? `From ${band.from.note}, ${band.from.capturedOn}.`
      : band.from.kind === 'import'
        ? `Export stock — ${band.from.note}, ${band.from.capturedOn}. Before shipping, duty and registration, so not what one costs here.`
        : `Illustrative figures — ${band.from.note}. Not a guide to what to pay.`

  const trend = band.trailingYearUgx
  const change =
    trend && trend.length > 1
      ? ((trend[trend.length - 1] - trend[0]) / trend[0]) * 100
      : null

  return (
    <div className="cmp__market">
      <SectionHead>
        <span className="label">{vehicleName(car)} · Kampala</span>
      </SectionHead>

      <PriceBand
        low={band.lowUgx}
        high={band.highUgx}
        average={band.averageUgx}
        mark={car.typicalAskingUgx}
        source={source}
        format={(n) => `${moneyShort(n)}`}
      />

      {trend && trend.length > 1 && (
        <section className="cmp__trend" aria-label="Twelve month trend">
          <SectionHead>
            <span className="label">Twelve months</span>
            {change !== null && (
              <span className="label">
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
            )}
          </SectionHead>
          <TrendSparkline
            values={trend}
            label={`Average price moved from ${money(trend[0])} to ${money(trend[trend.length - 1])} over twelve months.`}
          />
          <div className="cmp__trendends">
            <span>{moneyShort(trend[0])}</span>
            <span>{moneyShort(trend[trend.length - 1])}</span>
          </div>
        </section>
      )}

      {band.elsewhere && band.elsewhere.length > 0 && (
        <section className="cmp__region" aria-label="Other markets">
          <SectionHead>
            <span className="label">Same car, other markets</span>
          </SectionHead>
          <dl className="cmp__regionlist">
            {band.elsewhere.map((e) => (
              <div key={e.place} className="cmp__regionrow">
                <dt>{e.place}</dt>
                <dd>{moneyShort(e.averageUgx)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
