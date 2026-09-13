/**
 * The pre-car corpus.
 *
 * **Read this before adding a row.** The post-car journey generates its own
 * data — the reader pulls codes, the owner describes a noise — and pre-car has
 * no such source. Discover and Compare are only ever as good as what is in
 * here, which makes this the one file in the app where an invented number does
 * real damage: a wrong fuel figure or a wrong price band is not a rendering
 * bug, it is bad advice about somebody's money.
 *
 * So provenance is part of the TYPE, not a convention. A price band cannot be
 * constructed without saying where it came from, and the UI prints that
 * wherever it prints the band. When something is illustrative it says so on
 * screen rather than in a comment nobody reads.
 *
 * **What is trustworthy here today:**
 *
 *   specs    Manufacturer figures for the JDM models that dominate Ugandan
 *            imports. Engine codes, transmissions, dimensions and tank sizes
 *            are reliable. Fuel consumption is the manufacturer's own cycle
 *            and real-world numbers on Ugandan roads run lower — the field is
 *            named `fuelClaimed` so nothing reads it as a promise.
 *   prices   NOT sourced. Every band below is `illustrative` and is plausible
 *            rather than researched. Replacing these with real Jiji/Autochek
 *            listing spreads, dated, is the last thing standing between these
 *            pages and being genuinely useful.
 *
 * Mock data was deliberately stripped out of this app once already. This file
 * exists so that never happens invisibly again.
 */

export type BodyType = 'saloon' | 'suv' | 'van' | 'hatch'
export type Drive = 'front' | 'rear' | 'all'

/**
 * Where a figure came from. Required, and rendered.
 *
 * `listings` means somebody read real adverts and wrote down the spread.
 * `illustrative` means it is a placeholder and the screen must admit it.
 */
export interface Provenance {
  kind: 'listings' | 'illustrative'
  /** Shown to the user. "61 Jiji listings" or "not yet sourced". */
  note: string
  /** ISO date the figures were captured. Prices go stale; this is how we know. */
  capturedOn: string
}

/** What a model sells for, as a band rather than a number. */
export interface MarketBand {
  lowUgx: number
  highUgx: number
  averageUgx: number
  from: Provenance
  /** Same model elsewhere in the region. Empty until there is real data. */
  elsewhere?: Array<{ place: string; averageUgx: number }>
  /** Twelve monthly averages, oldest first, for the sparkline. */
  trailingYearUgx?: number[]
}

export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  body: BodyType

  /** Engine displacement in litres, and Toyota's own engine code. */
  engineL: number
  engineCode: string
  transmission: string
  drive: Drive
  seats: number

  /** Manufacturer's cycle, not what you will get on Jinja Road. */
  fuelClaimedKmPerL: number
  tankL: number
  lengthMm: number
  bootL?: number
  builtIn: string

  /** How easy the parts are to find in Kampala. The thing owners ask first. */
  partsHere: 'common' | 'available' | 'hard'

  /** A typical example on the market, so a card has something to show. */
  typicalMileageKm: number
  typicalAskingUgx: number

  market?: MarketBand
  pros: string[]
  cons: string[]
}

/** Not sourced yet — and the screens say so wherever this appears. */
function unsourced(capturedOn = '2026-09-13'): Provenance {
  return { kind: 'illustrative', note: 'not yet sourced', capturedOn }
}

/**
 * Eight models, chosen because they are what actually moves in Kampala rather
 * than because they are interesting. The persona file names the first five.
 */
