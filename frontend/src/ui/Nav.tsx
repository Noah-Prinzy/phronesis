import type { ReactNode } from 'react'
import { cx } from './cx'

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

/* ---------------------------------------------------------------- app nav
   One definition, two presentations. The phone gets a tab bar, anything
   768px and wider gets the rail — but the items, their order and their
   active state come from the same array, so the two can never disagree.

   `items` is passed in rather than hard-coded because the pre-car journey
   swaps slots 2 and 3 (Discover / Compare) for the post-car ones
   (Diagnosis / Solutions). See design/04-precar.md. */

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

export function TabBar<T extends string>({ items, value, onChange, className }: NavProps<T>) {
  return (
    <nav className={cx('ph-tabbar', className)} aria-label="Main">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          aria-current={it.value === value ? 'page' : undefined}
          className="ph-tabbar__item ph-pressable"
          onClick={() => onChange(it.value)}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function Rail<T extends string>({ items, value, onChange, className }: NavProps<T>) {
  return (
    <nav className={cx('ph-rail', className)} aria-label="Main">
      <span className="ph-rail__mark" aria-hidden="true">
        PH
      </span>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          aria-current={it.value === value ? 'page' : undefined}
          className="ph-rail__item ph-pressable"
          onClick={() => onChange(it.value)}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
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
      {leading ?? <span className="ph-appbar__spacer" />}
      {title && <span className="ph-appbar__title">{title}</span>}
      {trailing ?? <span className="ph-appbar__spacer" />}
    </header>
  )
}
