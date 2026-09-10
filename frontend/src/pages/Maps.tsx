import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, EmptyState } from '../ui'
import { MapView } from '../maps/MapView'
import { useAuth } from '../app/auth'
import { loadDiagnoses } from '../lib/userdata'
import {
  directionsUrl,
  findPlaces,
  kindLabel,
  locate,
  OverpassBusyError,
  type Located,
  type Place,
} from '../lib/places'

/**
 * The map: who near you can actually fix it.
 *
 * The last step of the journey — talk, what is wrong, what it costs, who does
 * it — and the only page where being wrong sends someone across a city for
 * nothing. Every place is a real OpenStreetMap entry; there are no invented
 * garages, no invented ratings, and no "open now" badge, because OSM does not
 * know any of that. Measured on central Kampala: 60 places, 60 named, 1 with
 * a phone number, 1 with opening hours.
 *
 * Saying what is missing is the honest version of a directory this thin, and
 * it is more useful than a star rating nobody wrote.
 */
export function Maps() {
  const { status, user } = useAuth()

  const [where, setWhere] = useState<Located | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** What she last found, so the page can say what the search is FOR. */
  const [because, setBecause] = useState<string | null>(null)

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const search = useCallback(async (at: Located) => {
    setBusy(true)
    setError(null)
    try {
      const found = await findPlaces(at.lat, at.lon)
      if (!alive.current) return
      setPlaces(found)
      setSelected(found[0]?.id ?? null)
      if (found.length === 0) setError('Nothing mapped around here yet.')
    } catch (err) {
      if (!alive.current) return
      setPlaces([])
      // Overpass is a free shared service under real load, and "busy" has a
      // different fix from "offline" — one is worth retrying immediately.
      setError(
        err instanceof OverpassBusyError
          ? 'The map data service is busy. Give it a moment and search again.'
          : 'Could not reach the map data. It may be your connection.',
      )
    } finally {
      if (alive.current) setBusy(false)
    }
  }, [])

  /* Find them once, on arrival. */
  useEffect(() => {
    void (async () => {
      const at = await locate()
      if (!alive.current) return
      setWhere(at)
      await search(at)
    })()
  }, [search])

  /* Why they are here, if she has found something. */
  useEffect(() => {
    if (status !== 'signedIn' || !user) return
    void loadDiagnoses(user.uid)
      .then((all) => {
        if (alive.current && all[0]) setBecause(all[0].issue)
      })
      .catch(() => {
        // Context is a nicety; the map works without it.
      })
  }, [status, user])

  const chosen = places.find((p) => p.id === selected) ?? null

  return (
    <main id="main" className="page page--bleed">
      <h1 className="page__title sr-only">Map</h1>

      {where ? (
        <MapView
          className="mv"
          centre={where}
          exact={where.exact}
          places={places}
          selectedId={selected}
          onSelect={setSelected}
        />
      ) : (
        <div className="mv mv--placeholder" />
      )}

      {/* the list */}
      <aside className="mp__panel">
        <div className="mp__why">
          <span className="mp__whydot" />
          <span className="mp__whytext">
            {because ? (
              <>
                Garages near you for <b>{because.toLowerCase()}</b>
              </>
            ) : (
              <>Car repair near you</>
            )}
          </span>
        </div>

        <h2 className="label mp__count">
          {busy
            ? 'Looking…'
            : places.length === 0
              ? 'None found'
              : `${places.length} within 6 km`}
        </h2>

        <div className="mp__list">
          {busy ? (
            <p className="mp__msg">Finding what is around you…</p>
          ) : error ? (
            <p className="mp__msg">{error}</p>
          ) : (
            places.map((p) => (
              <button
                key={p.id}
                type="button"
                className="mp__shop"
                data-on={p.id === selected || undefined}
                onClick={() => setSelected(p.id)}
              >
                <span className="mp__shopmain">
                  <span className="mp__shopname">{p.name}</span>
                  <span className="mp__shopkind">{kindLabel(p.kind)}</span>
                </span>
                <span className="mp__shopdist num">
                  {p.distanceKm !== undefined ? `${p.distanceKm.toFixed(1)} km` : ''}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="mp__foot">
          <Button
            variant="secondary"
            onClick={() => {
              if (where) void search(where)
            }}
            loading={busy}
          >
            Search again
          </Button>
          <span className="mp__source num">
            {where?.exact
              ? 'Places from OpenStreetMap · distances straight-line'
              : 'Showing central Kampala — allow location for what is near you'}
          </span>
        </div>
      </aside>

      {/* the chosen one, on the right so it can never sit over the list */}
      {chosen ? (
        <aside className="mp__card">
          <h2 className="mp__cardname">{chosen.name}</h2>
          <div className="mp__cardrow">
            <span>Type</span>
            <span className="num">{kindLabel(chosen.kind)}</span>
          </div>
          {chosen.distanceKm !== undefined ? (
            <div className="mp__cardrow">
              <span>Distance</span>
              <span className="num">{chosen.distanceKm.toFixed(1)} km</span>
            </div>
          ) : null}
          {chosen.phone ? (
            <div className="mp__cardrow">
              <span>Phone</span>
              <span className="num">{chosen.phone}</span>
            </div>
          ) : null}
          {chosen.hours ? (
            <div className="mp__cardrow">
              <span>Hours</span>
              <span className="num">{chosen.hours}</span>
            </div>
          ) : null}

          {!chosen.phone && !chosen.hours ? (
            <p className="mp__known">
              OpenStreetMap has no phone number or opening hours for this one — which is true
              of almost every garage in Kampala. Worth calling ahead if you find a number.
            </p>
          ) : null}

          <a
            className="ph-btn mp__go"
            data-variant="secondary"
            data-size="md"
            href={directionsUrl(chosen)}
            target="_blank"
            rel="noreferrer noopener"
          >
            Directions
          </a>
        </aside>
      ) : null}

      {!busy && places.length === 0 && !error ? (
        <div className="mp__empty">
          <EmptyState title="Nothing mapped nearby" body="Try searching again from somewhere else." />
        </div>
      ) : null}
    </main>
  )
}
