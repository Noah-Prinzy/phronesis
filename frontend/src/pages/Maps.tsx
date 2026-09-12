import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  type SearchKind,
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
 *
 * **The map starts empty but for you.** It used to search on arrival and drop
 * 120 pins on the city, which is not a map of anywhere — it is a directory
 * with a background. Now nothing is marked until something is actually being
 * looked for, either because you searched or because Phronesis sent you here
 * for a reason (`/maps?find=garage`). What is marked is what was asked for.
 */

/** What the search offers. Each is one OSM tag, asked for on its own. */
const KINDS: Array<{ key: SearchKind; label: string; verb: string }> = [
  { key: 'garage', label: 'Mechanics', verb: 'Mechanics near you' },
  { key: 'tyres', label: 'Tyres', verb: 'Tyre places near you' },
  { key: 'parts', label: 'Parts', verb: 'Parts shops near you' },
]
export function Maps() {
  const { status, user } = useAuth()

  const [params, setParams] = useSearchParams()
  const asked = params.get('find') as SearchKind | null

  const [where, setWhere] = useState<Located | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  /** Which search produced what is on the map. Null means nothing is marked. */
  const [showing, setShowing] = useState<SearchKind | null>(null)
  const [busy, setBusy] = useState(false)
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

  const search = useCallback(async (at: Located, kind: SearchKind) => {
    setBusy(true)
    setError(null)
    setShowing(kind)
    try {
      const found = await findPlaces(at.lat, at.lon, [kind])
      if (!alive.current) return
      setError(null)
      setPlaces(found)
      setSelected(found[0]?.id ?? null)
      if (found.length === 0) setError('Nothing of that kind is mapped around here yet.')
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

  /* On arrival: find out where you are, and mark nothing else.
     A search runs only if Phronesis asked for one — she routes here as
     `/maps?find=garage` when the conversation has reached "who can fix it".

     Guarded by a ref rather than by the dependency array, because StrictMode
     mounts every component twice and the second mount fired a second Overpass
     query about a second after the first. Overpass is a free shared service
     that rate-limits exactly that: the first query returned 54 garages, the
     second came back busy, and the busy one landed last — so the page showed
     "could not reach the map data" over a map full of pins. */
  const arrived = useRef(false)
  useEffect(() => {
    if (arrived.current) return
    arrived.current = true
    void (async () => {
      const at = await locate()
      if (!alive.current) return
      setWhere(at)
      if (asked && KINDS.some((k) => k.key === asked)) await search(at, asked)
    })()
    // Runs once. A later `?find=` change is handled by the click that caused it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  function run(kind: SearchKind) {
    if (!where) return
    // The URL carries the search, so the page is linkable and the back button
    // means something — and so Phronesis can send someone straight to it.
    setParams({ find: kind }, { replace: true })
    void search(where, kind)
  }

  function clear() {
    setPlaces([])
    setSelected(null)
    setShowing(null)
    setError(null)
    setParams({}, { replace: true })
  }

  const chosen = places.find((p) => p.id === selected) ?? null
  const active = KINDS.find((k) => k.key === showing) ?? null

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
            {active ? (
              because ? (
                <>
                  {active.label} near you for <b>{because.toLowerCase()}</b>
                </>
              ) : (
                <>{active.verb}</>
              )
            ) : (
              <>What are you looking for?</>
            )}
          </span>
        </div>

        {/* The search. Nothing is on the map until one of these is pressed. */}
        <div className="mp__kinds">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              className="mp__kind"
              data-on={showing === k.key || undefined}
              disabled={!where || busy}
              onClick={() => run(k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>

        <h2 className="label mp__count">
          {busy
            ? 'Looking…'
            : !showing
              ? 'Nothing marked yet'
              : places.length === 0
                ? 'None found'
                : `${places.length} within 6 km`}
        </h2>

        <div className="mp__list">
          {busy ? (
            <p className="mp__msg">Finding what is around you…</p>
          ) : error ? (
            <p className="mp__msg">{error}</p>
          ) : !showing ? (
            <p className="mp__msg">
              Pick one above and I will mark them on the map. Until then the map shows only where
              you are.
            </p>
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
            disabled={!where}
            onClick={() => {
              if (!where) return
              if (showing) void search(where, showing)
            }}
            loading={busy}
          >
            {showing ? 'Search again' : 'Search'}
          </Button>
          {showing ? (
            <Button variant="ghost" onClick={clear}>
              Clear
            </Button>
          ) : null}
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

      {!busy && showing && places.length === 0 && !error ? (
        <div className="mp__empty">
          <EmptyState title="Nothing mapped nearby" body="Try searching again from somewhere else." />
        </div>
      ) : null}
    </main>
  )
}
