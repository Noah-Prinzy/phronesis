import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CarPart } from '../data/findings'
import type { WireAttachment } from '../lib/api'

/**
 * What he carries with him when he takes you somewhere.
 *
 * **This replaces `focus.tsx`, which was carrying one thing into a room where
 * nobody was listening.** Home guessed a car part from his reply, wrote it
 * here, and no page ever read it — Diagnosis worked the part out again from
 * its own report. So the two screens were not one conversation that moved;
 * they were two conversations that happened to be about the same car.
 *
 * Everything needed to continue rather than restart:
 *
 * - `symptom` — what the user actually said, so nobody is asked to type it
 *   a second time into a blank box.
 * - `chatId` — the server-side conversation this belongs to, so the report is
 *   written into it and anything asked afterwards has it in context.
 * - `part` — where on the car he was pointing, so the hologram opens aimed at
 *   it rather than cold.
 *
 * **Deliberately not persisted.** A refresh drops it and Diagnosis goes back
 * to asking, which is right: a hand-off is a thing that just happened, and
 * replaying a week-old one out of storage would be a page pretending to
 * remember a conversation neither of you is having.
 */
export interface Handover {
  symptom: string
  chatId?: string
  part: CarPart | null
  /**
   * The photo or recording that came with it.
   *
   * Carried so the diagnosis sees what he saw. Without this the evidence
   * stops at the chat: he would look at a picture of a cracked hose, route
   * you to Diagnosis, and then diagnose from the sentence alone.
   */
  attachments?: WireAttachment[]
}

interface HandoverValue {
  /** What he brought, or null if you arrived here on your own. */
  pending: Handover | null
  /** He is taking you somewhere; this is what goes with you. */
  send: (handover: Handover) => void
  /**
   * Spend it.
   *
   * The receiving page reads `pending`, starts the work with it, and clears —
   * which is what stops the sequence re-firing on every later render. He
   * explains it once, not once per keystroke in whatever you type next.
   */
  clear: () => void
}

const Ctx = createContext<HandoverValue | null>(null)

export function HandoverProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Handover | null>(null)

  const send = useCallback((handover: Handover) => setPending(handover), [])
  const clear = useCallback(() => setPending(null), [])

  const value = useMemo<HandoverValue>(
    () => ({ pending, send, clear }),
    [pending, send, clear],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useHandover(): HandoverValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useHandover must be used inside <HandoverProvider>')
  return v
}
