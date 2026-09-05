import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Journey = 'owner' | 'buyer'

interface JourneyValue {
  journey: Journey | null
  setJourney: (j: Journey) => void
  /**
   * Onboarding is three steps for an owner and **two** for a buyer — the OBD
   * step exists only for people who have a car to plug it into. The progress
   * bar reads from here so it can never claim a step the flow will not show.
   */
  steps: number
}

const Ctx = createContext<JourneyValue | null>(null)

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [journey, setJourney] = useState<Journey | null>(null)
  const value = useMemo<JourneyValue>(
    () => ({ journey, setJourney, steps: journey === 'buyer' ? 2 : 3 }),
    [journey],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useJourney(): JourneyValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useJourney must be used inside <JourneyProvider>')
  return v
}
