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

export function SpecList({ className, children }: { className?: string; children: ReactNode }) {
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
      {children}
      {streaming && <span className="ph-bubble__caret" aria-hidden="true" />}
    </div>
  )
}
