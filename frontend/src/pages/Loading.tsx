import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Halo } from '../avatar/Halo'
import { useRem } from '../app/useRootFontSize'
import { useAuth } from '../app/auth'
import { useMediaQuery } from '../app/useMediaQuery'

/** Long enough to read as arrival, short enough not to be a wait. */
const HOLD_MS = 1400

/**
 * The splash.
 *
 * It also does one useful thing: it waits for Firebase to say whether there is
 * a session, and sends a returning user straight to the hub. Showing someone
 * who signed in last week a "Get started" screen is a small insult.
 */
export function Loading() {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 768px)')
  const size = useRem(wide ? 9 : 7)
  const { status } = useAuth()
  const [held, setHeld] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setHeld(true), HOLD_MS)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    // Both conditions: the minimum hold has passed AND auth has resolved.
    // Leaving on 'loading' would gamble on which screen the user gets.
    if (!held || status === 'loading') return
    navigate(status === 'signedIn' ? '/home' : '/welcome', { replace: true })
  }, [held, status, navigate])

  return (
    <main id="main" className="splash">
      <Halo size={size} state="thinking" />
      <span className="splash__mark">PHRONESIS</span>
    </main>
  )
}
