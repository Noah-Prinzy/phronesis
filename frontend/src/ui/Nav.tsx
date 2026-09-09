import type { ReactNode } from 'react'
import { cx } from './cx'

/* ----------------------------------------------------------------- shared
   Rail and TabBar take the same items in the same order, so the two can
   never disagree about where you are. */

export interface NavItem<T extends string> {
  value: T
  label: string
  icon: ReactNode
}

export interface NavProps<T extends string> {
  items: Array<NavItem<T>>
  value: T
  onChange: (value: T) => void
  className?: string
}

/* ------------------------------------------------------------------- rail
   900px and up. A sibling of the content, never an overlay, so no page has
   to reserve space for it or guess its width. */

export interface RailProps<T extends string> extends NavProps<T> {
  /** Pinned to the bottom — the vehicle readout on the hub. */
  footer?: ReactNode
}

export function Rail<T extends string>({
  items,
  value,
  onChange,
  footer,
  className,
}: RailProps<T>) {
  return (
    <nav className={cx('ph-rail', className)} aria-label="Main">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className="ph-navitem"
          aria-current={item.value === value ? 'page' : undefined}
          onClick={() => onChange(item.value)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}

      <div className="ph-rail__spacer" />
      {footer}
    </nav>
  )
}

/* ---------------------------------------------------------------- tab bar
   Below 900px. Five destinations is the most a tab bar can carry before the
   labels stop being readable, which is exactly what the app has. */

export function TabBar<T extends string>({ items, value, onChange, className }: NavProps<T>) {
  return (
    <nav className={cx('ph-tabbar', className)} aria-label="Main">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className="ph-tabbar__item"
          aria-current={item.value === value ? 'page' : undefined}
          onClick={() => onChange(item.value)}
        >
          {item.icon}
          <span className="ph-tabbar__label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

/* --------------------------------------------------------------------- tabs
   In-page tabs. The underline travels because the panels are siblings —
   the movement says "same level, different view". */

export interface TabsProps<T extends string> {
  options: Array<{ value: T; label: ReactNode }>
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cx('ph-tabs', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className="ph-tab"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ app bar */

export interface AppBarProps {
  title?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  className?: string
}

export function AppBar({ title, leading, trailing, className }: AppBarProps) {
  return (
    <header className={cx('ph-appbar', className)}>
      {leading}
      {title && <span className="ph-appbar__title">{title}</span>}
      {trailing}
    </header>
  )
}
