import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

/* ------------------------------------------------------------------ spinner */

export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx('ph-spinner', className)}
      style={{ width: size, height: size }}
    />
  )
}

/* -------------------------------------------------------------------- meter */

export interface MeterProps {
  /** 0–1. Clamped, because a confidence of 1.4 is a bug worth not rendering. */
  value: number
  tone?: 'neutral' | 'accent'
  label?: string
  className?: string
}

export function Meter({ value, tone = 'neutral', label, className }: MeterProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      data-tone={tone}
      className={cx('ph-meter', className)}
    >
      <span className="ph-meter__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

/* -------------------------------------------------------------------- split */

export interface SplitBarProps {
  /** Two-part totals: parts vs labour, and nothing else so far. */
  segments: Array<{ value: number; tone?: 'bright' | 'dim' }>
  className?: string
}

export function SplitBar({ segments, className }: SplitBarProps) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1
  return (
    <div className={cx('ph-split', className)}>
      {segments.map((s, i) => (
        <span
          key={i}
          className="ph-split__seg"
          data-tone={s.tone ?? 'bright'}
          style={{ width: `${(s.value / total) * 100}%` }}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------- steps */

export function Steps({
  total,
  current,
  className,
}: {
  total: number
  /** 1-based. */
  current: number
  className?: string
}) {
  /**
   * Clamped, because `current` arrives from a caller and ARIA does not
   * tolerate nonsense. Out of range it used to announce "step 7 of 3" with
   * `aria-valuenow` past `aria-valuemax` — invisible on screen, since every
   * segment simply renders as done, and plainly wrong to anyone listening.
   * Found by the stress bench in the styleguide.
   */
  const at = Math.min(Math.max(1, current), Math.max(1, total))

  return (
    <div
      className={cx('ph-steps', className)}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={at}
      aria-label={`Step ${at} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="ph-steps__seg"
          data-state={i + 1 < current ? 'done' : i + 1 === current ? 'current' : 'todo'}
        />
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- skeleton */

export function Skeleton({
  width,
  height = 12,
  radius,
  className,
}: {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cx('ph-skeleton', className)}
      style={{ display: 'block', width: width ?? '100%', height, borderRadius: radius }}
    />
  )
}

/* -------------------------------------------------------------- empty state */

export interface EmptyStateProps {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({ title, body, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cx('ph-empty', className)}>
      {icon && <span className="ph-empty__icon">{icon}</span>}
      <p className="ph-empty__title">{title}</p>
      {body && <p className="ph-empty__body">{body}</p>}
      {action}
    </div>
  )
}

/* -------------------------------------------------------------------- toast */

export type ToastLevel = 'neutral' | 'accent' | 'warning' | 'critical'

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  level?: ToastLevel
  title: string
  body?: string
  action?: ReactNode
}

export function Toast({ level = 'neutral', title, body, action, className, ...rest }: ToastProps) {
  return (
    <div
      {...rest}
      role={level === 'critical' ? 'alert' : 'status'}
      data-level={level}
      className={cx('ph-toast', className)}
    >
      <span className="ph-toast__stripe" />
      <span className="ph-toast__text">
        <span className="ph-toast__title">{title}</span>
        {body && <span className="ph-toast__body">{body}</span>}
      </span>
      {action}
    </div>
  )
}
