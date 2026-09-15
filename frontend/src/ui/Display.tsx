import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

/* --------------------------------------------------------------------- chip */

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  /** Present ⇒ the chip is a filter toggle. Absent ⇒ it is a plain action. */
  pressed?: boolean
  icon?: ReactNode
}

export function Chip({ pressed, icon, className, children, ...rest }: ChipProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-pressed={pressed}
      className={cx('ph-chip', className)}
    >
      {icon}
      {children}
    </button>
  )
}

/* ----------------------------------------------------------------- severity */

/**
 * The only hue in the product, and only where safety is at stake.
 * `clear` and `routine` are deliberately colourless — "nothing wrong" is the
 * app's default state, and spending a hue on it would make the palette shout
 * about the ordinary.
 */
export type Severity = 'critical' | 'high' | 'warning' | 'routine' | 'clear'

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  warning: 'Warning',
  routine: 'Routine',
  clear: 'Nothing wrong',
}

export function SeverityBadge({
  level,
  children,
  className,
}: {
  level: Severity
  children?: ReactNode
  className?: string
}) {
  return (
    <span data-level={level} className={cx('ph-sev', className)}>
      <span className="ph-sev__dot" />
      {children ?? SEVERITY_LABEL[level]}
    </span>
  )
}

/* -------------------------------------------------------------- star rating */

export interface StarRatingProps {
  /** 0–5. Rounded to the nearest whole star when read-only. */
  value: number
  /** Supply to make it an input. */
  onChange?: (value: number) => void
  count?: number
  className?: string
  label?: string
}

export function StarRating({
  value,
  onChange,
  count = 5,
  label = 'Rating',
  className,
}: StarRatingProps) {
  const filled = Math.round(Math.min(count, Math.max(0, value)))

  if (!onChange) {
    return (
      <span className={cx('ph-stars', className)} aria-label={`${label}: ${value} of ${count}`}>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={i < filled ? undefined : 'ph-stars__off'} aria-hidden="true">
            <Star />
          </span>
        ))}
      </span>
    )
  }

  return (
    <span className={cx('ph-stars', className)} role="radiogroup" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={i + 1 === filled}
          aria-label={`${i + 1} of ${count}`}
          className={i < filled ? undefined : 'ph-stars__off'}
          onClick={() => onChange(i + 1)}
        >
          <Star />
        </button>
      ))}
    </span>
  )
}

/** Drawn rather than typed: the ★ glyph's weight is the font's decision, and
    it never matched the rest of the icon set. */
function Star() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.4 14.9 9.3l6.5.95-4.7 4.58 1.11 6.47L12 18.24l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95z" />
    </svg>
  )
}

/* --------------------------------------------------------------------- card */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean
}

export function Card({ selected, className, children, ...rest }: CardProps) {
  return (
    <div {...rest} data-selected={selected || undefined} className={cx('ph-card', className)}>
      {children}
    </div>
  )
}

export interface CardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
}

/** A card that is itself the control — a vehicle, a mechanic, a choice. */
export function CardButton({ selected, className, children, ...rest }: CardButtonProps) {
  return (
    <button
      {...rest}
      type="button"
      data-interactive="true"
      data-selected={selected || undefined}
      aria-pressed={selected}
      className={cx('ph-card', className)}
    >
      {children}
    </button>
  )
}

/* -------------------------------------------------------------- sheet, etc. */

export function Sheet({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx('ph-sheet', className)}>
      <div className="ph-sheet__grip" />
      {children}
    </div>
  )
}

export function Divider({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cx('ph-divider', className)} data-label={Boolean(children)} role="separator">
      {children}
    </div>
  )
}

export function SectionHead({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('ph-sechead', className)}>{children}</div>
}

/* ---------------------------------------------------------------- list rows */

export function Group({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx('ph-group', className)}>
      {children}
    </div>
  )
}

export interface RowProps {
  label: ReactNode
  sub?: ReactNode
  value?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  className?: string
}

export function Row({ label, sub, value, trailing, onClick, className }: RowProps) {
  const content = (
    <>
      <span className="ph-row__label">
        {label}
        {sub && <span className="ph-row__sub">{sub}</span>}
      </span>
      {value && <span className="ph-row__value">{value}</span>}
      {trailing}
    </>
  )

  if (!onClick) {
    return <div className={cx('ph-row', className)}>{content}</div>
  }
  return (
    <button
      type="button"
      onClick={onClick}
      data-interactive="true"
      className={cx('ph-row', className)}
    >
      {content}
    </button>
  )
}

/* ----------------------------------------------------------------- spec row */

export function Spec({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="ph-spec">
      <dt className="ph-spec__key">{label}</dt>
      <dd className="ph-spec__val">{value}</dd>
    </div>
  )
}

/**
 * Children are OPTIONAL, and that is not laziness.
 *
 * "No specification yet" is a state this reaches — a vehicle whose data has
 * not loaded, a diagnosis with nothing to list — and requiring children made
 * it unrepresentable, so a caller in that position had to either render
 * nothing or invent a row. Found by the stress bench in the styleguide, which
 * is what it is for.
 */
export function SpecList({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <dl className={className} style={{ margin: 0 }}>
      {children}
    </dl>
  )
}

/* ------------------------------------------------------------------ bubbles */

