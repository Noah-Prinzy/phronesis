import { cx } from '../ui/cx'
import type { BodyType } from '../data/vehicles'

/**
 * The car you are considering, drawn rather than photographed.
 *
 * **This is the same placeholder problem as the diagnosis hologram, and the
 * same answer.** `diagnosis/CarHologram.tsx` draws a generic side profile in
 * SVG so the page could be built before a real asset existed, and its prop
 * contract was written to survive being swapped for a Three.js renderer. This
 * is the pre-car half of that: the shapes differ by body type so a van does
 * not look like a saloon, and nothing else about it is real.
 *
 * It is a SEPARATE component from the hologram rather than a reuse, and that
 * is worth defending. The spec says Discover reuses the hologram viewer with
 * the fault markers removed — but the hologram's whole contract is fault
 * anchoring, and a viewer with no faults, no parts and no severity is not
 * that component with a prop turned off. When the real geometry arrives both
 * of these become thin wrappers around it, which is when the reuse actually
 * happens.
 */

/** Four silhouettes. Enough that the shape reads, not enough to be a model. */
const PATHS: Record<BodyType, { roof: string; glass?: string; wheels: [number, number] }> = {
  saloon: {
    roof: 'M28 84c2-30 28-44 62-47 30-3 56 2 76 10l40 16c22 4 44 8 44 21',
    glass: 'M76 46c22-4 46-4 66 0l30 14H70z',
    wheels: [82, 222],
  },
  suv: {
    roof: 'M26 84c0-34 26-50 62-53 32-3 58 2 78 11l38 15c22 5 46 9 46 27',
    glass: 'M72 42c24-5 50-5 70 0l30 16H66z',
    wheels: [80, 224],
  },
  van: {
    roof: 'M26 84V38c0-9 8-16 19-16h136c11 0 19 7 19 16v46',
    glass: 'M44 40h132v22H44z',
    wheels: [76, 216],
  },
  hatch: {
    roof: 'M40 84c0-28 22-42 54-45 26-2 48 3 62 12l28 18c14 5 26 8 26 15',
    glass: 'M78 48c20-4 40-4 56 0l24 12H72z',
    wheels: [88, 206],
  },
}

export function CarProfile({
  body = 'saloon',
  dim,
  className,
}: {
  body?: BodyType
  /** Drawn faint — for a card that is not the one being looked at. */
  dim?: boolean
  className?: string
}) {
  const shape = PATHS[body] ?? PATHS.saloon
  const [front, rear] = shape.wheels

  return (
    <svg
      className={cx('carprofile', dim && 'carprofile--dim', className)}
      viewBox="0 0 300 116"
      role="img"
      aria-label={`Side profile of a ${body}`}
    >
      <path className="carprofile__glow" d={`${shape.roof}L282 84H18Z`} />
      <path className="carprofile__line" d="M18 84h264" />
      <path className="carprofile__line" d={shape.roof} />
      {shape.glass && <path className="carprofile__hint" d={shape.glass} />}
      <circle className="carprofile__line" cx={front} cy="86" r="15" />
      <circle className="carprofile__hint" cx={front} cy="86" r="7" />
      <circle className="carprofile__line" cx={rear} cy="86" r="15" />
      <circle className="carprofile__hint" cx={rear} cy="86" r="7" />
    </svg>
  )
}
