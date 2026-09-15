import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, TextArea } from '../ui'
import type { CarPart } from '../diagnosis/CarHologram'
import { DiagnosisStage } from '../diagnosis/DiagnosisStage'
import { carName, useCar } from '../app/car'
import { bodyOfModel } from '../data/vehicles'
import { useHandover } from '../app/handover'
import { FollowUp } from '../diagnosis/FollowUp'
import { useAuth } from '../app/auth'
import { useAlerts } from '../app/alerts'
import { storeDiagnosis } from '../lib/userdata'
import { sendAlert } from '../lib/alerts'
import { money } from '../lib/money'
import { runDiagnosis, type DiagnosisReport, type WireAttachment } from '../lib/api'

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
  const { getToken, user } = useAuth()
  const { live } = useAlerts()

  const { pending, clear } = useHandover()

  const [symptom, setSymptom] = useState('')
  const [report, setReport] = useState<DiagnosisReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * Where he was pointing when he brought you here.
   *
   * It matters before the report lands. Without it the page has nothing to
   * aim at for the seconds the model is thinking, and he would arrive holding
   * nothing — so the hologram opens on the part he was already talking about
   * and the report only confirms it.
   */
  const [carried, setCarried] = useState<CarPart | null>(null)
  /** The conversation this page belongs to, carried in with the hand-off. */
  const [chatId, setChatId] = useState<string | undefined>(undefined)
  /** His answer to a follow-up, while he is giving it. */
  const [aside, setAside] = useState('')

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const submit = useCallback(async (input?: string, evidence?: WireAttachment[]) => {
    const text = (input ?? symptom).trim()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    try {
      // The token is optional: an unauthenticated user still gets a diagnosis,
      // it simply is not saved to their history.
      const token = await getToken().catch(() => null)
      const result = await runDiagnosis(text, car, token, undefined, evidence)
      if (!alive.current) return
      setReport(result)

      // Keep it, so there is a history — and so an alert has something to
      // fire from. Failing to save must not lose the diagnosis the user is
      // already looking at, so this never throws upward.
      if (user) void storeDiagnosis(user.uid, result, text).catch(() => {})

      // Tell them, if they asked to be told and it is worth telling.
      if (live('faultAlerts') && (result.urgencyLevel === 'critical' || result.urgencyLevel === 'high')) {
        sendAlert({
          key: `fault:${result.issue}`,
          title: result.urgencyLevel === 'critical' ? 'This needs attention now' : 'Worth fixing soon',
          body: `${result.issue} — ${result.timeline.toLowerCase()}.`,
          href: '/diagnosis',
        })
      }
    } catch (err) {
      if (!alive.current) return
      /* The server's own words when it refused an attachment — it says which
         one and why, and that is far more use than a generic failure. */
      setError(
        err instanceof Error && err.message && !err.message.startsWith('Diagnosis failed')
          ? err.message
          : 'He could not work that one out just now. Try again in a moment.',
      )
      // Let go of the hand-off on failure, so the page falls back to asking
      // rather than stranding somebody on a screen with no way forward. The
      // symptom is already in the box, so nobody retypes anything.
      setCarried(null)
    } finally {
      if (alive.current) setBusy(false)
    }
  }, [symptom, busy, getToken, car])

  /**
   * He brought you here, so the page does not ask you anything.
   *
   * You described the noise to him on Home; being handed a blank box that
   * says "What is it doing?" is the app forgetting a conversation you are
   * still in the middle of. The symptom travels, the work starts on arrival,
   * and the hologram is already aimed at the part he named.
   *
   * Cleared as it is read. A hand-off is something that just happened — left
   * in place it would re-run every time this page re-rendered.
   */
  useEffect(() => {
    if (!pending) return
    setCarried(pending.part)
    setChatId(pending.chatId)
    setSymptom(pending.symptom)
    void submit(pending.symptom, pending.attachments)
    clear()
    // `submit` is re-made whenever the draft changes; re-running this on that
    // would fire the diagnosis again mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  const part = partFor(report) ?? carried
  const tone = report ? (TONE[report.urgencyLevel] ?? 'var(--warning)') : 'var(--accent)'
  const vehicle = carName(car) ?? 'your car'

  /* ----------------------------------------------- he is working on it
     Arrived from a conversation and the model has not answered yet. The car
     is up, he is thinking over it, and nothing is asked — because nothing
     needs to be. */
  if (!report && (busy || carried)) {
    return (
      <main id="main" className="page">
        <header className="page__head">
          <h1 className="page__title">Diagnosis</h1>
        </header>
        <div className="page__body dg dg--work">
          <DiagnosisStage
            focus={carried}
            vehicle={vehicle}
            body={bodyOfModel(car?.model)}
            working={busy}
            className="dg__stageIdle"
          />
          {error ? <p className="dg__error">{error}</p> : null}
        </div>
      </main>
    )
  }

  /* ------------------------------------------------------- nothing yet */
  if (!report) {
    return (
      <main id="main" className="page">
        <header className="page__head">
          <h1 className="page__title">Diagnosis</h1>
        </header>
        <div className="page__body dg dg--ask">
          {/* Beat one, and it is the whole of this screen: the car IS the
              page, and he waits in the corner until there is something to
              say. No panel, no frame, nothing drawn around it. */}
          <DiagnosisStage
            focus={null}
            vehicle={vehicle}
            body={bodyOfModel(car?.model)}
            className="dg__stageIdle"
          />
          <div className="dg__askbox">
            <EmptyState
              title="What is it doing?"
              body="Describe the noise, the light, the smell, the feel — in your own words. He will ask about anything he needs."
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
                Talk to him instead
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
        {/* He takes it from here: the car, then him, then the part in his
            hand. Everything below is what the model actually worked out, and
            he does not read any of it back. */}
        <DiagnosisStage
          focus={part}
          tone={tone}
          vehicle={vehicle}
          body={bodyOfModel(car?.model)}
          confidence={report.confidence}
          aside={aside}
        />

        <div className="dg__detail">
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
            <span className="label">Codes he read</span>
            <p className="dg__body dg__body--tight">
              {report.detectedCodes.join(' · ')}
            </p>
          </aside>
        ) : (
          <aside className="dg__float dg__float--why">
            <span className="label">Why he thinks so</span>
            <p className="dg__body dg__body--tight">
              This is from what you told him, with no reader plugged in. Pair one and he
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

        </div>

        {/* Afterwards, never before. He has finished explaining; this is the
            turn coming back to you, in the same conversation he has been
            having with you since Home. */}
        <FollowUp
          chatId={chatId}
          context={`I have just shown them the ${report.issue} on their ${vehicle}. ${report.rootCause}`}
          onPart={setCarried}
          onReply={(text) => setAside(text)}
        />

        <div className="dg__actions">
          <Button onClick={() => navigate('/maps?find=garage')}>Find a mechanic</Button>
          <Button variant="secondary" onClick={() => navigate('/home')}>
            Ask him about this
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
