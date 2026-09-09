import { useCallback, useEffect, useRef, useState } from 'react'
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

/* --------------------------------------------------------------- flyout
   900px and up. Everything collapses into ONE control: closed there is no
   rail at all and the page has the whole width; open, a menu floats OVER
   the page rather than beside it.

   Two things that look like contradictions and are not.

   The menu has a background where the old rail deliberately had none. The
   rail was permanent, so a ground of its own made it a wall down the middle
   of the app; this is temporary and floats above the page, so it has to read
   as an object someone opened.

   The opener carries the page name rather than being a bare hamburger.
   With no permanent rail this is the only thing left saying which of five
   places you are standing in, and removing that with nothing in its place
   is how an app stops being navigable.

   The cost, stated plainly because it is real: every navigation is two
   clicks instead of one, forever. */

export interface NavMenuProps<T extends string> extends NavProps<T> {
  /** Shown below a rule — not a destination, so it sits apart. */
  footer?: ReactNode
}

export function NavMenu<T extends string>({
  items,
  value,
  onChange,
  footer,
  className,
}: NavMenuProps<T>) {
  const [open, setOpen] = useState(false)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const here = items.find((i) => i.value === value)

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    // Focus has to come back to what opened the menu, or a keyboard user is
    // dropped at the top of the document every time they navigate.
    if (restoreFocus) openerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || openerRef.current?.contains(t)) return
      close(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    // Move focus into the menu so the first Tab lands inside it rather than
    // somewhere behind the scrim.
    menuRef.current?.querySelector<HTMLElement>('button')?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, close])

  return (
    <div className={cx('ph-nav', className)}>
      <button
        ref={openerRef}
        type="button"
        className="ph-nav__opener"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
        <span>{here?.label ?? 'Menu'}</span>
      </button>

      {open ? (
        <>
          <div className="ph-nav__scrim" aria-hidden="true" />
          <div ref={menuRef} className="ph-nav__menu" role="menu" aria-label="Main">
            <div className="ph-nav__menuhead">
              <button
                type="button"
                className="ph-nav__close"
                onClick={() => close()}
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
              <span>Go to</span>
            </div>

            {items.map((item) => (
              <button
                key={item.value}
                type="button"
                role="menuitem"
                className="ph-navitem"
                aria-current={item.value === value ? 'page' : undefined}
                onClick={() => {
                  onChange(item.value)
                  close()
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}

            {footer ? (
              <>
                <div className="ph-nav__rule" />
                <div onClick={() => close(false)}>{footer}</div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
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
