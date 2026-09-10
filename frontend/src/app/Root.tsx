import { Outlet } from 'react-router-dom'
import { JourneyProvider } from './journey'
import { AuthProvider } from './auth'
import { VoiceProvider } from './voice'
import { CarProvider } from './car'
import { Surface } from './Surface'
import { AlertsProvider } from './alerts'
import { FocusProvider } from './focus'
import { useRouteAnnounce } from './useRouteAnnounce'
import '../styles/tokens.css'
import '../styles/atoms.css'
import '../styles/pages.css'

/**
 * The app shell. No markup of its own: it announces route changes for screen
 * readers and holds the four pieces of state the whole app branches on — the
 * signed-in user, the journey, the voice setting, and what Phronesis is
 * currently pointing at.
 */
export function Root() {
  useRouteAnnounce()
  return (
    <AuthProvider>
      <Surface />
      <JourneyProvider>
        <VoiceProvider>
          <CarProvider>
          <AlertsProvider>
          <FocusProvider>
            {/* First tab stop on every page. Keyboard users should not have to
                walk the whole navigation to reach the content. */}
            <a className="ph-skip" href="#main">
              Skip to content
            </a>
            <Outlet />
          </FocusProvider>
          </AlertsProvider>
          </CarProvider>
        </VoiceProvider>
      </JourneyProvider>
    </AuthProvider>
  )
}
