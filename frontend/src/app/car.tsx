import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getCar, saveCar, type CarProfile } from '../lib/api'
import { useAuth } from './auth'

/**
 * The car, in one place.
 *
 * It was hardcoded in two: the navigation rail said "2015 Toyota Premio" as
 * literal text while Account had no idea what the user drove. That is worse
 * than showing nothing — the app claimed to know something about you and was
 * simply reciting a string, so saving a car would have changed the settings
 * page and left the sidebar still naming someone else's Premio.
 *
 * Loaded once when a user signs in, held here, and written through on save so
 * every reader updates at once rather than after a refresh.
 */
interface CarValue {
  car: CarProfile | null
  /** False once the first load has settled, either way. */
  loading: boolean
  /** Saves to the server and updates every reader. Throws if the write fails. */
  save: (car: CarProfile) => Promise<void>
}

const Ctx = createContext<CarValue | null>(null)

export function CarProvider({ children }: { children: ReactNode }) {
  const { status, getToken } = useAuth()
  const [car, setCar] = useState<CarProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status !== 'signedIn') {
      // Signing out must clear it, or the next person to use the device is
      // shown the last user's car.
      setCar(null)
      setLoading(false)
      return
    }

    let live = true
    const ac = new AbortController()
    void (async () => {
      try {
        const token = await getToken()
        if (!token || ac.signal.aborted) return
        const loaded = await getCar(token, ac.signal)
        if (live) setCar(loaded)
      } catch {
        // Not knowing the car is survivable — every screen that uses it has a
        // no-car state, because a new user genuinely has none.
      } finally {
        if (live) setLoading(false)
      }
    })()

    return () => {
      live = false
      ac.abort()
    }
  }, [status, getToken])

  const save = useCallback(
    async (next: CarProfile) => {
      const token = await getToken()
      if (!token) throw new Error('Not signed in.')
      await saveCar(token, next)
      setCar(next)
    },
    [getToken],
  )

  const value = useMemo<CarValue>(() => ({ car, loading, save }), [car, loading, save])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCar(): CarValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCar must be used inside <CarProvider>')
  return v
}

/** "2015 Toyota Premio", or null when there is no car to name. */
export function carName(car: CarProfile | null): string | null {
  if (!car) return null
  return [car.year, car.make, car.model].filter(Boolean).join(' ')
}
