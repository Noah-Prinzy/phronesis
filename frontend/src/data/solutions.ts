/**
 * Repair and mechanic shapes.
 *
 * This was the Solutions page's mock data — a table of invented Kampala
 * prices. The page now derives options from the real diagnosis report and its
 * parts/labour split, so the fixtures, the `SOLUTIONS` lookup and the
 * `sortMechanics` helper are gone. What remains are the two types the cards
 * are written against.
 */

export interface RepairOption {
  id: string
  title: string
  /** Why you would choose this one. Not a spec — a reason. */
  blurb: string
  parts: number
  labour: number
  /**
   * Exactly one option may carry this. "Recommended" that appears three times
   * is not a recommendation.
   */
  recommended?: boolean
}

export interface Mechanic {
  id: string
  name: string
  rating: number
  reviews: number
  distanceKm: number
  etaMin: number
  specialities: string[]
  openNow: boolean
  /** This shop's own prices for the chosen repair. */
  parts: number
  labour: number
  labourHours: number
}
