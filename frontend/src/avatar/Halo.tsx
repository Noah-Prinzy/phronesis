import { lazy, Suspense, useRef } from 'react'
import type { CSSProperties } from 'react'
import { cx } from '../ui/cx'
import { OrbVideo } from './OrbVideo'
import { orbMode } from './orbMode'
import type { OrbState } from './orbSpec'

/**
 * Phronesis' presence.
 *
 * A sphere skinned in floating hexagonal plates with a band of light sweeping
 * a tilted axis. Two renderers draw it, chosen at load by `orbMode()`:
 *
 *   video  — the pre-rendered loop from design/avatar-v2. What ships.
 *   three  — generative, so a state can reshape the orb rather than just
 *            replay it faster. Behind a flag until it earns the default.
 *
 * Both read the same state table in orbSpec.ts, so they cannot disagree about
 * what `thinking` means. This component owns only the wrapper: the size, the
 * hit target, and the element the renderers write their `--orb-*` properties
 * onto.
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

// Three is already in the bundle for the diagnosis hologram, but that route
// lazy-loads it. Importing it here eagerly would put it in the entry chunk for
// everyone, including the majority who never leave the video renderer.
const OrbThree = lazy(() => import('./OrbThree').then((m) => ({ default: m.OrbThree })))

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
  const mode = orbMode()

  const orb =
    mode === 'three' ? (
      <Suspense fallback={null}>
        <OrbThree state={state} size={size} level={level} levelRef={levelRef} hostRef={hostRef} />
      </Suspense>
    ) : (
      <OrbVideo state={state} size={size} level={level} levelRef={levelRef} hostRef={hostRef} />
    )

  const shared = {
    className: cx('orb', className),
    style: { width: size, height: size, ...style },
    'data-state': state,
    'data-mode': mode,
  }

  if (!onActivate) {
    return (
      <div
        {...shared}
        ref={hostRef as React.RefObject<HTMLDivElement>}
        aria-hidden="true"
      >
        {orb}
      </div>
    )
  }

  return (
    <button
      {...shared}
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