export const VEHICLES: Vehicle[] = [
  {
    id: 'premio-2015',
    make: 'Toyota',
    model: 'Premio',
    year: 2015,
    body: 'saloon',
    engineL: 1.8,
    engineCode: '2ZR-FE',
    transmission: 'CVT',
    drive: 'front',
    seats: 5,
    fuelClaimedKmPerL: 16.0,
    tankL: 60,
    lengthMm: 4595,
    bootL: 470,
    builtIn: 'Japan',
    partsHere: 'common',
    typicalMileageKm: 92_000,
    typicalAskingUgx: 42_500_000,
    market: {
      lowUgx: 36_000_000,
      highUgx: 58_000_000,
      averageUgx: 46_200_000,
      from: unsourced(),
      elsewhere: [
        { place: 'Nairobi', averageUgx: 41_800_000 },
        { place: 'Dar es Salaam', averageUgx: 44_100_000 },
      ],
      trailingYearUgx: [
        49_400_000, 49_000_000, 49_600_000, 48_500_000, 48_000_000, 48_200_000,
        47_300_000, 47_500_000, 46_600_000, 46_800_000, 46_300_000, 46_200_000,
      ],
    },
    pros: ['Roomiest boot in its class', 'Parts on every corner', 'Quiet at highway speed'],
    cons: ['Thirstier than an Axio', 'CVT rebuilds are costly'],
  },
  {
    id: 'allion-2015',
    make: 'Toyota',
    model: 'Allion',
    year: 2015,
    body: 'saloon',
    engineL: 1.8,
    engineCode: '2ZR-FE',
    transmission: 'CVT',
    drive: 'front',
    seats: 5,
    fuelClaimedKmPerL: 16.0,
    tankL: 60,
    lengthMm: 4565,
    bootL: 465,
    builtIn: 'Japan',
    partsHere: 'common',
    typicalMileageKm: 104_000,
    typicalAskingUgx: 40_000_000,
    market: {
      lowUgx: 34_000_000,
      highUgx: 54_000_000,
      averageUgx: 43_500_000,
      from: unsourced(),
    },
    pros: ['Same running gear as the Premio', 'Slightly cheaper to buy'],
    cons: ['Plainer inside', 'Fewer clean examples around'],
  },
  {
    id: 'axio-2016',
    make: 'Toyota',
    model: 'Corolla Axio',
    year: 2016,
    body: 'saloon',
    engineL: 1.5,
    engineCode: '2NR-FKE',
    transmission: 'CVT',
    drive: 'front',
    seats: 5,
    fuelClaimedKmPerL: 23.0,
    tankL: 42,
    lengthMm: 4400,
    bootL: 461,
    builtIn: 'Japan',
    partsHere: 'common',
    typicalMileageKm: 78_000,
    typicalAskingUgx: 34_800_000,
    market: {
      lowUgx: 29_000_000,
      highUgx: 45_000_000,
      averageUgx: 36_400_000,
      from: unsourced(),
    },
    pros: ['Cheapest to run of the three saloons', 'Light on fuel in town', 'Easy to resell'],
    cons: ['Smaller and less comfortable', 'Underpowered fully loaded'],
  },
  {
    id: 'harrier-2014',
    make: 'Toyota',
    model: 'Harrier',
    year: 2014,
    body: 'suv',
    engineL: 2.0,
    engineCode: '3ZR-FAE',
    transmission: 'CVT',
    drive: 'front',
    seats: 5,
    fuelClaimedKmPerL: 16.0,
    tankL: 60,
    lengthMm: 4720,
    bootL: 456,
    builtIn: 'Japan',
    partsHere: 'available',
    typicalMileageKm: 118_000,
    typicalAskingUgx: 71_000_000,
    market: {
      lowUgx: 58_000_000,
      highUgx: 92_000_000,
      averageUgx: 72_500_000,
      from: unsourced(),
    },
    pros: ['Ground clearance for rough roads', 'Holds its value', 'Comfortable over potholes'],
    cons: ['Expensive to buy', 'Body panels are dear'],
  },
  {
    id: 'noah-2014',
    make: 'Toyota',
    model: 'Noah',
    year: 2014,
    body: 'van',
    engineL: 2.0,
    engineCode: '3ZR-FAE',
    transmission: 'CVT',
    drive: 'front',
    seats: 8,
    fuelClaimedKmPerL: 15.0,
    tankL: 55,
    lengthMm: 4695,
    builtIn: 'Japan',
    partsHere: 'common',
    typicalMileageKm: 134_000,
    typicalAskingUgx: 51_500_000,
    market: {
      lowUgx: 42_000_000,
      highUgx: 66_000_000,
      averageUgx: 52_800_000,
      from: unsourced(),
    },
    pros: ['Eight seats', 'Sliding doors suit tight parking', 'Popular, so easy to sell on'],
    cons: ['Handles like the van it is', 'Rear suspension works hard when full'],
  },
  {
    id: 'ipsum-2007',
    make: 'Toyota',
    model: 'Ipsum',
    year: 2007,
    body: 'van',
    engineL: 2.4,
    engineCode: '2AZ-FE',
    transmission: '4-speed automatic',
    drive: 'front',
    seats: 7,
    fuelClaimedKmPerL: 11.0,
    tankL: 60,
    lengthMm: 4640,
    builtIn: 'Japan',
    partsHere: 'common',
    typicalMileageKm: 196_000,
    typicalAskingUgx: 24_000_000,
    market: {
      lowUgx: 18_000_000,
      highUgx: 32_000_000,
      averageUgx: 24_600_000,
      from: unsourced(),
    },
    pros: ['Cheapest way into seven seats', 'Simple engine, any mechanic knows it'],
    cons: ['Heavy on fuel', 'Most examples are tired by now'],
  },
  {
    id: 'vitz-2015',
    make: 'Toyota',
    model: 'Vitz',
    year: 2015,
    body: 'hatch',
    engineL: 1.0,
    engineCode: '1KR-FE',
    transmission: 'CVT',
    drive: 'front',
    seats: 5,
    fuelClaimedKmPerL: 25.0,
    tankL: 36,
    lengthMm: 3885,
    bootL: 238,
    builtIn: 'Japan',
    partsHere: 'common',
    typicalMileageKm: 88_000,
    typicalAskingUgx: 26_500_000,
    market: {
      lowUgx: 21_000_000,
      highUgx: 34_000_000,
      averageUgx: 27_200_000,
      from: unsourced(),
    },
    pros: ['Cheapest to run of anything here', 'Easy to park in town', 'Very common, so cheap parts'],
    cons: ['Struggles on a full load', 'Little boot space', 'Low clearance for rough roads'],
  },
  {
    id: 'rav4-2013',
    make: 'Toyota',
    model: 'RAV4',
    year: 2013,
    body: 'suv',
    engineL: 2.0,
    engineCode: '3ZR-FAE',
    transmission: 'CVT',
    drive: 'all',
    seats: 5,
    fuelClaimedKmPerL: 15.2,
    tankL: 60,
    lengthMm: 4570,
    bootL: 577,
    builtIn: 'Japan',
    partsHere: 'available',
    typicalMileageKm: 142_000,
    typicalAskingUgx: 58_000_000,
    market: {
      lowUgx: 46_000_000,
      highUgx: 76_000_000,
      averageUgx: 59_400_000,
      from: unsourced(),
    },
    pros: ['Proper all-wheel drive', 'Biggest boot here', 'Good upcountry'],
    cons: ['Heavier on fuel than a saloon', 'AWD parts cost more'],
  },
]

export function vehicleById(id: string): Vehicle | undefined {
  return VEHICLES.find((v) => v.id === id)
}

export function vehicleName(v: Vehicle): string {
  return `${v.make} ${v.model}`
}

/** Body types, in the order the filter shows them. */
export const BODY_TYPES: Array<{ key: BodyType; label: string }> = [
  { key: 'saloon', label: 'Saloon' },
  { key: 'suv', label: 'SUV' },
  { key: 'van', label: 'Van' },
  { key: 'hatch', label: 'Hatch' },
]

export const PARTS_LABEL: Record<Vehicle['partsHere'], string> = {
  common: 'Common',
  available: 'Available',
  hard: 'Hard to find',
}

export const DRIVE_LABEL: Record<Drive, string> = {
  front: 'Front',
  rear: 'Rear',
  all: 'All wheel',
}
