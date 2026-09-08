import { useCallback, useSyncExternalStore } from 'react'

/**
 * Reads a media query and stays in sync with it.
 *
 * `useSyncExternalStore` re-reads the value on every notification and during
 * render, so the layout cannot hold a stale answer. It subscribes to the query
 * itself *and* to `resize`: a viewport that changes without dispatching a
 * `change` event on the MediaQueryList is rare but real (device emulation is
 * one), and the failure mode is the whole app stuck in the wrong layout —
 * far worse than one redundant listener.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      window.addEventListener('resize', onChange)
      return () => {
        mql.removeEventListener('change', onChange)
        window.removeEventListener('resize', onChange)
      }
    },
    [query],
  )

  const snapshot = useCallback(() => window.matchMedia(query).matches, [query])

  // The server snapshot never matches: SSR has no viewport, and guessing
  // "wide" would hydrate the wrong nav.
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
