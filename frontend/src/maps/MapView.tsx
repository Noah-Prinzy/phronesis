import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Place } from '../lib/places'

/**
 * The map itself.
 *
 * Leaflet rather than MapLibre: forty kilobytes, no key, no build step, and
 * raster tiles need no style JSON. MapLibre is the better engine but wants a
 * vector tile provider, which is a second account before anything renders.
 *
 * **The tiles are Esri's World Dark Gray Base**, which is keyless and free
 * with attribution. CARTO's dark basemap was the first choice and had to be
 * abandoned on sight: it still serves, but every tile now comes back stamped
 * "API KEY REQUIRED" across it. Worth remembering that a keyless tile service
 * can start demanding a key without the request failing — it just quietly
 * ruins the map, and only looking at it catches that.
 *
 * OpenStreetMap's own server is off limits either way: its usage policy
 * forbids production app traffic, and its default style is light, which on
 * this ground would read as a hole punched through the page.
 *
 * Markers are `divIcon`s, deliberately. Leaflet's default marker loads three
 * PNGs by relative path, which every bundler breaks and which would be the
 * wrong colour anyway; a div takes its colour from the app's own tokens.
 */

/**
 * Esri's Canvas basemaps come in two halves, and loading only the first is an
 * easy mistake: `_Base` is the geometry — coastline, roads, water — and
 * `_Reference` is every piece of text on the map, the town names and the road
 * names. A map with only the Base is a diagram of a city with nothing named.
 */
const TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
const LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
const ATTRIBUTION =
  'Places &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; Tiles &copy; Esri'

export interface MapViewProps {
  centre: { lat: number; lon: number }
  /** True when the centre is the user rather than a fallback. */
  exact: boolean
  places: Place[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  className?: string
}

export function MapView({ centre, exact, places, selectedId, onSelect, className }: MapViewProps) {
  const host = useRef<HTMLDivElement | null>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  // Kept in a ref so the marker handlers never close over a stale callback.
  const select = useRef(onSelect)
  select.current = onSelect

  /* Created once. Re-creating a Leaflet map on every render is the classic
     way to end up with a grey box and a leaked container. */
  useEffect(() => {
    if (!host.current || map.current) return
    const m = L.map(host.current, {
      center: [centre.lat, centre.lon],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    })
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 16 }).addTo(m)
    // Above the geometry, below the markers: Leaflet's own overlay pane puts
    // it in the right place without fighting z-index.
    L.tileLayer(LABELS, { maxZoom: 16, pane: 'overlayPane' }).addTo(m)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m


    return () => {
      m.remove()
      map.current = null
      layer.current = null
    }
    // Centre is deliberately not a dependency: moving the map is done below,
    // not by tearing it down and building another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 14 either way: it is the zoom at which the names come on, and arriving
    // below that shows a map of unlabelled dots — the thing this is meant to
    // stop being.
    map.current?.setView([centre.lat, centre.lon], 14, { animate: true })
  }, [centre.lat, centre.lon, exact])

  /* Markers, redrawn whenever the results or the selection change. */
  useEffect(() => {
    const m = map.current
    const group = layer.current
    if (!m || !group) return
    group.clearLayers()

    L.marker([centre.lat, centre.lon], {
      icon: L.divIcon({
        className: 'mv__me',
        html: '<span></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      // The user is context, not a destination.
      interactive: false,
      keyboard: false,
    }).addTo(group)

    for (const p of places) {
      const on = p.id === selectedId
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          // Only the selected pin is named. The basemap now carries its own
          // text — towns, roads — and fifty shop names layered over that turns
          // a readable map back into a smear.
          className: `mv__pin mv__pin--${p.kind}${on ? ' is-on' : ''}`,
          html: `<i></i>${on ? `<b>${escapeHtml(p.name)}</b>` : ''}`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
        // Named, so the map is not a field of unlabelled dots to a screen
        // reader or to anyone tabbing through it.
        alt: p.name,
        title: p.name,
        riseOnHover: true,
      })
        .addTo(group)
        .on('click', () => select.current?.(p.id))
    }
  }, [places, selectedId, centre.lat, centre.lon])

  /* Bring the chosen one into view if it is off-screen, without yanking the
     map about when it is already visible. */
  useEffect(() => {
    const m = map.current
    if (!m || !selectedId) return
    const p = places.find((x) => x.id === selectedId)
    if (!p) return
    if (!m.getBounds().pad(-0.18).contains([p.lat, p.lon])) {
      m.panTo([p.lat, p.lon], { animate: true })
    }
  }, [selectedId, places])

  return <div ref={host} className={className} role="application" aria-label="Map of nearby garages" />
}

/** Marker labels go in as HTML, and a shop name is user-supplied data. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  )
}
