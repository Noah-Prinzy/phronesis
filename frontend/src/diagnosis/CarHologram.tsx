import { cx } from '../ui/cx'

/**
 * The car, floating on the surface with the fault marked on it.
 *
 * **This is a placeholder, and deliberately a thin one.** It draws a generic
 * side profile in SVG so the page can be built, reviewed and shipped before
 * the real asset exists. A proper model — authored in Blender, sourced from
 * Sketchfab, or generated from a reference photo — replaces the `<svg>` here
 * and nothing else: the props below are the contract, and a Three.js renderer
 * satisfies them the same way this does.
 *
 * The marker anchors are the reason the contract survives that swap. They are
 * fractions of the viewBox rather than pixels, so wherever the geometry ends
 * up, a fault still lands on the part it belongs to.
 *
 * It does NOT sit in a panel. On a dark ground a glowing wireframe needs no
 * stage — which is the whole argument for this surface, and the reason the
 * orb finally lost its disc too.
 */

export type CarPart = 'front-brakes' | 'rear-brakes' | 'engine' | 'cabin' | 'battery'

/** Where each part lives, as a fraction of the drawing. Survives a redraw. */
const ANCHOR: Record<CarPart, { x: number; y: number }> = {
  'front-brakes': { x: 0.743, y: 0.783 },
  'rear-brakes': { x: 0.271, y: 0.783 },
  engine: { x: 0.83, y: 0.6 },
  cabin: { x: 0.48, y: 0.44 },
  battery: { x: 0.79, y: 0.52 },
}

export interface CarHologramProps {
  /** The part to mark. Nothing is marked when this is absent. */
  focus?: CarPart | null
  /** Colours the marker — a severity token, so it matches the verdict. */
  tone?: string
  /** Vehicle name, shown small beneath. */
  vehicle?: string
  className?: string
}

export function CarHologram({ focus, tone = 'var(--critical)', vehicle, className }: CarHologramProps) {
  const at = focus ? ANCHOR[focus] : null

  return (
    <div className={cx('carho', className)}>
      <span className="carho__contact" aria-hidden="true" />

      <svg
        className="carho__svg"
        viewBox="0 0 560 230"
        fill="none"
        role="img"
        aria-label={
          focus
            ? `Diagram of ${vehicle ?? 'the car'}, with the ${focus.replace('-', ' ')} marked`
            : `Diagram of ${vehicle ?? 'the car'}`
        }
      >
        <g
          stroke="var(--accent)"
          strokeWidth="1.5"
          opacity="0.95"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M60 168 L74 118 Q80 100 100 96 L200 84 Q236 62 292 62 L360 64 Q404 66 430 86 L484 122 Q506 134 508 158 L508 172 Q508 182 496 182 L72 182 Q60 182 60 172 Z" />
          <path d="M196 96 Q234 76 288 76 L352 78 L358 116 L188 122 Z" />
          <path d="M368 80 Q400 84 420 100 L456 124 L372 118 Z" />
          <path d="M74 150 L500 148" opacity="0.5" />
          <path d="M108 182 A44 44 0 0 1 196 182" opacity="0.6" />
          <path d="M372 182 A44 44 0 0 1 460 182" opacity="0.6" />
        </g>

        <g stroke="var(--accent-hi)" strokeWidth="1.4" opacity="0.9">
          <circle cx="152" cy="180" r="36" />
          <circle cx="152" cy="180" r="15" opacity="0.6" />
          <circle cx="416" cy="180" r="36" />
          <circle cx="416" cy="180" r="15" opacity="0.6" />
        </g>

        {/* A faint fill, so it reads as a body with volume rather than as
            an outline drawing floating in space. */}
        <path
          d="M60 168 L74 118 Q80 100 100 96 L200 84 Q236 62 292 62 L360 64 Q404 66 430 86 L484 122 Q506 134 508 158 L508 172 Q508 182 496 182 L72 182 Q60 182 60 172 Z"
          fill="var(--accent)"
          opacity="0.14"
        />

        {at ? (
          <g style={{ color: tone }}>
            <circle
              cx={at.x * 560}
              cy={at.y * 230}
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="carho__ping"
            />
            <circle cx={at.x * 560} cy={at.y * 230} r="7" fill="currentColor" />
          </g>
        ) : null}
      </svg>

      {vehicle ? <span className="carho__name">{vehicle}</span> : null}
    </div>
  )
}
