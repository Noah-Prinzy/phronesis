import { moneyShort } from '../lib/money'
import { DRIVE_LABEL, PARTS_LABEL, vehicleName, type Vehicle } from '../data/vehicles'

/**
 * Up to three cars, one row per thing you would actually weigh.
 *
 * **The winner is marked, not coloured.** A dot beside the best figure in each
 * row, because this journey has no severity and green-for-good would be the
 * first crack in a rule the rest of the app keeps. "Best" is also only
 * defined where it means something: there is no better or worse engine size,
 * and marking one would be the app inventing an opinion.
 *
 * On a phone the label column stays put and the rest scrolls sideways. That
 * is the whole reason this is a real `<table>` with `<th scope="row">` rather
 * than a grid of divs — the sticky column and the row headings are the same
 * mechanism, and screen readers get the association for free.
 */

type Direction = 'higher' | 'lower' | null

interface RowSpec {
  label: string
  /** Which way is better, or null when the question is meaningless. */
  better: Direction
  value: (v: Vehicle) => string
  /** The number the comparison actually runs on. */
  rank?: (v: Vehicle) => number
}

const ROWS: RowSpec[] = [
  {
    label: 'Asking',
    better: 'lower',
    value: (v) => moneyShort(v.typicalAskingUgx),
    rank: (v) => v.typicalAskingUgx,
  },
  { label: 'Year', better: 'higher', value: (v) => String(v.year), rank: (v) => v.year },
  { label: 'Engine', better: null, value: (v) => `${v.engineL.toFixed(1)} L` },
  {
    label: 'Fuel use',
    better: 'higher',
    value: (v) => `${v.fuelClaimedKmPerL.toFixed(1)} km/L`,
    rank: (v) => v.fuelClaimedKmPerL,
  },
  {
    label: 'Mileage',
    better: 'lower',
    value: (v) => v.typicalMileageKm.toLocaleString('en-UG'),
    rank: (v) => v.typicalMileageKm,
  },
  { label: 'Seats', better: 'higher', value: (v) => String(v.seats), rank: (v) => v.seats },
  {
    label: 'Boot',
    better: 'higher',
    value: (v) => (v.bootL ? `${v.bootL} L` : '—'),
    rank: (v) => v.bootL ?? -1,
  },
  { label: 'Drive', better: null, value: (v) => DRIVE_LABEL[v.drive] },
  { label: 'Length', better: null, value: (v) => `${v.lengthMm.toLocaleString('en-UG')} mm` },
  { label: 'Tank', better: null, value: (v) => `${v.tankL} L` },
  { label: 'Parts here', better: null, value: (v) => PARTS_LABEL[v.partsHere] },
]

/** Indexes of the cars holding the best value in this row. Ties all win. */
function winners(row: RowSpec, cars: Vehicle[]): Set<number> {
  const out = new Set<number>()
  if (!row.better || !row.rank || cars.length < 2) return out

  const scores = cars.map(row.rank)
  if (scores.some((n) => n < 0)) return out

  const target = row.better === 'higher' ? Math.max(...scores) : Math.min(...scores)
  // Every car scoring the same means the row separates nothing.
  if (scores.every((n) => n === target)) return out

  scores.forEach((n, i) => {
    if (n === target) out.add(i)
  })
  return out
}

export function ComparisonTable({ cars }: { cars: Vehicle[] }) {
  if (cars.length === 0) return null

  return (
    <div className="ctable__scroll">
      <table className="ctable">
        <caption className="ctable__caption">
          A dot marks the better figure, where one row can decide it.
        </caption>
        <thead>
          <tr>
            <td />
            {cars.map((c) => (
              <th key={c.id} scope="col">
                {vehicleName(c)}
                <span>{c.year}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const best = winners(row, cars)
            return (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {cars.map((c, i) => (
                  <td key={c.id} data-best={best.has(i) || undefined}>
                    {row.value(c)}
                    {best.has(i) && <span className="ctable__sr"> — best here</span>}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
