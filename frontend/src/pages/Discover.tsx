import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, EmptyState, SearchField, SectionHead, Slider, Spec, SpecList } from '../ui'
import { CarProfile } from '../precar/CarProfile'
import { VehicleCard } from '../precar/VehicleCard'
import { money, moneyShort } from '../lib/money'
import {
  BODY_TYPES,
  DRIVE_LABEL,
  PARTS_LABEL,
  VEHICLES,
  vehicleName,
  type BodyType,
  type Vehicle,
} from '../data/vehicles'

/**
 * Discover · what exists.
 *
 * The pre-car twin of Diagnosis, and the parallel is exact: there you work out
 * what is wrong with the car you have, here you work out what the car you are
 * considering actually is. Same slot in the nav, same shape on the page — a
 * list narrowed by a few controls, then one thing examined closely.
 *
 * **No colour anywhere.** Nothing on this page is critical and nothing is a
 * warning, so red and amber never appear — the rule the rest of the app keeps
 * is that those two mean safety, and a car being expensive is not a safety
 * matter. Where something is better than something else, Compare says so with
 * a dot.
 *
 * **The figures are the honest part.** Specs come from the manufacturer and
 * fuel consumption is their own cycle, which is why the row says "claimed" —
 * a number nobody achieves on Jinja Road should not be presented as a
 * promise. See `data/vehicles.ts` for what is sourced and what is not.
 */

/** The top of the budget slider. Above this you are not shopping here. */
const BUDGET_CEILING = 120_000_000
const BUDGET_STEP = 2_500_000

export function Discover() {
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [body, setBody] = useState<BodyType | null>(null)
  const [budget, setBudget] = useState(BUDGET_CEILING)
  const [openId, setOpenId] = useState<string | null>(VEHICLES[0]?.id ?? null)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return VEHICLES.filter((v) => {
      if (body && v.body !== body) return false
      if (v.typicalAskingUgx > budget) return false
      if (!needle) return true
      return `${v.make} ${v.model} ${v.year}`.toLowerCase().includes(needle)
    })
  }, [query, body, budget])

  // Whatever is open must be something still on screen, or the detail panel
  // describes a car the list no longer offers.
  const open: Vehicle | null =
    matches.find((v) => v.id === openId) ?? matches[0] ?? null

  const filtered = body !== null || budget < BUDGET_CEILING || query.trim() !== ''

  function clear() {
    setQuery('')
    setBody(null)
    setBudget(BUDGET_CEILING)
  }

  return (
    <main id="main" className="page">
      <header className="page__head">
        <h1 className="page__title">Discover</h1>
      </header>

      <div className="page__body dsc">
        <SearchField
          label="Search"
          placeholder="Make, model or year"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />

        <div className="dsc__kinds" role="group" aria-label="Body type">
          {BODY_TYPES.map((t) => (
            <Chip
              key={t.key}
              pressed={body === t.key}
              onClick={() => setBody(body === t.key ? null : t.key)}
            >
              {t.label}
            </Chip>
          ))}
        </div>

        <Slider
          label="Budget"
          valueLabel={
            budget >= BUDGET_CEILING ? 'any price' : `up to ${moneyShort(budget)} UGX`
          }
          min={10_000_000}
          max={BUDGET_CEILING}
          step={BUDGET_STEP}
          value={budget}
          onChange={(e) => setBudget(Number(e.currentTarget.value))}
        />

        <SectionHead>
          <span className="label">
            {matches.length} {matches.length === 1 ? 'model' : 'models'}
          </span>
          {filtered && (
            <button type="button" className="linklike" onClick={clear}>
              Clear
            </button>
          )}
        </SectionHead>

        {matches.length === 0 ? (
          <EmptyState
            title="Nothing in that range"
            body="Widen the budget or drop the body type and I will show you what there is."
          />
        ) : (
          <div className="dsc__cards">
            {matches.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                selected={open?.id === v.id}
                onSelect={() => setOpenId(v.id)}
              />
            ))}
          </div>
        )}

        {open && (
          <section className="dsc__detail" aria-label={`${vehicleName(open)} specification`}>
            <div className="dsc__stage">
              <CarProfile body={open.body} />
            </div>

            <div className="dsc__headline">
              <h2 className="dsc__name">
                {vehicleName(open)} <span>{open.year}</span>
              </h2>
              <p className="dsc__asking">{money(open.typicalAskingUgx)}</p>
            </div>

            <span className="label">Specification</span>
            <SpecList className="dsc__spec">
              <Spec label="Engine" value={`${open.engineL.toFixed(1)} L ${open.engineCode}`} />
              <Spec label="Transmission" value={open.transmission} />
              <Spec label="Drive" value={DRIVE_LABEL[open.drive]} />
              <Spec label="Fuel use, claimed" value={`${open.fuelClaimedKmPerL.toFixed(1)} km/L`} />
              <Spec label="Tank" value={`${open.tankL} L`} />
              <Spec label="Seats" value={String(open.seats)} />
              {open.bootL && <Spec label="Boot" value={`${open.bootL} L`} />}
              <Spec label="Length" value={`${open.lengthMm.toLocaleString('en-UG')} mm`} />
              <Spec label="Built in" value={open.builtIn} />
              <Spec label="Parts here" value={PARTS_LABEL[open.partsHere]} />
            </SpecList>

            <p className="dsc__caveat">
              Fuel use is the manufacturer&rsquo;s figure. Expect less on Ugandan roads.
            </p>

            <div className="dsc__actions">
              <Button
                variant="primary"
                wide
                onClick={() => navigate(`/compare?cars=${open.id}`)}
              >
                Compare this
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
