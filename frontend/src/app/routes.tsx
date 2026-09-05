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
import { Placeholder } from '../pages/Placeholder'
import { StyleGuide } from '../styleguide/StyleGuide'

/**
 * The entry flow, exactly as design/03-breakpoints.md describes it:
 *
 *   /  →  /welcome  →  /start  →  /join  →  /pair  →  /home
 *
 * `/pair` is owner-only and redirects a buyer straight to /home, which is what
 * makes the two-step buyer flow real rather than a claim on a progress bar.
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
          {
            path: 'discover',
            element: <Placeholder title="Discover" body="Browse and ask. Phase 3 — see design/04-precar.md." />,
          },
          {
            path: 'compare',
            element: <Placeholder title="Compare" body="Three cars side by side, with Market as a tab. Phase 3." />,
          },
        ],
      },

      // The atom gallery. Lives on a route so it is always reachable and can
      // never drift from the components the pages actually import.
      { path: 'styleguide', element: <StyleGuide /> },
    ],
  },
])
