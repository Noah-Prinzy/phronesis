import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, IconButton, SectionHead, Select, SeverityBadge, StarRating } from '../ui'
import { MechanicCard } from '../components/MechanicCard'
import { RepairOptionCard } from '../components/RepairOptionCard'
import { CostBreakdown } from '../components/CostBreakdown'
import { SOLUTIONS, sortMechanics } from '../data/solutions'
import type { SortKey } from '../data/solutions'
import { useMediaQuery } from '../app/useMediaQuery'

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'match', label: 'Best match' },
  { value: 'distance', label: 'Nearest' },
  { value: 'price', label: 'Cheapest' },
  { value: 'rating', label: 'Highest rated' },
]

/**
 * Solutions.
 *
 * Two decisions in order: what to have done, then who does it. Every price is
 * split into parts and labour, because a single total is the thing you get
 * quoted at the gate and cannot argue with.
 *
 * Which finding this answers arrives in the URL, so the page is linkable and
 * the back button behaves — `/solutions?finding=f1`.
 */
export function Solutions() {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 768px)')
  const [params, setParams] = useSearchParams()

  const findingId = params.get('finding') ?? 'f1'
  const set = SOLUTIONS[findingId]

  const [optionId, setOptionId] = useState(() => set?.options[0]?.id ?? '')
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('match')
  // Phone only: the page is two steps on a small screen, one on a large one.
  const [step, setStep] = useState<'options' | 'mechanics'>('options')

  const mechanics = useMemo(
    () => (set ? sortMechanics(set.mechanics, sort) : []),
    [set, sort],
  )
  const selectedMechanic = mechanics.find((m) => m.id === mechanicId) ?? null

  if (!set) {
    return (
      <main className="sol">
        <EmptyState
          title="Nothing to price yet"
          body="Run a diagnosis first and I will tell you what the fix should cost."
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate('/diagnosis')}>
              Open Diagnosis
            </Button>
          }
        />
      </main>
    )
  }

  const otherFindings = Object.values(SOLUTIONS).filter((s) => s.findingId !== findingId)

  const optionList = (
    <>
      <SectionHead>What to have done</SectionHead>
      {set.options.map((o) => (
        <RepairOptionCard
          key={o.id}
          option={o}
          selected={optionId === o.id}
          onSelect={setOptionId}
        />
      ))}
    </>
  )

  const sortControl = (
    <div className="sol__sort">
      <span className="sol__sortLabel">Sort</span>
      <Select
        label=""
        aria-label="Sort mechanics"
        value={sort}
        onChange={(e) => setSort(e.currentTarget.value as SortKey)}
        options={SORTS}
        className="sol__sortSelect"
      />
    </div>
  )

  const mechanicList = (
    <>
      {sortControl}
      {mechanics.map((m) => (
        <MechanicCard
          key={m.id}
          mechanic={m}
          selected={mechanicId === m.id}
          onSelect={(id) => setMechanicId(id === mechanicId ? null : id)}
          expandWhenSelected={!wide}
        />
      ))}
      <p className="sol__fine">
        Estimates, not quotes. A shop confirms once it has seen the car.
      </p>
    </>
  )

  /* --------------------------------------------------------------- desktop */
  if (wide) {
    return (
      <main className="sol sol--wide">
        <div className="sol__cols">
          <section className="sol__left">
            <header className="sol__head">
              <span className="sol__fault">{set.findingTitle}</span>
              <SeverityBadge level={findingId === 'f1' ? 'high' : 'warning'} />
            </header>
            <div className="sol__scroll">
              {optionList}
              <SectionHead>Who does it</SectionHead>
              {mechanicList}
            </div>
          </section>

          <section className="sol__right">
            {selectedMechanic ? (
              <>
                <div>
                  <h2 className="sol__mechName">{selectedMechanic.name}</h2>
                  <div className="sol__mechMeta">
                    <StarRating value={selectedMechanic.rating} label={selectedMechanic.name} />
                    <span>
                      {selectedMechanic.rating} · {selectedMechanic.reviews} reviews ·{' '}
                      {selectedMechanic.specialities.join(' & ')}
                    </span>
                  </div>
                </div>

                <CostBreakdown
                  parts={selectedMechanic.parts}
                  labour={selectedMechanic.labour}
                  labourHours={selectedMechanic.labourHours}
                  itemised
                />

                <div className="sol__contact">
                  <Button variant="secondary" size="sm">
                    Call
                  </Button>
                  <Button variant="secondary" size="sm">
                    Message
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate('/maps')}>
                    Directions
                  </Button>
                </div>

                <p className="sol__fine">
                  {selectedMechanic.distanceKm} km · about {selectedMechanic.etaMin} minutes away.
                </p>

                <div className="sol__cta">
                  <Button size="lg" wide>
                    Request a quote
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                title="Pick a mechanic"
                body="Choose one on the left and I will break the estimate down into parts and labour."
              />
            )}
          </section>
        </div>
      </main>
    )
  }

  /* ----------------------------------------------------------------- phone */
  return (
    <main className="sol">
      <header className="sol__bar">
        <IconButton
          label="Back"
          onClick={() => (step === 'mechanics' ? setStep('options') : navigate('/diagnosis'))}
        >
          <BackIcon />
        </IconButton>
        <span className="sol__title">SOLUTIONS</span>
        <span className="sol__barSpacer" />
      </header>

      <div className="sol__faultRow">
        <span className="sol__fault">{set.findingTitle}</span>
        <SeverityBadge level={findingId === 'f1' ? 'high' : 'warning'} />
      </div>

      <div className="sol__scroll">
        {step === 'options' ? (
          <>
            {optionList}
            {otherFindings.length > 0 && (
              <>
                <SectionHead>Also found</SectionHead>
                {otherFindings.map((o) => (
                  <button
                    key={o.findingId}
                    type="button"
                    className="sol__jump ph-pressable"
                    onClick={() => {
                      setParams({ finding: o.findingId })
                      setOptionId(SOLUTIONS[o.findingId].options[0].id)
                      setMechanicId(null)
                      setStep('options')
                    }}
                  >
                    {o.findingTitle}
                    <ChevronIcon />
                  </button>
                ))}
              </>
            )}
          </>
        ) : (
          mechanicList
        )}
      </div>

      <div className="sol__cta">
        {step === 'options' ? (
          <Button size="lg" wide onClick={() => setStep('mechanics')}>
            Find someone to do this
          </Button>
        ) : (
          <Button size="lg" wide disabled={!selectedMechanic}>
            {selectedMechanic ? `Request a quote from ${selectedMechanic.name}` : 'Pick a mechanic'}
          </Button>
        )}
      </div>
    </main>
  )
}

/* -------------------------------------------------------------------- icons */

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
