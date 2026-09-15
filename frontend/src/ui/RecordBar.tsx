import { useEffect, useRef } from 'react'
import { IconCheck, IconClose } from './icons'

/**
 * Recording, drawn across the composer.
 *
 * It takes the whole box rather than sitting in it as a chip, and that is the
 * point: while the microphone is open, sending a message is not what you are
 * doing, so the thing you use to send messages should not still be offering
 * to. Cancel on one side, keep on the other, and the sound itself in between.
 *
 * **The waveform is the confirmation.** A timer counting up proves only that
 * a clock is running — it looks identical whether the microphone is picking
 * anything up or is muted at the OS level. Bars that move when you speak are
 * the only honest evidence that the thing being recorded is you.
 */

/** How many bars fit the strip. Enough to read as a waveform, few enough to
    stay legible on a phone. */
const SLOTS = 56

export interface RecordBarProps {
  /** Live amplitude, 0–1, pushed in as it arrives. */
  levels: number[]
  seconds: number
  onCancel: () => void
  onKeep: () => void
}

export function RecordBar({ levels, seconds, onCancel, onKeep }: RecordBarProps) {
  const endRef = useRef<HTMLDivElement>(null)

  /* Newest at the right, so it fills the way a recording runs. */
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', inline: 'end' })
  }, [levels.length])

  const shown = levels.slice(-SLOTS)
  const empty = Math.max(0, SLOTS - shown.length)

  return (
    <div className="rec" role="group" aria-label={`Recording, ${seconds} seconds`}>
      <button type="button" className="rec__x" onClick={onCancel} aria-label="Discard this recording">
        <IconClose />
      </button>

      <div className="rec__wave" aria-hidden="true">
        {/* Slots not yet reached read as a dotted rule, so the strip has its
            full width from the first frame and nothing reflows as it fills. */}
        {Array.from({ length: empty }, (_, i) => (
          <i key={`e${i}`} className="rec__dot" />
        ))}
        {shown.map((level, i) => (
          <i key={`b${i}`} className="rec__bar" style={{ height: `${8 + level * 92}%` }} />
        ))}
        <div ref={endRef} />
      </div>

      <span className="rec__time num">{seconds}s</span>

      <button type="button" className="rec__ok" onClick={onKeep} aria-label="Keep this recording">
        <IconCheck />
      </button>
    </div>
  )
}
