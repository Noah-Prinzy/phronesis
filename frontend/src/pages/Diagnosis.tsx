import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, TextArea } from '../ui'
import { CarHologram, type CarPart } from '../diagnosis/CarHologram'
import { carName, useCar } from '../app/car'
import { useAuth } from '../app/auth'
import { money } from '../lib/money'
import { runDiagnosis, type DiagnosisReport } from '../lib/api'

/**
 * Diagnosis: one page that tells the story of one car.
 *
 * The composition is deliberate and is the whole point. The car floats on the
 * surface with the fault marked ON it, and the findings float around it —
 * connected by a thread drawn from each card to the point it is talking about.
 * Four stacked cards would carry the same words; this arrangement says
 * "here, on your Premio, is the thing", which is what someone worried about a
 * noise actually wants to know.
 *
 * Nothing is boxed. On a dark ground a glowing diagram needs no stage, and a
 * panel around it would put the car in a container rather than in the room.
 */

/** Map the model's category onto a place on the car. */
function partFor(report: DiagnosisReport | null): CarPart | null {
  if (!report) return null
  const text = `${report.category} ${report.issue}`.toLowerCase()
  if (text.includes('brake')) return text.includes('rear') ? 'rear-brakes' : 'front-brakes'
  if (text.includes('battery') || text.includes('alternator')) return 'battery'
  if (text.includes('electric')) return 'battery'
  if (text.includes('transmission') || text.includes('clutch') || text.includes('gear')) return 'cabin'
  if (text.includes('engine') || text.includes('knock') || text.includes('fuel')) return 'engine'
  return 'engine'
}

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

export function Diagnosis() {
  const navigate = useNavigate()
  const { car } = useCar()
  const { getToken } = useAuth()

  const [symptom, setSymptom] = useState('')
  const [report, setReport] = useState<DiagnosisReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  const submit = useCallback(async () => {
    const text = symptom.trim()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    try {
      // The token is optional: an unauthenticated user still gets a diagnosis,
      // it simply is not saved to their history.
      const token = await getToken().catch(() => null)
      const result = await runDiagnosis(text, car, token)
      if (live.current) setReport(result)
    } catch {
      if (live.current) setError('She could not work that one out just now. Try again in a moment.')
    } finally {
      if (live.current) setBusy(false)
    }
  }, [symptom, busy, getToken, car])

  const part = partFor(report)
  const tone = report ? (TONE[report.urgencyLevel] ?? 'var(--warning)') : 'var(--accent)'
  const vehicle = carName(car) ?? 'your car'

  /* ------------------------------------------------------- nothing yet */
  if (!report) {
    return (
      <main id="main" className="page">
        <header className="page__head">
          <h1 className="page__title">Diagnosis</h1>
        </header>
        <div className="page__body dg dg--ask">
          <CarHologram vehicle={vehicle} className="dg__carIdle" />
          <div className="dg__askbox">
            <EmptyState
              title="What is it doing?"
              body="Describe the noise, the light, the smell, the feel — in your own words. She will ask about anything she needs."
            />
            <TextArea
              label="What is it doing?"
              placeholder="A rattle from the front, only when I brake…"
              rows={3}
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
              }}
            />
            {error ? <p className="dg__error">{error}</p> : null}
            <div className="dg__askActions">
              <Button onClick={() => void submit()} loading={busy} disabled={!symptom.trim()}>
                Work it out
              </Button>
              <Button variant="ghost" onClick={() => navigate('/home')}>
                Talk to her instead
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  /* --------------------------------------------------------- the story */
  const [first, second] = report.solutions

  return (
    <main id="main" className="page">
      <header className="page__head dg__head">
        <h1 className="page__title">{carName(car) ? `Your ${car?.model}` : 'Diagnosis'}</h1>
        <span className="dg__when num">
          from what you described · {new Date().toLocaleDateString()}
        </span>
      </header>

      <div className="page__body dg">
        {/* the thread: each card to the point on the car it is about */}
        <svg className="dg__thread" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M296 150 C 380 155, 400 250, 468 288" />
          <path d="M545 300 C 620 320, 645 235, 726 188" />
          <path d="M520 335 C 565 425, 645 400, 706 382" />
        </svg>

        <CarHologram focus={part} tone={tone} className="dg__car" />

        <article className="dg__float dg__float--verdict">
          <div className="dg__vtop">
            <span className="dg__chip" style={{ color: tone }}>
              <span className="dg__dot" />
              {URGENCY_WORD[report.urgencyLevel] ?? report.urgencyLevel}
            </span>
            <span className="dg__conf">
              <span className="dg__confbar">
                <i style={{ width: `${report.confidence}%` }} />
              </span>
              <span className="num dg__confnum">{report.confidence}%</span>
            </span>
          </div>
          <h2 className="dg__title">{report.issue}</h2>
          <p className="dg__body">{report.rootCause}</p>
        </article>

        {report.detectedCodes?.length ? (
          <aside className="dg__float dg__float--why">
            <span className="label">Codes she read</span>
            <p className="dg__body dg__body--tight">
              {report.detectedCodes.join(' · ')}
            </p>
          </aside>
        ) : (
          <aside className="dg__float dg__float--why">
            <span className="label">Why she thinks so</span>
            <p className="dg__body dg__body--tight">
              This is from what you told her, with no reader plugged in. Pair one and she
              reads the codes instead of inferring them.
            </p>
          </aside>
        )}

        <aside className="dg__float dg__float--cost">
          <div className="dg__costhead">
            <span className="label">What it should cost</span>
            <span className="num dg__timeline" style={{ color: tone }}>
              {report.timeline}
            </span>
          </div>
          {first ? (
            <div className="dg__opt">
              <span className="dg__optname">{first.option}</span>
              <span className="num dg__optcost">
                {money(first.costLow)} – {money(first.costHigh)}
              </span>
            </div>
          ) : null}
          {second ? (
            <div className="dg__opt">
              <span className="dg__optname">{second.option}</span>
              <span className="num dg__optcost">
                {money(second.costLow)} – {money(second.costHigh)}
              </span>
            </div>
          ) : null}
        </aside>

        <div className="dg__actions">
          <Button onClick={() => navigate('/maps')}>Find a mechanic</Button>
          <Button variant="secondary" onClick={() => navigate('/home')}>
            Ask her about this
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setReport(null)
              setSymptom('')
            }}
          >
            Something else
          </Button>
        </div>
      </div>
    </main>
  )
}
