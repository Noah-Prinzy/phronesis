import { SplitBar } from '../ui'
import { money, moneyShort } from '../lib/money'

export interface CostBreakdownProps {
  parts: number
  labour: number
  labourHours?: number
  /** Itemised rows instead of a single bar. For the detail panel. */
  itemised?: boolean
  partsLabel?: string
}

/**
 * Parts versus labour, always split.
 *
 * A single total is what a user gets quoted at the gate and has no way to
 * argue with. Showing the two halves is the page's whole reason to exist: it
 * is the difference between "UGX 280,000" and knowing that 150,000 of it is
 * two hours of someone's time.
 */
export function CostBreakdown({
  parts,
  labour,
  labourHours,
  itemised = false,
  partsLabel = 'Parts',
}: CostBreakdownProps) {
  const total = parts + labour

  if (itemised) {
    return (
      <div className="cost">
        <div className="cost__row">
          <span className="cost__key">{partsLabel}</span>
          <span className="cost__val">{money(parts)}</span>
        </div>
        <div className="cost__row">
          <span className="cost__key">
            Labour{labourHours ? ` · ${labourHours} ${labourHours === 1 ? 'hour' : 'hours'}` : ''}
          </span>
          <span className="cost__val">{money(labour)}</span>
        </div>
        <div className="cost__row cost__row--total">
          <span className="cost__key">Estimate</span>
          <span className="cost__val cost__val--total">{money(total)}</span>
        </div>
        <SplitBar segments={[{ value: parts }, { value: labour, tone: 'dim' }]} />
        <div className="cost__foot">
          <span>parts {moneyShort(parts)}</span>
          <span>labour {moneyShort(labour)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="cost">
      <SplitBar segments={[{ value: parts }, { value: labour, tone: 'dim' }]} />
      <div className="cost__foot">
        <span>parts {moneyShort(parts)}</span>
        <span>labour {moneyShort(labour)}</span>
      </div>
    </div>
  )
}
