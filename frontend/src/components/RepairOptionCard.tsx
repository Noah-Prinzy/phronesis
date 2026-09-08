import { CardButton } from '../ui'
import { CostBreakdown } from './CostBreakdown'
import { money } from '../lib/money'
import type { RepairOption } from '../data/solutions'

export interface RepairOptionCardProps {
  option: RepairOption
  selected?: boolean
  onSelect?: (id: string) => void
}

export function RepairOptionCard({ option, selected, onSelect }: RepairOptionCardProps) {
  const total = option.parts + option.labour

  return (
    <CardButton
      selected={selected}
      onClick={() => onSelect?.(option.id)}
      className="opt"
      aria-label={`${option.title}, ${money(total)}`}
    >
      <span className="opt__top">
        <span className="opt__title">{option.title}</span>
        {option.recommended && (
          // Ember as an outline, never a fill behind a label.
          <span className="opt__flag">recommended</span>
        )}
        <span className="opt__total">{money(total)}</span>
      </span>

      <span className="opt__blurb">{option.blurb}</span>

      <CostBreakdown parts={option.parts} labour={option.labour} />
    </CardButton>
  )
}
