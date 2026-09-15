import { Suspense, lazy, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '../ui/cx'
// Type-only, so neither import survives the build — Three.js stays behind
// the lazy boundary below rather than being dragged into the main bundle.
import type { Beat } from './hologramScene'
import type { HologramHandle } from './HologramCanvas'
import type { CarPart } from '../data/findings'

/**
 * The car, floating on the surface with the fault marked on it.
 *
 * There are two renderers here and the SVG is no longer the important one.
 * `hologramScene` generates the car — an extruded side profile, its glazing
 * cut from the same profile, a Fresnel shell over drawn silhouettes, standing
 * on a floor it can reflect in. The drawing below is what a device with no
 * WebGL is left with, and what holds the space for the moment before the
 * Three.js chunk arrives.
 *
 * That is the whole reason the SVG survives rather than being deleted. A
 * fallback is not a lesser version of the feature — on a phone with a blocked
 * context it IS the feature, and a glowing side profile with the fault ringed
 * on it answers the question the page exists to answer.
 *
 * It does NOT sit in a panel. On a dark ground a glowing wireframe needs no
 * stage — which is the whole argument for this surface, and the reason the
 * orb finally lost its disc too.
 */

/**
 * Three.js, fetched separately from the app.
 *
 * The orb already splits it out because it is on the very first screen; this
 * page is deeper in and would otherwise drag 120kB gzipped onto the route.
 * Split the same way, the two share one chunk — so by the time anyone reaches
 * a diagnosis the library is usually already in cache, and the car appears at
 * the cost of its own few kilobytes of geometry.
 */
const HologramCanvas = lazy(() =>
  import('./HologramCanvas').then((m) => ({ default: m.HologramCanvas })),
)

/**
 * Re-exported, not redeclared. This list was written out twice — here and in
 * `data/findings.ts` — which is two things that must agree and nothing making
 * them. Callers can keep importing it from either place.
 */
export type { CarPart } from '../data/findings'

/** Where each part lives in the drawing, as a fraction of the viewBox. */
const ANCHOR: Record<CarPart, { x: number; y: number }> = {
  'front-brakes': { x: 0.743, y: 0.783 },
  'rear-brakes': { x: 0.271, y: 0.783 },
  engine: { x: 0.83, y: 0.6 },
  cabin: { x: 0.48, y: 0.44 },
  battery: { x: 0.79, y: 0.52 },
}

/**
 * A token, turned into a colour the renderer can actually use.
 *
 * Callers pass severity as `var(--critical)`, which is right for CSS and
 * useless to WebGL: `THREE.Color` cannot parse it, warns, and leaves the
 * marker white — the one colour on this page that is supposed to mean
 * nothing. So the variable is resolved against the element that will hold the
 * canvas, which is also what keeps a future theme working: the answer comes
 * from the cascade rather than from a copy of the palette kept here.
 */
function resolveTone(tone: string, el: Element | null): string {
  const named = /^var\(\s*(--[\w-]+)\s*\)$/.exec(tone.trim())
  if (!named || !el) return tone
  return getComputedStyle(el).getPropertyValue(named[1]).trim() || tone
}

export interface CarHologramProps {
  /** The part to mark. Nothing is marked when this is absent. */
  focus?: CarPart | null
  /** Colours the marker — a severity token, so it matches the verdict. */
  tone?: string
  /** Vehicle name, shown small beneath. */
  vehicle?: string
  /** The car's body type, which picks one of the three profiles. */
  body?: string
  /** Which beat of the sequence: the car alone, him talking, or him holding. */
  beat?: Beat
  /** Handed the scene once it is live, so the page can ask him to turn it. */
  handleRef?: React.RefObject<HologramHandle | null>
  className?: string
}

export function CarHologram({
  focus,
  tone = 'var(--critical)',
  vehicle,
  body,
  beat = 'rest',
  handleRef,
  className,
}: CarHologramProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const [resolved, setResolved] = useState(tone)

  // Before paint, so the marker is never briefly the wrong colour.
  useLayoutEffect(() => {
    setResolved(resolveTone(tone, hostRef.current))
  }, [tone])

  const at = focus ? ANCHOR[focus] : null
  const label = focus
    ? `Diagram of ${vehicle ?? 'the car'}, with the ${focus.replace('-', ' ')} marked`
    : `Diagram of ${vehicle ?? 'the car'}`

  return (
    <div
      ref={hostRef}
      className={cx('carho', className)}
      data-holo={live ? 'on' : undefined}
      data-beat={beat}
    >
      {/* The shadow and the bob belong to the drawing. The scene has a floor
          of its own to stand on and a reflection in it, and two shadows under
          one car is worse than none. */}
      {live ? null : <span className="carho__contact" aria-hidden="true" />}

      <Suspense fallback={null}>
        <HologramCanvas
          body={body}
          focus={focus ?? null}
          tone={resolved}
          beat={beat}
          label={label}
          onLive={setLive}
          handleRef={handleRef}
        />
      </Suspense>

      {live ? null : (
        <svg className="carho__svg" viewBox="0 0 560 230" fill="none" role="img" aria-label={label}>
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
      )}

      {vehicle ? <span className="carho__name">{vehicle}</span> : null}
    </div>
  )
}
