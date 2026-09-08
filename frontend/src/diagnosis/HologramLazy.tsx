import { Suspense, lazy } from 'react'
import { Spinner } from '../ui'
import type { HologramProps } from './Hologram'

/**
 * three.js is ~530kB minified — more than the entire rest of the app. On a
 * metered Ugandan mobile connection that is not something to ship to someone
 * who only ever opens Home.
 *
 * So it is fetched when, and only when, a hologram is actually rendered. The
 * findings list — the part that carries the answer — paints immediately either
 * way, and the car arrives underneath it.
 */
const Real = lazy(() => import('./Hologram').then((m) => ({ default: m.Hologram })))

export function Hologram(props: HologramProps) {
  return (
    <Suspense
      fallback={
        <div className="holo holo--loading">
          <Spinner size={16} />
        </div>
      }
    >
      <Real {...props} />
    </Suspense>
  )
}
