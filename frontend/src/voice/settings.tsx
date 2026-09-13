import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

const KEY = 'phronesis:speak'

interface VoiceValue {
  /** Whether Phronesis reads its replies aloud. Persisted per device. */
  speak: boolean
  setSpeak: (v: boolean) => void
}

const Ctx = createContext<VoiceValue | null>(null)

function readStored(): boolean {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === null ? true : stored === '1'
  } catch {
    // Private browsing, storage disabled, etc — default on rather than fail.
    return true
  }
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [speak, setSpeakState] = useState(readStored)

  const setSpeak = (v: boolean) => {
    setSpeakState(v)
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      /* the toggle still works for this tab even if it cannot persist */
    }
  }

  const value = useMemo<VoiceValue>(() => ({ speak, setSpeak }), [speak])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useVoice(): VoiceValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useVoice must be used inside <VoiceProvider>')
  return v
}
