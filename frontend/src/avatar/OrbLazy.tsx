import { Suspense, lazy } from 'react'
import type { OrbRendererProps } from './orbSpec'

/**
 * The orb renderer, fetched separately from the app.
 *
 * Three.js is about 120kB gzipped and the orb is on every screen including the
 * very first — so importing it directly puts it on the critical path for a
 * user on Ugandan mobile data, before a single word of Phronesis has appeared.
 * Split out, the app boots at its old weight and the renderer follows.
 *
 * **The gap is covered, not blank.** `.orb::before` paints a soft accent glow
 * behind whatever the renderer draws, and it is plain CSS that costs nothing
 * and is already on screen. So the avatar is a warm halo for the moment before
 * it becomes a body, which is a perfectly respectable thing to be — and it is
 * exactly what a device with no WebGL at all is left with permanently.
 *
 * That is also why there is no spinner here: a loading indicator over the
 * avatar would draw the eye to a wait nobody would otherwise notice.
 */
const OrbCanvas = lazy(() =>
  import('./OrbCanvas').then((m) => ({ default: m.OrbCanvas })),
)

export function OrbLazy(props: OrbRendererProps) {
  return (
    <Suspense fallback={null}>
      <OrbCanvas {...props} />
    </Suspense>
  )
}
