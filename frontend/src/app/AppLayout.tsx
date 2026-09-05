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
 * One nav definition, two presentations — the tab bar below 768px, the rail at
 * or above it. Both read the same array, so they cannot disagree about what
 * the app contains.
 *
 * Slots 2 and 3 are the *only* difference between the two journeys: Diagnosis
 * and Solutions for an owner, Discover and Compare for a buyer. Everything
 * else is shared. See design/04-precar.md.
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
  const wide = useMediaQuery('(min-width: 768px)')

  const items = journey === 'buyer' ? BUYER : OWNER
  // Fall back to Home rather than leaving nothing lit: a nav with no current
  // item reads as "you are nowhere".
  const current = (items.find((i) => i.value === pathname)?.value ?? '/home') as NavKey

  const go = (v: NavKey) => navigate(v)

  return (
    <div className="hub" data-wide={wide}>
      {wide && <Rail items={items} value={current} onChange={go} />}
      <div className="hub__main">
        <Outlet />
      </div>
      {!wide && <TabBar items={items} value={current} onChange={go} />}
    </div>
  )
}
