/**
 * Real garages, from OpenStreetMap.
 *
 * **Why OSM and not a curated list.** A fabricated mechanic is someone driving
 * across Kampala to a business that does not exist, which is a different order
 * of wrong from a placeholder button. Every place here is a real entry someone
 * has mapped.
 *
 * **What OSM actually has, measured rather than assumed.** Querying central
 * Kampala returned 60 places, all named — and essentially nothing else:
 * 1/60 with a phone number, 1/60 with opening hours, 3/60 with a street.
 * Ratings and reviews do not exist in OSM at all.
 *
 * So this returns a name, a kind, and a position. The UI shows exactly that
 * and says what is missing, rather than dressing it with stars nobody wrote.
 * If coverage proves too thin in practice, Google Places has better business
 * data in Uganda — at the cost of a key, billing, and terms that forbid
 * storing most of it.
 */

export type PlaceKind = 'garage' | 'tyres' | 'parts' | 'fuel'

export interface Place {
  id: string
  name: string
  kind: PlaceKind
  lat: number
  lon: number
  /** Straight-line km from the user. Absent when we do not know where they are. */
  distanceKm?: number
  phone?: string
  hours?: string
}

const KIND_LABEL: Record<PlaceKind, string> = {
  garage: 'Garage',
  tyres: 'Tyres',
  parts: 'Parts',
  fuel: 'Fuel',
}

export function kindLabel(k: PlaceKind): string {
  return KIND_LABEL[k]
}

const OVERPASS = 'https://overpass-api.de/api/interpreter'

/** Distinguishable from a network failure, because the fix is "wait a moment"
    rather than "check your connection". */
export class OverpassBusyError extends Error {}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function kindOf(tags: Record<string, string>): PlaceKind | null {
  if (tags.shop === 'car_repair') return 'garage'
  if (tags.shop === 'tyres') return 'tyres'
  if (tags.shop === 'car_parts') return 'parts'
  if (tags.amenity === 'fuel') return 'fuel'
  return null
}

/** Great-circle distance. Straight-line, and the UI says so — Kampala traffic
    makes any "minutes away" figure a fiction without a routing service. */
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLon = ((bLon - aLon) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/**
 * Everything car-related within `radiusKm` of a point.
 *
 * Overpass is a shared public service with no key and no quota, which is
 * exactly why it deserves care: one query per search, never per keystroke,
 * and a timeout so a slow response cannot hold the page.
 */
/** The OSM tag behind each kind, so a search can ask for one thing. */
const OSM_SHOP: Record<Exclude<PlaceKind, 'fuel'>, string> = {
  garage: 'car_repair',
  tyres: 'tyres',
  parts: 'car_parts',
}

export type SearchKind = Exclude<PlaceKind, 'fuel'>

export async function findPlaces(
  lat: number,
  lon: number,
  kinds: SearchKind[] = ['garage'],
  radiusKm = 6,
  signal?: AbortSignal,
): Promise<Place[]> {
  const r = Math.round(radiusKm * 1000)
  // Asking for one kind at a time is the difference between an answer and a
  // directory: central Kampala has 23 garages and 89 parts shops, and someone
  // with a brake fault should not scroll past the spares dealers to find a
  // mechanic.
  const shops = (kinds.length ? kinds : (['garage'] as SearchKind[])).map((k) => OSM_SHOP[k])
  // `nwr` covers nodes, ways and relations in one pass; `out center` gives a
  // single coordinate for the ways, which would otherwise be a polygon.
  const q = `[out:json][timeout:25];
nwr["shop"~"^(${shops.join('|')})$"](around:${r},${lat},${lon});
out center 120;`

  const res = await fetch(OVERPASS, {
    method: 'POST',
    body: new URLSearchParams({ data: q }),
    signal,
  })
  if (!res.ok) throw new Error(`Overpass returned ${res.status}`)

  /**
   * Overpass answers a BUSY server with 200 and an XML error document, not an
   * error status — so `res.json()` throws "Unexpected token '<'" and the page
   * reports a failure it cannot explain. Seen live on the first call of a
   * pair, with the second succeeding seconds later. Reading the text first
   * turns an overloaded free service into a message worth showing.
   */
  const raw = await res.text()
  if (raw.trimStart().startsWith('<')) {
    throw new OverpassBusyError('The map data service is busy right now.')
  }

  let body: { elements?: OverpassElement[] }
  try {
    body = JSON.parse(raw) as { elements?: OverpassElement[] }
  } catch {
    throw new OverpassBusyError('The map data service returned something unreadable.')
  }
  const seen = new Set<string>()

  return (body.elements ?? [])
    .flatMap((e) => {
      const tags = e.tags ?? {}
      const kind = kindOf(tags)
      const name = tags.name?.trim()
      const at = e.center ?? (e.lat !== undefined && e.lon !== undefined ? { lat: e.lat, lon: e.lon } : null)
      // An unnamed garage is not something anyone can be sent to, so it is
      // dropped rather than shown as "Unnamed".
      if (!kind || !name || !at) return []

      // The same business is often mapped as both a node and a building.
      const key = `${name.toLowerCase()}|${at.lat.toFixed(3)}|${at.lon.toFixed(3)}`
      if (seen.has(key)) return []
      seen.add(key)

      return [
        {
          id: `${e.type}/${e.id}`,
          name,
          kind,
          lat: at.lat,
          lon: at.lon,
          distanceKm: distanceKm(lat, lon, at.lat, at.lon),
          phone: tags.phone ?? tags['contact:phone'],
          hours: tags.opening_hours,
        } satisfies Place,
      ]
    })
    .toSorted((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
}

/** Kampala, for when we cannot ask the browser where the user is. */
export const KAMPALA = { lat: 0.3152, lon: 32.5816 }

export interface Located {
  lat: number
  lon: number
  /** False when this is the fallback rather than the real position. */
  exact: boolean
}

/**
 * Where the user is, or a sensible stand-in.
 *
 * Never rejects. A denied permission is a normal answer, not an error — most
 * people say no the first time — so this resolves to Kampala and the UI says
 * it is showing the city centre rather than them.
 */
export function locate(timeoutMs = 8000): Promise<Located> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ...KAMPALA, exact: false })
      return
    }
    let settled = false
    const done = (v: Located) => {
      if (settled) return
      settled = true
      resolve(v)
    }
    navigator.geolocation.getCurrentPosition(
      (p) => done({ lat: p.coords.latitude, lon: p.coords.longitude, exact: true }),
      () => done({ ...KAMPALA, exact: false }),
      { timeout: timeoutMs, maximumAge: 300_000 },
    )
    // Some browsers never call either callback when permission is dismissed
    // rather than answered, so the page cannot be left waiting on it.
    setTimeout(() => done({ ...KAMPALA, exact: false }), timeoutMs + 500)
  })
}

/**
 * Hand the actual navigating to a real maps app.
 *
 * Building turn-by-turn on top of a tile layer would be a worse version of
 * something already on every phone, and it is the one part of this journey
 * where being second-best actively matters.
 */
export function directionsUrl(p: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`
}
