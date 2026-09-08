import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Journey = 'owner' | 'buyer'

const KEY = 'phronesis:journey'

interface JourneyValue {
  journey: Journey | null
  setJourney: (j: Journey) => void
}

const Ctx = createContext<JourneyValue | null>(null)

/**
 * Persisted, because it is not a preference — it decides which two of the
 * five navigation slots exist and which half of the product the user sees.
 * Held in memory alone, any reload during onboarding silently turned a buyer
 * into an owner, since every consumer reads `journey !== 'buyer'`.
 */
function read(): Journey | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'owner' || v === 'buyer' ? v : null
  } catch {
    // Private mode, or storage disabled. Not knowing is survivable.
    return null
  }
}

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [journey, setJourneyState] = useState<Journey | null>(read)

  const value = useMemo<JourneyValue>(
    () => ({
      journey,
      setJourney: (j: Journey) => {
        setJourneyState(j)
        try {
          localStorage.setItem(KEY, j)
        } catch {
          /* the session still works, it just will not outlive a reload */
        }
      },
    }),
    [journey],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useJourney(): JourneyValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useJourney must be used inside <JourneyProvider>')
  return v
}