export interface BubbleProps {
  from: 'user' | 'assistant'
  /** Renders the blinking caret while a reply is still arriving. */
  streaming?: boolean
  children: ReactNode
  className?: string
}

export function Bubble({ from, streaming, children, className }: BubbleProps) {
  return (
    <div data-from={from} className={cx('ph-bubble', className)}>
      {/* Only they are labelled. Once the fills and borders came off, a short
          line ranged right — "Go on then" — stopped being obviously theirs;
          he needs no label because he is the one at reading size in full ink.
          A run of consecutive messages shows it once: see the sibling rule in
          atoms.css, which hides it on every message after the first. */}
      {from === 'user' && <span className="ph-bubble__who">You</span>}
      {children}
      {streaming && <span className="ph-bubble__caret" aria-hidden="true" />}
    </div>
  )
}

/* --------------------------------------------------------------- pro / con */

/**
 * Reasons for and against, told by brightness rather than hue.
 *
 * The pre-car journey has no colour: nothing here is critical and nothing is a
 * warning, so green-for-good and red-for-bad would be the first crack in a
 * rule the rest of the system keeps — red and amber exist in Phronesis only
 * where safety is at stake. A filled dot is a point for, a hollow one a point
 * against, and the distinction survives greyscale and colour blindness both.
 */
export function ProConList({
  pros,
  cons,
  className,
}: {
  pros: string[]
  cons: string[]
  className?: string
}) {
  return (
    <div className={cx('ph-procon', className)}>
      <ul className="ph-procon__col" aria-label="In its favour">
        {pros.map((p) => (
          <li key={p} className="ph-procon__item">
            <span className="ph-procon__dot" data-kind="pro" aria-hidden="true" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <ul className="ph-procon__col" aria-label="Against it">
        {cons.map((c) => (
          <li key={c} className="ph-procon__item">
            <span className="ph-procon__dot" data-kind="con" aria-hidden="true" />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------- price band */

/** Keeps a marker inside its track when a figure sits outside the band. */
function clamp(n: number): number {
  return Math.min(100, Math.max(0, n))
}

export interface PriceBandProps {
  low: number
  high: number
  average: number
  /** Where this particular car sits. Omit and only the band is drawn. */
  mark?: number
  /** Rendered under the band. A band with no stated source is not shippable. */
  source: string
  /** Formats an amount for the end labels. */
  format: (amount: number) => string
  className?: string
}

/**
 * What a model costs, as a position rather than a verdict.
 *
 * A good price is a place on a range, not a colour — so the range is the
 * monochrome ramp the rest of the system already uses, the average is a
 * hairline, and the only lit thing is where this car falls. Saying "good deal"
 * in green would be the app making a judgement it cannot support from listing
 * spread alone.
 *
 * `source` is not optional, and it is not decoration. These numbers age, and a
 * price band with no provenance is worse than no band at all.
 */
export function PriceBand({
  low,
  high,
  average,
  mark,
  source,
  format,
  className,
}: PriceBandProps) {
  const span = high - low
  const at = (value: number) => (span <= 0 ? 50 : ((value - low) / span) * 100)

  const summary =
    mark === undefined
      ? `Market runs from ${format(low)} to ${format(high)}, averaging ${format(average)}.`
      : `This one is ${format(mark)}, against an average of ${format(average)} in a range from ${format(low)} to ${format(high)}.`

  return (
    <div className={cx('ph-band', className)}>
      <div className="ph-band__track" role="img" aria-label={summary}>
        <span className="ph-band__avg" style={{ left: `${clamp(at(average))}%` }} />
        {mark !== undefined && (
          <span className="ph-band__mark" style={{ left: `${clamp(at(mark))}%` }} />
        )}
      </div>
      <div className="ph-band__ends">
        <span>{format(low)}</span>
        <span>{format(high)}</span>
      </div>
      <div className="ph-band__key">
        {mark !== undefined && (
          <span>
            <span className="ph-band__keydot" aria-hidden="true" /> This one · {format(mark)}
          </span>
        )}
        <span>
          <span className="ph-band__keyline" aria-hidden="true" /> Average · {format(average)}
        </span>
      </div>
      <p className="ph-band__source">{source}</p>
    </div>
  )
}

/* ----------------------------------------------------------- trend sparkline */

export interface TrendSparklineProps {
  /** Oldest first. Fewer than two points draws nothing. */
  values: number[]
  /** Describes the shape for anyone who cannot see it. */
  label: string
  className?: string
}

/**
 * A year of prices, one stroke, no axes.
 *
 * Deliberately unlabelled: the figures either side of it carry the numbers,
 * and a sparkline that tries to be a chart stops being readable at this size.
 * The last point is marked because "where it is now" is the only value on the
 * line anyone reads precisely.
 */
export function TrendSparkline({ values, label, className }: TrendSparklineProps) {
  if (values.length < 2) return null

  const W = 300
  const H = 62
  const PAD = 4
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1

  const points = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - lo) / span) * (H - PAD * 2)
    return [x, y] as const
  })

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${H} L${points[0][0].toFixed(1)} ${H} Z`
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg
      className={cx('ph-spark', className)}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <path className="ph-spark__area" d={area} />
      <path className="ph-spark__line" d={line} />
      <circle className="ph-spark__now" cx={lastX} cy={lastY} r="3" />
    </svg>
  )
}
