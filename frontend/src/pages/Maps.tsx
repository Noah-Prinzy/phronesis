import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, IconButton, SearchField, StarRating } from '../ui'
import { MapCanvas } from '../maps/MapCanvas'
import { MECHANICS, SELLERS } from '../data/places'
import type { Place } from '../data/places'
import { useJourney } from '../app/journey'
import { useMediaQuery } from '../app/useMediaQuery'

type Filter = 'speciality' | 'open' | 'near'

/** Rating and opening hours, or an honest blank for a private seller. */
function PlaceMeta({ place }: { place: Place }) {
  if (place.rating <= 0) {
    return <span className="map__meta">Private seller · no rating yet</span>
  }
  return (
    <>
      <StarRating value={place.rating} label={`${place.name} rating`} />
      <span className="map__meta">
        {place.rating} · {place.openNow ? `open until ${place.closesAt}` : 'closed'}
      </span>
    </>
  )
}

/**
 * Maps.
 *
 * The map is the page; everything else is glass laid over it. The one hard
 * rule, learned by breaking it in the mockup: **the chrome lives in the
 * layout flow, not absolutely positioned over the map**. Floating the search
 * row, the filters, the ETA and the sheet independently is what made them
 * collide — twice, at different heights, on different devices.
 */
export function Maps() {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 768px)')
  const { journey } = useJourney()
  const owner = journey !== 'buyer'

  const all = owner ? MECHANICS : SELLERS
  const [selectedId, setSelectedId] = useState<string | null>(all[0]?.id ?? null)
  const [filters, setFilters] = useState<Set<Filter>>(() => new Set<Filter>(['speciality']))

  const toggle = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })

  const places = useMemo(() => {
    let out = all
    if (filters.has('open')) out = out.filter((p) => p.openNow)
    if (filters.has('near')) out = out.filter((p) => p.distanceKm <= 5)
    return out
  }, [all, filters])

  // A filter can hide what is selected. Fall back rather than leaving the
  // sheet describing a place that is no longer on the map.
  const selected: Place | null =
    places.find((p) => p.id === selectedId) ?? places[0] ?? null

  const searchLabel = owner ? 'Search mechanics' : 'Search dealers and sellers'
  const searchHint = owner ? 'Brake specialists near Ntinda' : 'Premio 2014 near Kampala'

  const chips = (
    <div className="map__filters">
      <Chip pressed={filters.has('speciality')} onClick={() => toggle('speciality')}>
        {owner ? 'Brakes' : 'Dealers'}
      </Chip>
      <Chip pressed={filters.has('open')} onClick={() => toggle('open')}>
        Open now
      </Chip>
      <Chip pressed={filters.has('near')} onClick={() => toggle('near')}>
        Under 5 km
      </Chip>
    </div>
  )

  /* --------------------------------------------------------------- desktop */
  if (wide) {
    return (
      <main className="map map--wide">
        <aside className="map__panel">
          <SearchField label={searchLabel} placeholder={searchHint} />
          {chips}
          <div className="map__list">
            {places.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === selected?.id}
                className="map__item ph-pressable"
                onClick={() => setSelectedId(p.id)}
              >
                <span className="map__itemTop">
                  <span className="map__itemName">{p.name}</span>
                  <span className="map__itemDist">{p.distanceKm} km</span>
                </span>
                <span className="map__itemMeta">
                  <PlaceMeta place={p} />
                </span>
                {p.id === selected?.id && (
                  <span className="map__eta map__eta--inline">
                    {p.etaMin} min · light traffic
                  </span>
                )}
              </button>
            ))}
            {places.length === 0 && (
              <p className="map__empty">Nothing matches those filters. Try widening them.</p>
            )}
          </div>
        </aside>

        <div className="map__stage">
          <MapCanvas places={places} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        </div>
      </main>
    )
  }

  /* ----------------------------------------------------------------- phone
     Layout order matters here: chrome, then a flexible spacer that lets the
     map show through, then the sheet. Nothing is absolutely positioned, so
     nothing can land on anything else however tall the sheet grows. */
  return (
    <main className="map">
      <MapCanvas
        places={places}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
        className="map__canvas--behind"
      />

      <div className="map__chrome">
        <div className="map__searchRow">
          <IconButton label="Back" className="map__glassBtn" onClick={() => navigate('/home')}>
            <BackIcon />
          </IconButton>
          <SearchField label={searchLabel} placeholder={searchHint} className="map__search" />
        </div>
        {chips}
        {selected && (
          <span className="map__eta">
            <NavIcon />
            <b>{selected.etaMin} min</b>
            <span className="dimmed">
              · {selected.distanceKm} km · light traffic
            </span>
          </span>
        )}
      </div>

      <div className="map__spacer" />

      {selected ? (
        <section className="map__sheet">
          <span className="map__grip" />
          <div className="map__sheetTop">
            <span className="map__sheetName">{selected.name}</span>
            <span className="map__itemDist">{selected.distanceKm} km</span>
          </div>
          <div className="map__itemMeta">
            <PlaceMeta place={selected} />
          </div>
          <div className="map__actions">
            <Button size="sm" className="map__primary">
              Directions
            </Button>
            <Button size="sm" variant="secondary">
              Call
            </Button>
          </div>
        </section>
      ) : (
        <section className="map__sheet">
          <span className="map__grip" />
          <p className="map__empty">Nothing matches those filters. Try widening them.</p>
        </section>
      )}
    </main>
  )
}

/* -------------------------------------------------------------------- icons */

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function NavIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l7 19-7-4-7 4z" />
    </svg>
  )
}
