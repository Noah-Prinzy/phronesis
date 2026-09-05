import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bubble, Button, Chip, IconButton } from '../ui'
import { Halo } from '../avatar/Halo'
import type { HaloState } from '../avatar/renderer'
import { useMicLevel } from '../avatar/useMicLevel'
import { useJourney } from '../app/journey'

/** The avatar canvas is always this size; docking is a pure CSS transform. */
const BASE = 132

interface Msg {
  id: number
  from: 'user' | 'assistant'
  text: string
  streaming?: boolean
}

/** A routing offer the assistant makes, rather than a jump it performs. */
interface RouteOffer {
  title: string
  note: string
  to: string
  cta: string
}

const OWNER_CHIPS = ["It's making a noise", 'Warning light', 'Is this safe to drive?']
const BUYER_CHIPS = ['What car under 20M?', 'Compare two cars', 'Is this price fair?']

export function Home() {
  const navigate = useNavigate()
  const { journey } = useJourney()
  const owner = journey !== 'buyer'

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [offer, setOffer] = useState<RouteOffer | null>(null)
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [micOn, setMicOn] = useState(false)

  const { levelRef, status: micStatus } = useMicLevel(micOn)

  const docked = msgs.length > 0
  const speaking = msgs.some((m) => m.streaming)

  const state: HaloState = thinking
    ? 'thinking'
    : speaking
      ? 'responding'
      : micOn
        ? 'listening'
        : 'idle'

  /* ---------------------------------------------------------------- docking
     The avatar lives in one absolutely-positioned layer and is moved between
     two measured slots. It is never re-parented, so it never remounts, and the
     target is measured at the moment of the move rather than latched ahead of
     time — which is exactly how V1's docking broke. */

  const stage = useRef<HTMLDivElement>(null)
  const heroSlot = useRef<HTMLDivElement>(null)
  const micSlot = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)

  const place = useCallback(function place() {
    const host = stage.current
    const el = layer.current
    const slot = docked ? micSlot.current : heroSlot.current
    if (!host || !el || !slot) return
    const s = slot.getBoundingClientRect()
    const h = host.getBoundingClientRect()
    // A zero-size target means layout has not settled. Retry on the next
    // frame rather than giving up — a silent bail here parks the avatar at
    // its previous position forever, which is precisely how this broke once.
    if (s.width === 0 || h.width === 0) {
      requestAnimationFrame(place)
      return
    }
    const scale = s.width / BASE
    const x = s.left - h.left + s.width / 2
    const y = s.top - h.top + s.height / 2
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale})`
  }, [docked])

  useLayoutEffect(() => {
    place()
    // Re-measure on anything that can move the slots: the keyboard opening,
    // the thread growing, an orientation change.
    const ro = new ResizeObserver(place)
    if (stage.current) ro.observe(stage.current)
    if (micSlot.current) ro.observe(micSlot.current)
    window.addEventListener('resize', place)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [place])

  /* ------------------------------------------------------------ the thread */

  const threadRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const t = threadRef.current
    if (t) t.scrollTop = t.scrollHeight
  }, [msgs, offer])

  const idRef = useRef(1)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  /**
   * Stands in for the assistant until step 4 wires the real one. It exists to
   * exercise the states the page has to render — thinking, streaming, and the
   * routing offer — not to be clever.
   */
  function send(text: string) {
    const body = text.trim()
    if (!body) return
    setDraft('')
    setOffer(null)
    setMicOn(false)
    const mine: Msg = { id: idRef.current++, from: 'user', text: body }
    setMsgs((m) => [...m, mine])
    setThinking(true)

    const reply = owner
      ? 'A rattle only under braking usually means the pads are worn down to the wear indicator — that metal tab is designed to make exactly that noise.'
      : 'Under 20M in Kampala, the honest shortlist is a Premio, a Fit and a Note. They differ mostly in running cost, not purchase price.'

    timers.current.push(
      window.setTimeout(() => {
        setThinking(false)
        const id = idRef.current++
        setMsgs((m) => [...m, { id, from: 'assistant', text: reply, streaming: true }])
        timers.current.push(
          window.setTimeout(() => {
            setMsgs((m) => m.map((x) => (x.id === id ? { ...x, streaming: false } : x)))
            setOffer(
              owner
                ? {
                    title: 'This looks like a brake fault.',
                    note: 'I can pull the live data and check the pads.',
                    to: '/diagnosis',
                    cta: 'Open Diagnosis',
                  }
                : {
                    title: 'I can line those three up.',
                    note: 'Specs, running costs and what they should cost here.',
                    to: '/compare',
                    cta: 'Open Compare',
                  },
            )
          }, 1400),
        )
      }, 900),
    )
  }

  const chips = owner ? OWNER_CHIPS : BUYER_CHIPS

  return (
    <main className="home" ref={stage}>
      <header className="home__bar">
        <span className="home__mark">PHRONESIS</span>
        <span className="home__car">{owner ? '2015 Premio' : 'Looking to buy'}</span>
      </header>

      {docked ? (
        <div className="home__thread" ref={threadRef}>
          {msgs.map((m) => (
            <Bubble key={m.id} from={m.from} streaming={m.streaming}>
              {m.text}
            </Bubble>
          ))}

          {thinking && (
            <p className="home__thinking" aria-live="polite">
              Thinking…
            </p>
          )}

          {offer && (
            <div className="offer">
              <div className="offer__head">
                <span className="offer__icon" aria-hidden="true">
                  <ClockIcon />
                </span>
                <span>
                  <span className="offer__title">{offer.title}</span>
                  <span className="offer__note">{offer.note}</span>
                </span>
              </div>
              <div className="offer__actions">
                <Button size="sm" onClick={() => navigate(offer.to)}>
                  {offer.cta}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOffer(null)}>
                  Not yet
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="home__hero">
          {/* Reserves the space the avatar occupies; the avatar itself lives
              in the layer below and is transformed onto this box. */}
          <div className="home__heroSlot" ref={heroSlot} style={{ width: BASE, height: BASE }} />
          <p className="home__prompt">
            {owner
              ? "What's going on with your car? Sounds, warning lights — describe it."
              : 'What are you looking for? Budget, use, anything you already like.'}
          </p>
          <div className="home__chips">
            {chips.map((c) => (
              <Chip key={c} onClick={() => send(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
      >
        <div
          className="composer__mic"
          ref={micSlot}
          style={{ width: docked ? 34 : 0, height: 34 }}
          aria-hidden="true"
        />
        <input
          className="composer__input"
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          placeholder={docked ? 'Message Phronesis…' : 'Describe it, or tap the orb'}
          aria-label="Message Phronesis"
        />
        <IconButton label="Send" variant="filled" type="submit" onClick={() => send(draft)}>
          <ArrowIcon />
        </IconButton>
      </form>

      {micStatus === 'blocked' && (
        <p className="home__micnote" role="status">
          I can&rsquo;t hear you — the microphone is blocked. You can still type.
        </p>
      )}
      {micStatus === 'unavailable' && (
        <p className="home__micnote" role="status">
          No microphone on this device. Typing works just as well.
        </p>
      )}

      {/* One avatar, one mount, moved by transform. */}
      <div className="home__layer" ref={layer}>
        <Halo
          size={BASE}
          state={state}
          levelRef={levelRef}
          onActivate={() => setMicOn((v) => !v)}
          label={micOn ? 'Turn the microphone off' : 'Turn the microphone on'}
        />
      </div>
    </main>
  )
}

/* -------------------------------------------------------------------- icons */

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}
