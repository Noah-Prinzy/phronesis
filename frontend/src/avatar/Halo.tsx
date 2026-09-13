import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { cx } from '../ui/cx'
import { OrbLazy } from './OrbLazy'
import type { OrbState } from './orbSpec'

/**
 * Phronesis' presence.
 *
 * A sphere skinned in floating hexagonal plates with a band of light sweeping
 * a tilted axis, played as a seamless loop. This component owns only the
 * wrapper: the size, the hit target, and the element the renderer writes its
 * `--orb-*` properties onto.
 *
 * The four states come from the table in orbSpec.ts. A recording can only
 * honour part of it — speed, brightness, size and glow — so the band's width
 * and the plates' lift are fixed in the asset. A renderer that could reshape
 * the orb per state would honour the rest; that is still an open question.
 */

/** Kept as the public name — every call site already speaks in these terms. */
export type HaloState = OrbState

export interface HaloProps {
  state?: HaloState
  /** Rendered size in CSS pixels. */
  size?: number
  /** Live audio level, 0–1. */
  level?: number
  /**
   * A ref carrying the live level instead of a prop, so a microphone can drive
   * the orb at 60fps without re-rendering anything above it.
   */
  levelRef?: React.RefObject<number>
  /** Tap target. Omit it and the orb is decorative and aria-hidden. */
  onActivate?: () => void
  label?: string
  className?: string
  /** Layout only — the component owns every visual property itself. */
  style?: CSSProperties
}

export function Halo({
  state = 'idle',
  size = 140,
  level = 0,
  levelRef,
  onActivate,
  label,
  className,
  style,
}: HaloProps) {
  const hostRef = useRef<HTMLElement | null>(null)

  const orb = (
    <OrbLazy state={state} size={size} level={level} levelRef={levelRef} hostRef={hostRef} />
  )

  const wrap = {
    className: cx('orb', className),
    style: { width: size, height: size, ...style },
    'data-state': state,
  }

  if (!onActivate) {
    return (
      <div {...wrap} ref={hostRef as React.RefObject<HTMLDivElement>} aria-hidden="true">
        {orb}
      </div>
    )
  }

  return (
    <button
      {...wrap}
      ref={hostRef as React.RefObject<HTMLButtonElement>}
      type="button"
      data-interactive="true"
      onClick={onActivate}
      aria-label={label ?? 'Talk to Phronesis'}
    >
      {orb}
    </button>
  )
}
