import { CardButton, Meter, SeverityBadge } from '../ui'
import type { Finding } from '../data/findings'

export interface FindingCardProps {
  finding: Finding
  selected?: boolean
  onSelect?: (id: string) => void
  /** Phone cards stay terse; the desktop panel has room for the explanation. */
  showExplanation?: boolean
}

/**
 * One diagnostic finding.
 *
 * The code is shown but never leads — a user who wanted to read `C1201` would
 * not need us. The plain-language line is the finding; the code is provenance
 * for whoever ends up doing the work.
 */
export function FindingCard({
  finding,
  selected,
  onSelect,
  showExplanation = false,
}: FindingCardProps) {
  return (
    <CardButton
      selected={selected}
      onClick={() => onSelect?.(finding.id)}
      className="finding"
      aria-label={`${finding.title}, ${finding.severity}`}
    >
      <span className="finding__top">
        <span className="finding__title">{finding.title}</span>
        {finding.code && <span className="finding__code">{finding.code}</span>}
        <SeverityBadge level={finding.severity} />
      </span>

      {showExplanation && <span className="finding__explain">{finding.explain}</span>}

      <Meter value={finding.confidence} label={`Confidence in ${finding.title}`} />
      <span className="finding__foot">
        <span>confidence</span>
        <span>{Math.round(finding.confidence * 100)}%</span>
      </span>
    </CardButton>
  )
}
