/**
 * Mock repair options and mechanics.
 *
 * Invented, like `findings.ts`, and deleted with it in step 4. Every price
 * here is a plausible Kampala figure rather than a real one — which is fine
 * for a layout and fatal in production, since the whole promise of the page is
 * that the number is trustworthy.
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

export interface SolutionSet {
  /** The finding these options answer. */
  findingId: string
  findingTitle: string
  options: RepairOption[]
  mechanics: Mechanic[]
}

export const SOLUTIONS: Record<string, SolutionSet> = {
  f1: {
    findingId: 'f1',
    findingTitle: 'Front brake pads',
    options: [
      {
        id: 'o1',
        title: 'Replace pads only',
        blurb: 'What the noise is actually asking for. The discs measured fine.',
        parts: 120_000,
        labour: 60_000,
        recommended: true,
      },
      {
        id: 'o2',
        title: 'Pads and discs',
        blurb: 'Thorough, and worth it only if the discs are near their wear limit.',
        parts: 340_000,
        labour: 120_000,
      },
    ],
    mechanics: [
      {
        id: 'm1',
        name: 'ABC Auto Repair',
        rating: 4.8,
        reviews: 126,
        distanceKm: 2.4,
        etaMin: 11,
        specialities: ['Brakes', 'Suspension'],
        openNow: true,
        parts: 130_000,
        labour: 150_000,
        labourHours: 2,
      },
      {
        id: 'm2',
        name: 'Quick Fix Motors',
        rating: 4.6,
        reviews: 88,
        distanceKm: 3.8,
        etaMin: 16,
        specialities: ['Brakes'],
        openNow: true,
        parts: 150_000,
        labour: 170_000,
        labourHours: 2.5,
      },
      {
        id: 'm3',
        name: 'Ntinda Auto Clinic',
        rating: 4.4,
        reviews: 54,
        distanceKm: 6.1,
        etaMin: 24,
        specialities: ['General'],
        openNow: false,
        parts: 110_000,
        labour: 130_000,
        labourHours: 2,
      },
    ],
  },
  f2: {
    findingId: 'f2',
    findingTitle: 'Engine knock sensor',
    options: [
      {
        id: 'o3',
        title: 'Replace the sensor',
        blurb: 'The direct fix. Worth doing before it starts pulling timing.',
        parts: 180_000,
        labour: 90_000,
        recommended: true,
      },
      {
        id: 'o4',
        title: 'Clean and re-test first',
        blurb: 'Cheaper, and sometimes enough if it is carbon rather than the sensor.',
        parts: 0,
        labour: 70_000,
      },
    ],
    mechanics: [
      {
        id: 'm1',
        name: 'ABC Auto Repair',
        rating: 4.8,
        reviews: 126,
        distanceKm: 2.4,
        etaMin: 11,
        specialities: ['Engine', 'Diagnostics'],
        openNow: true,
        parts: 195_000,
        labour: 100_000,
        labourHours: 1.5,
      },
      {
        id: 'm3',
        name: 'Ntinda Auto Clinic',
        rating: 4.4,
        reviews: 54,
        distanceKm: 6.1,
        etaMin: 24,
        specialities: ['Engine'],
        openNow: false,
        parts: 175_000,
        labour: 95_000,
        labourHours: 2,
      },
    ],
  },
}

export type SortKey = 'match' | 'distance' | 'price' | 'rating'

/** Higher is better. Rating dominates; distance only breaks ties. */
function matchScore(m: Mechanic): number {
  return m.rating * 2 - m.distanceKm * 0.15
}

export function sortMechanics(list: Mechanic[], by: SortKey): Mechanic[] {
  switch (by) {
    case 'distance':
      return list.toSorted((a, b) => a.distanceKm - b.distanceKm)
    case 'price':
      return list.toSorted((a, b) => a.parts + a.labour - (b.parts + b.labour))
    case 'rating':
      return list.toSorted((a, b) => b.rating - a.rating)
    case 'match':
    default:
      // Best match is not cheapest. It weighs rating and closeness together,
      // because the page's promise is a mechanic worth trusting — sorting by
      // price alone would quietly turn it into a race to the bottom.
      return list.toSorted((a, b) => matchScore(b) - matchScore(a))
  }
}
