/**
 * Mock places for the map.
 *
 * Positions are normalised 0–1 against the stand-in canvas, not real
 * coordinates — swapping in a map SDK replaces `x`/`y` with `lat`/`lng` and
 * nothing else on the page. Deleted with the other mocks in step 4.
 */

export type PlaceKind = 'mechanic' | 'dealer' | 'seller'

export interface Place {
  id: string
  name: string
  kind: PlaceKind
  /** Normalised position on the stand-in map. Becomes lat/lng later. */
  x: number
  y: number
  rating: number
  reviews: number
  distanceKm: number
  etaMin: number
  openNow: boolean
  closesAt?: string
  tags: string[]
}

/** Where the user is. Normalised, like the places. */
export const USER_AT = { x: 0.42, y: 0.6 }

export const MECHANICS: Place[] = [
  {
    id: 'm1',
    name: 'ABC Auto Repair',
    kind: 'mechanic',
    x: 0.6,
    y: 0.335,
    rating: 4.8,
    reviews: 126,
    distanceKm: 2.4,
    etaMin: 11,
    openNow: true,
    closesAt: '18:00',
    tags: ['Brakes', 'Suspension'],
  },
  {
    id: 'm2',
    name: 'Quick Fix Motors',
    kind: 'mechanic',
    x: 0.28,
    y: 0.3,
    rating: 4.6,
    reviews: 88,
    distanceKm: 3.8,
    etaMin: 16,
    openNow: true,
    closesAt: '19:00',
    tags: ['Brakes'],
  },
  {
    id: 'm3',
    name: 'Ntinda Auto Clinic',
    kind: 'mechanic',
    x: 0.78,
    y: 0.5,
    rating: 4.4,
    reviews: 54,
    distanceKm: 6.1,
    etaMin: 24,
    openNow: false,
    tags: ['General'],
  },
  {
    id: 'm4',
    name: 'Kisaasi Motors',
    kind: 'mechanic',
    x: 0.16,
    y: 0.47,
    rating: 4.2,
    reviews: 31,
    distanceKm: 7.3,
    etaMin: 27,
    openNow: true,
    closesAt: '17:30',
    tags: ['Engine'],
  },
]

export const SELLERS: Place[] = [
  {
    id: 's1',
    name: 'Ntinda Car Bond',
    kind: 'dealer',
    x: 0.6,
    y: 0.335,
    rating: 4.5,
    reviews: 210,
    distanceKm: 2.4,
    etaMin: 11,
    openNow: true,
    closesAt: '18:00',
    tags: ['Dealer', 'Japanese imports'],
  },
  {
    id: 's2',
    name: 'Kampala Auto Yard',
    kind: 'dealer',
    x: 0.28,
    y: 0.3,
    rating: 4.1,
    reviews: 96,
    distanceKm: 4.2,
    etaMin: 18,
    openNow: true,
    closesAt: '18:30',
    tags: ['Dealer'],
  },
  {
    id: 's3',
    name: 'Private seller · Premio 2014',
    kind: 'seller',
    x: 0.78,
    y: 0.5,
    rating: 0,
    reviews: 0,
    distanceKm: 5.6,
    etaMin: 21,
    openNow: true,
    tags: ['Private'],
  },
]

/**
 * The drawn route. A real SDK returns this from a directions call; here it is
 * a fixed polyline from the user to whichever place is selected, so the shape
 * of the data the page consumes is already right.
 */
export const ROUTE_TO: Record<string, Array<[number, number]>> = {
  m1: [
    [0.42, 0.6],
    [0.44, 0.545],
    [0.505, 0.52],
    [0.55, 0.43],
    [0.585, 0.375],
    [0.6, 0.335],
  ],
  s1: [
    [0.42, 0.6],
    [0.44, 0.545],
    [0.505, 0.52],
    [0.55, 0.43],
    [0.585, 0.375],
    [0.6, 0.335],
  ],
  m2: [
    [0.42, 0.6],
    [0.4, 0.52],
    [0.35, 0.44],
    [0.31, 0.36],
    [0.28, 0.3],
  ],
  s2: [
    [0.42, 0.6],
    [0.4, 0.52],
    [0.35, 0.44],
    [0.31, 0.36],
    [0.28, 0.3],
  ],
  m3: [
    [0.42, 0.6],
    [0.52, 0.6],
    [0.63, 0.57],
    [0.72, 0.53],
    [0.78, 0.5],
  ],
  s3: [
    [0.42, 0.6],
    [0.52, 0.6],
    [0.63, 0.57],
    [0.72, 0.53],
    [0.78, 0.5],
  ],
  m4: [
    [0.42, 0.6],
    [0.34, 0.58],
    [0.25, 0.54],
    [0.16, 0.47],
  ],
}
