import { useCallback, useSyncExternalStore } from 'react'

/**
 * The current root font size in pixels.
 *
 * `html` is sized fluidly (see tokens.css), so this is the app's scale factor.
 * Anything measured in JavaScript rather than CSS — the avatar canvas, which
 * needs a concrete pixel size — has to read it, or it stays phone-sized on a
 * large monitor while everything around it grows.
 */
export function useRootFontSize(): number {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('resize', onChange)
    return () => window.removeEventListener('resize', onChange)
  }, [])

  const snapshot = useCallback(
    () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
    [],
  )

  return useSyncExternalStore(subscribe, snapshot, () => 16)
}

/** Convert a rem measurement to pixels at the current root size. */
export function useRem(rem: number): number {
  return Math.round(useRootFontSize() * rem)
}
