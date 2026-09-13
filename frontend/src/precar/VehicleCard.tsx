import { CardButton } from '../ui'
import { moneyShort } from '../lib/money'
import { CarProfile } from './CarProfile'
import { vehicleName, type Vehicle } from '../data/vehicles'

/**
 * One car in a list — the pre-car twin of the mechanic card.
 *
 * Deliberately the same shape as that card rather than a new invention: a
 * thumbnail, a name, one line of the thing you would actually ask about, and
 * the number on the right. Somebody who has used Solutions already knows how
 * to read this.
 *
 * The price is compact ("42.5M") because in a list the magnitude is the point
 * and the exact shilling is noise. The full figure appears on the car's own
 * page, where it is something you might act on.
 */
export function VehicleCard({
  vehicle,
  selected,
  onSelect,
}: {
  vehicle: Vehicle
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <CardButton className="vcard" selected={selected} onClick={onSelect}>
      <span className="vcard__thumb" aria-hidden="true">
        <CarProfile body={vehicle.body} dim={!selected} />
      </span>

      <span className="vcard__body">
        <span className="vcard__name">{vehicleName(vehicle)}</span>
        <span className="vcard__meta">
          {vehicle.year} · {vehicle.engineL.toFixed(1)} petrol ·{' '}
          {vehicle.typicalMileageKm.toLocaleString('en-UG')} km
        </span>
      </span>

      <span className="vcard__price">
        {moneyShort(vehicle.typicalAskingUgx)}
        <small>UGX</small>
      </span>
    </CardButton>
  )
}
