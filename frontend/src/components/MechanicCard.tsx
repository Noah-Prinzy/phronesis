import { CardButton, StarRating } from '../ui'
import { CostBreakdown } from './CostBreakdown'
import { money } from '../lib/money'
import type { Mechanic } from '../data/solutions'

export interface MechanicCardProps {
  mechanic: Mechanic
  selected?: boolean
  onSelect?: (id: string) => void
  /** Expands the itemised breakdown inside the card. Phone only. */
  expandWhenSelected?: boolean
}

export function MechanicCard({
  mechanic: m,
  selected,
  onSelect,
  expandWhenSelected = false,
}: MechanicCardProps) {
  const total = m.parts + m.labour

  return (
    <CardButton
      selected={selected}
      onClick={() => onSelect?.(m.id)}
      className="mech"
      aria-label={`${m.name}, ${m.rating} stars, ${money(total)}`}
    >
      <span className="mech__top">
        <span className="mech__name">{m.name}</span>
        <span className="mech__dist">{m.distanceKm} km</span>
      </span>

      <span className="mech__rating">
        <StarRating value={m.rating} label={`${m.name} rating`} />
        <span className="mech__reviews">
          {m.rating} · {m.reviews} reviews
        </span>
      </span>

      <span className="mech__chips">
        {/* Static tags, not Chips. A Chip is a <button>, and the card is
            already a button — nesting them is invalid markup and gives a
            screen reader two controls where there is one. */}
        {m.specialities.map((s) => (
          <span key={s} className="tag">
            {s}
          </span>
        ))}
        {/* "Open now" is a fact about this moment, not a speciality — it reads
            as one if it sits in the same row unlabelled, so it is dimmed. */}
        <span className={m.openNow ? 'mech__open' : 'mech__closed'}>
          {m.openNow ? 'Open now' : 'Closed'}
        </span>
      </span>

      {expandWhenSelected && selected ? (
        <span className="mech__detail">
          <CostBreakdown
            parts={m.parts}
            labour={m.labour}
            labourHours={m.labourHours}
            itemised
          />
        </span>
      ) : (
        <span className="mech__estimate">
          <span className="mech__total">{money(total)}</span>
          <span className="mech__caption">estimate</span>
        </span>
      )}
    </CardButton>
  )
}
