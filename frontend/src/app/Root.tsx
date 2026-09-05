import { Outlet } from 'react-router-dom'
import { usePressLight } from '../ui'
import { JourneyProvider } from './journey'
import '../styles/tokens.css'
import '../styles/atoms.css'
import '../styles/pages.css'

/**
 * The app shell. Two responsibilities and no markup of its own: install the
 * one delegated press-is-light listener, and hold the journey the whole flow
 * branches on.
 */
export function Root() {
  usePressLight()
  return (
    <JourneyProvider>
      <Outlet />
    </JourneyProvider>
  )
}
