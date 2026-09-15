import { useEffect, useRef, useState } from 'react'
import { useRem } from '../app/useRootFontSize'
import { Halo } from '../avatar/Halo'
import { SpokenText } from '../ui/SpokenText'
import { useSpeak } from '../voice/useSpeak'
import { cx } from '../ui/cx'
import { CarHologram } from './CarHologram'
import { explain, opener, PART_NAME } from './lines'
import type { HologramHandle } from './HologramCanvas'
import type { Beat } from './hologramScene'
import type { CarPart } from '../data/findings'

/**
 * Diagnosis, as one move.
 *
 * The car is the page. When there is something to say Phronesis takes the
 * middle and the car goes out of his way; then he reaches into it, takes the
 * part out and holds it up while he talks about it. Three beats of one
 * sequence, and the order is the point — you are shown the thing rather than
 * told about it.
 *
 * **He is here at all because this page is his.** It rendered a verdict card
 * and a confidence bar and never spoke, on a page the plan has always listed
 * as his, minimised and still interactive. Everything fault-specific stays on
 * the cards below where the model wrote it; what he adds is the showing.
 *
 * The same sequence answers a question as answers a fault — ask what the
 * engine looks like and you land here, on `centre`, with `focus` set and
 * nothing wrong. Nothing below distinguishes the two cases, which is the
 * whole reason it can serve both.
 */

/** How long he holds the middle before reaching in. Long enough to land. */
const BEFORE_LIFT_MS = 900

/**
 * How big he is on each beat, in rem.
 *
 * Rem, not pixels, and that matters more than the numbers do. `html` is sized
 * fluidly, so every other orb in the app grows with the viewport through
 * `useRem` — these were hardcoded pixels, which is why he stayed a dot on a
 * large monitor while the car beside him filled the screen.
 */
const ORB_REM: Record<Beat, number> = { rest: 7, centre: 16, lift: 10 }

export interface DiagnosisStageProps {
  /** The part he is talking about. Null leaves the car whole and him quiet. */
  focus: CarPart | null
  /** Severity token, e.g. `var(--critical)`. */
  tone?: string
  vehicle?: string
  /** The car's body type, which picks one of the three profiles. */
  body?: string
  /** A number to show beside the part's name — the model's confidence. */
  confidence?: number
  /**
   * He is waiting on the model.
   *
   * Given its own flag rather than inferred from `focus` being set, because
   * the two are independent: he is brought here already pointing at a part
   * and THEN thinks about it. Without this the seconds between arriving and
   * the report landing are a page that looks finished and says nothing.
   */
  working?: boolean
  /**
   * Something he is saying now that is not part of the sequence — his answer
   * to a follow-up. It takes over the band his explanation was in, because
   * two things he is saying at once is nobody talking.
   */
  aside?: string
  className?: string
}

export function DiagnosisStage({
  focus,
  tone = 'var(--accent)',
  vehicle,
  body,
  confidence,
  working = false,
  aside,
  className,
}: DiagnosisStageProps) {
  const [beat, setBeat] = useState<Beat>('rest')
  const orbSize = useRem(ORB_REM[beat])
  const car = useRef<HologramHandle | null>(null)
  const { speak, talking, progress, line } = useSpeak()

  /**
   * The sequence runs itself once there is something to talk about.
   *
   * It is a real sequence rather than three states somebody clicks between:
   * he arrives, says what he has found, and only then reaches in. Starting
   * on `lift` would be a magic trick — the part already in his hand before
   * anyone knew he was holding anything.
   */
  useEffect(() => {
    if (!focus) {
      setBeat('rest')
      return
    }
    setBeat('centre')
    // Nothing is said while he is still working it out. He arrives, takes the
    // middle and thinks — saying "I have found it" before he has would be the
    // page talking rather than him.
    if (!working) speak(opener(focus))
    const t = window.setTimeout(() => setBeat('lift'), BEFORE_LIFT_MS)
    return () => window.clearTimeout(t)
    // `speak` is stable for the life of the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  /**
   * He answers a follow-up out loud, in the same voice and the same band.
   *
   * Only the finished text is spoken: the reply streams in token by token,
   * and starting the voice on every delta would restart him mid-word several
   * times a second.
   */
  const spokenAside = useRef('')
  useEffect(() => {
    if (!aside || aside === spokenAside.current) return
    const t = window.setTimeout(() => {
      spokenAside.current = aside
      speak(aside)
    }, 420)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aside])

  /** Once he is holding it, he says what it is. */
  useEffect(() => {
    if (beat !== 'lift' || !focus || working) return
    const t = window.setTimeout(() => speak(explain(focus)), 260)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, focus])

  const name = focus ? PART_NAME[focus] : null

  return (
    <section
      className={cx('stg', className)}
      data-beat={beat}
      aria-label={focus ? `Phronesis, showing you the ${name}` : 'Your car'}
    >
      <CarHologram
        focus={focus}
        tone={tone}
        vehicle={beat === 'rest' ? vehicle : undefined}
        body={body}
        beat={beat}
        handleRef={car}
        className="stg__car"
      />

      {/* The label on what he is holding. Docked above his hand rather than
          floating beside it: a panel that chases an object is a panel that
          never stops moving. */}
      {beat === 'lift' && name ? (
        <p className="stg__tag" style={{ color: tone }}>
          <span className="stg__dot" />
          {name}
          {typeof confidence === 'number' ? (
            <span className="stg__pct num">{confidence}%</span>
          ) : null}
        </p>
      ) : null}

      {/* Him. Small and out of the way until there is something to say, and
          a real control the whole time — tapping him is how you interrupt. */}
      <Halo
        size={orbSize}
        state={working ? 'thinking' : talking ? 'responding' : 'idle'}
        onActivate={() => car.current?.turn()}
        label={beat === 'lift' ? `Turn the ${name ?? 'part'} over` : 'Talk to Phronesis'}
        className="stg__orb"
      />

      {/* His words, arriving as he says them, in a band of their own. Never
          written across him and never across the part — and never the text
          from the cards below, which he is not going to read out. */}
      {line ? <SpokenText text={line} progress={progress} className="stg__said" /> : null}
    </section>
  )
}
