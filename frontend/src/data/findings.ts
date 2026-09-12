import type { Severity } from '../ui'

/**
 * Diagnostic shapes.
 *
 * This was the Diagnosis page's mock data. The page now reads real reports
 * from `POST /api/diagnosis` (see `lib/api.ts`), so the invented findings and
 * the `mockScan` stand-in are gone; what remains are the two types the UI
 * still describes itself with.
 *
 * `CarPart` in particular is the single source of truth for where a fault sits
 * on the car — the hologram, the focus context and the chat all agree on this
 * list, and they only agree because there is one of it.
 */

/** Where a fault sits on the car, in model space. */
export type CarPart = 'front-brakes' | 'rear-brakes' | 'engine' | 'cabin' | 'battery'

export interface Finding {
  id: string
  /** The OBD trouble code, where there is one. */
  code?: string
  title: string
  /** Plain language. Never the code repeated back at the user. */
  explain: string
  severity: Severity
  /** 0–1. Shown, because a confident guess and a hunch are different things. */
  confidence: number
  part: CarPart
  /** Must fix vs can wait. Grouping, not decoration. */
  urgent: boolean
}
