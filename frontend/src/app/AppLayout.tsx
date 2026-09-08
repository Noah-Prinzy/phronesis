import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Rail, TabBar } from '../ui'
import type { NavItem } from '../ui'
import {
  IconAccount,
  IconCompare,
  IconDiagnose,
  IconFix,
  IconHome,
  IconMap,
  IconSearch,
} from '../icons'
import { useJourney } from './journey'
import { useMediaQuery } from './useMediaQuery'

/**
 * The hub shell.
 *
 * A rail beside the content at 900px and up, a tab bar under it below. Both
 * are siblings of the page rather than overlays, so no page has to reserve
 * space for the navigation or know how wide it is.
 *
 * Slots 2 and 3 are the only difference between the two journeys: Diagnose
 * and Fix for an owner, Discover and Compare for a buyer. See
 * design/04-precar.md.
 */

type NavKey = '/home' | '/diagnosis' | '/solutions' | '/maps' | '/account' | '/discover' | '/compare'

const OWNER: Array<NavItem<NavKey>> = [
  { value: '/home', label: 'Home', icon: <IconHome /> },
  { value: '/diagnosis', label: 'Diagnose', icon: <IconDiagnose /> },
  { value: '/solutions', label: 'Fix', icon: <IconFix /> },
  { value: '/maps', label: 'Map', icon: <IconMap /> },
  { value: '/account', label: 'Account', icon: <IconAccount /> },
]

const BUYER: Array<NavItem<NavKey>> = [
  { value: '/home', label: 'Home', icon: <IconHome /> },
  { value: '/discover', label: 'Discover', icon: <IconSearch /> },
  { value: '/compare', label: 'Compare', icon: <IconCompare /> },
  { value: '/maps', label: 'Map', icon: <IconMap /> },
  { value: '/account', label: 'Account', icon: <IconAccount /> },
]

export function AppLayout() {
  const { journey } = useJourney()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const wide = useMediaQuery('(min-width: 900px)')

  const owner = journey !== 'buyer'
  const items = owner ? OWNER : BUYER
  // Fall back to Home rather than leaving nothing lit: a nav with no current
  // item reads as "you are nowhere".
  const current = (items.find((i) => i.value === pathname)?.value ?? '/home') as NavKey

  return (
    <div className="hub">
      {wide && (
        <Rail
          items={items}
          value={current}
          onChange={navigate}
          footer={
            owner ? (
              <div className="ph-rail__car">
                <span className="ph-rail__carLabel">Paired</span>
                <span className="ph-rail__carName">2015 Toyota Premio</span>
                <span className="ph-rail__carPlate">UAX 123B</span>
              </div>
            ) : (
              <div className="ph-rail__car">
                <span className="ph-rail__carLabel">Journey</span>
                <span className="ph-rail__carName">Looking to buy</span>
              </div>
            )
          }
        />
      )}

      <div className="hub__main">
        <Outlet />
      </div>

      {!wide && <TabBar items={items} value={current} onChange={navigate} />}
    </div>
  )
}
