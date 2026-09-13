import { createBrowserRouter } from 'react-router-dom'
import { Root } from './Root'
import { AppLayout } from './AppLayout'
import { Loading } from '../pages/Loading'
import { Welcome } from '../pages/Welcome'
import { OnboardingAccount, OnboardingJourney, OnboardingPair } from '../pages/Onboarding'
import { Home } from '../pages/Home'
import { Diagnosis } from '../pages/Diagnosis'
import { Solutions } from '../pages/Solutions'
import { Account } from '../pages/Account'
import { Maps } from '../pages/Maps'
import { Discover } from '../pages/Discover'
import { Compare } from '../pages/Compare'
import { StyleGuide } from '../styleguide/StyleGuide'

/**
 * The entry flow:
 *
 *   /  →  /welcome  →  /start  →  /join  →  /home
 *
 * Two required steps, not four. The name is collected on `/join` alongside the
 * account rather than on a screen of its own, and `/pair` — which is optional,
 * skippable and mocked — is no longer in the flow at all. It stays routable
 * because Account links to it.
 *
 * Everything under AppLayout is the hub: it carries the nav, and the nav's
 * slots 2 and 3 swap with the journey.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Loading /> },
      { path: 'welcome', element: <Welcome /> },
      { path: 'start', element: <OnboardingJourney /> },
      { path: 'join', element: <OnboardingAccount /> },
      { path: 'pair', element: <OnboardingPair /> },

      {
        element: <AppLayout />,
        children: [
          { path: 'home', element: <Home /> },
          { path: 'diagnosis', element: <Diagnosis /> },
          { path: 'solutions', element: <Solutions /> },
          { path: 'maps', element: <Maps /> },
          { path: 'account', element: <Account /> },
          { path: 'discover', element: <Discover /> },
          { path: 'compare', element: <Compare /> },
        ],
      },

      // The atom gallery. Lives on a route so it is always reachable and can
      // never drift from the components the pages actually import.
      { path: 'styleguide', element: <StyleGuide /> },
    ],
  },
])
