import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState } from '../ui'
import { useAuth } from '../app/auth'
import { carName, useCar } from '../app/car'
import { money } from '../lib/money'
import { loadDiagnoses, type StoredDiagnosis } from '../lib/userdata'
import type { DiagnosisSolution } from '../lib/api'

/**
 * Solutions: what it takes to fix the thing she found.
 *
 * Diagnosis says what is wrong. This says what to do about it and what it
 * should cost — and it is the page that decides whether someone gets
 * overcharged, which is most of why this app exists.
 *
 * Every number here comes from a diagnosis she actually produced and saved.
 * There are no invented mechanics and no invented prices: the shop list lives
 * on the Map, where it needs real data, and a fabricated garage is someone
 * driving across Kampala to a business that does not exist.
 */

const TONE: Record<string, string> = {
  critical: 'var(--critical)',
  high: 'var(--high)',
  medium: 'var(--warning)',
  low: 'var(--clear)',
}

const URGENCY_WORD: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Worth doing',
  low: 'Can wait',
}

/**
 * Which option she is actually recommending.
 *
 * The cheapest is the right default: her second option is almost always the
 * "if it turns out worse" one, and steering someone toward the dearer repair
 * before anyone has looked at the car is the exact behaviour this app exists
 * to protect them from. Exactly one is ever marked — "recommended" appearing
 * twice is not a recommendation.
 */
function pickOf(solutions: DiagnosisSolution[]): number {
  if (solutions.length === 0) return -1
  let best = 0
  for (let i = 1; i < solutions.length; i++) {
    if (solutions[i].costLow < solutions[best].costLow) best = i
  }
  return best
}

function hasSplit(s: DiagnosisSolution): boolean {
  return s.partsLow !== undefined && s.labourLow !== undefined
}

export function Solutions() {
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const { car } = useCar()

  const [report, setReport] = useState<StoredDiagnosis | null>(null)
  const [loading, setLoading] = useState(true)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (status !== 'signedIn' || !user) {
      setLoading(false)
      return
    }
    void loadDiagnoses(user.uid)
      .then((all) => {
        // The most recent one. Older reports are history, and history belongs
        // on Diagnosis rather than here.
        if (alive.current) setReport(all[0] ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (alive.current) setLoading(false)
      })
  }, [status, user])

  if (loading) {
    return (
      <main id="main" className="page">
        <header className="page__head">
          <h1 className="page__title">Fix</h1>
        </header>
        <div className="page__body sol sol--empty">
          <p className="sol__loading">Looking up what she found…</p>
        </div>
      </main>
    )
  }

  /* ------------------------------------------------- nothing to fix yet */
  if (!report) {
    return (
      <main id="main" className="page">
        <header className="page__head">
          <h1 className="page__title">Fix</h1>
        </header>
        <div className="page__body sol sol--empty">
          <EmptyState
            title="Nothing to price yet"
            body={
              status === 'signedIn'
                ? 'Once she has worked out what is wrong, this is where you will see what it takes to put right — and what it should cost.'
                : 'Sign in and she will keep what she finds, so you can come back to the costs later.'
            }
            action={
              <Button onClick={() => navigate(status === 'signedIn' ? '/diagnosis' : '/join')}>
                {status === 'signedIn' ? 'Tell her what it is doing' : 'Sign in'}
              </Button>
            }
          />
        </div>
      </main>
    )
  }

  const tone = TONE[report.urgencyLevel] ?? 'var(--warning)'
  const pick = pickOf(report.solutions)
  const anySplit = report.solutions.some(hasSplit)

  return (
    <main id="main" className="page">
      <header className="page__head sol__head">
        <h1 className="page__title">What it takes to fix</h1>
        <span className="sol__from num">
          {carName(car) ?? 'Your car'} · {new Date(report.at).toLocaleDateString()}
        </span>
      </header>

      <div className="page__body sol">
        {/* Carried across, so the page is never a set of prices for a problem
            the reader cannot see stated. */}
        <button type="button" className="sol__carry" onClick={() => navigate('/diagnosis')}>
          <span className="sol__chip" style={{ color: tone }}>
            <span className="sol__dot" />
            {URGENCY_WORD[report.urgencyLevel] ?? report.urgencyLevel}
          </span>
          <span className="sol__carrymain">
            <span className="sol__carryname">{report.issue}</span>
            <span className="sol__carrysub">
              She was {report.confidence}% sure · {report.timeline.toLowerCase()}
            </span>
          </span>
          <span className="sol__link">See the diagnosis ›</span>
        </button>

        <h2 className="label">
          {report.solutions.length === 1
            ? 'What it takes'
            : `${report.solutions.length === 2 ? 'Two' : report.solutions.length} ways to do it`}
        </h2>

        <div className="sol__opts" data-count={report.solutions.length}>
          {report.solutions.map((s, i) => (
            <article key={s.option} className="sol__opt" data-pick={i === pick || undefined}>
              {i === pick && report.solutions.length > 1 ? (
                <span className="sol__pickflag">Her pick</span>
              ) : null}
              <h3 className="sol__optname">{s.option}</h3>

              <div className="sol__money">
                {hasSplit(s) ? (
                  <>
                    <div className="sol__row">
                      <span>Parts</span>
                      <span className="num">
                        {(s.partsLow ?? 0).toLocaleString()} – {(s.partsHigh ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="sol__row">
                      <span>Labour</span>
                      <span className="num">
                        {(s.labourLow ?? 0).toLocaleString()} – {(s.labourHigh ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <Split parts={s.partsHigh ?? 0} labour={s.labourHigh ?? 0} />
                  </>
                ) : null}
                <div className="sol__row sol__total">
                  <span>Total</span>
                  <span className="num">
                    {money(s.costLow)} – {money(s.costHigh)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {anySplit ? (
          <div className="sol__key">
            <span className="sol__keyitem">
              <span className="sol__sw" style={{ background: 'var(--accent-fill)' }} />
              Parts
            </span>
            <span className="sol__keyitem">
              <span className="sol__sw" style={{ background: 'var(--edge)' }} />
              Labour
            </span>
            <span className="sol__keynote">
              A range, because nobody can quote exactly without seeing the car.
            </span>
          </div>
        ) : null}

        <div className="sol__actions">
          <Button onClick={() => navigate('/maps')}>Find someone to do it</Button>
          <Button variant="secondary" onClick={() => navigate('/home')}>
            Ask her which one
          </Button>
        </div>

        {/* The most Phronesis thing on the page: not the price, but knowing
            what to ask so the price can be checked. */}
        <p className="sol__advice">
          <b>What to say at the garage.</b> Ask them to show you the worn part before any work
          starts, and if a quote is above the range here, ask which of it is parts and which is
          labour. That one question is usually the whole difference.
        </p>
      </div>
    </main>
  )
}

/**
 * The split as a bar. Drawn from the HIGH ends, because that is the quote
 * someone is most likely to be handed and the one worth being ready for.
 */
function Split({ parts, labour }: { parts: number; labour: number }) {
  const total = parts + labour
  if (total <= 0) return null
  const partsPct = Math.round((parts / total) * 100)
  return (
    <div
      className="sol__bar"
      role="img"
      aria-label={`${partsPct}% parts, ${100 - partsPct}% labour`}
    >
      <i style={{ width: `${partsPct}%`, background: 'var(--accent-fill)' }} />
      <i style={{ width: `${100 - partsPct}%`, background: 'var(--edge)' }} />
    </div>
  )
}
