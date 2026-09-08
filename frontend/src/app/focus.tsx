import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CarPart } from '../data/findings'

interface FocusValue {
  /** Which part of the car Phronesis was last talking about. */
  part: CarPart | null
  setPart: (part: CarPart) => void
  clear: () => void
}

const Ctx = createContext<FocusValue | null>(null)

/**
 * Carries "which car part Phronesis just mentioned" across the chat-offer
 * hand-off from Home to Diagnosis, so the hologram can pick up pointing at
 * it the moment the page opens instead of starting cold. Follows the same
 * shape as `journey.tsx`.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const [part, setPartState] = useState<CarPart | null>(null)
  const value = useMemo<FocusValue>(
    () => ({
      part,
      setPart: setPartState,
      clear: () => setPartState(null),
    }),
    [part],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useFocus(): FocusValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useFocus must be used inside <FocusProvider>')
  return v
}
