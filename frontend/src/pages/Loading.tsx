import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Halo } from '../avatar/Halo'
import { useMediaQuery } from '../app/useMediaQuery'

const HOLD_MS = 2200

/**
 * The intro. First frame of the product, and the only screen with no control
 * on it at all.
 *
 * The avatar arrives as the letter it will keep being — the O of the wordmark
 * is the same renderer that runs the hero on Welcome and the microphone on
 * Home. That is the point of the screen: the thing you talk to and the thing
 * on the splash are visibly one object, not a logo that later becomes a
 * character.
 */
export function Loading() {
  const navigate = useNavigate()
  const [lit, setLit] = useState(false)
  const wide = useMediaQuery('(min-width: 768px)')
  // The ring's visible diameter is 0.66 of its canvas, so ~17% of the box is
  // empty on each side. The wordmark closes that gap back up — minus 2px, so
  // the letters sit beside the ring rather than inside it.
  const oSize = wide ? 54 : 34

  useEffect(() => {
    // The reveal is driven by a class the JS *removes*, never one it adds.
    // Content that starts at opacity:0 waiting to be animated in is a blank
    // screen the moment anything upstream fails.
    const on = window.setTimeout(() => setLit(true), 40)
    const go = window.setTimeout(() => navigate('/welcome', { replace: true }), HOLD_MS)
    return () => {
      window.clearTimeout(on)
      window.clearTimeout(go)
    }
  }, [navigate])

  return (
    <main className="screen screen--center intro" data-lit={lit}>
      <div className="intro__stack">
        <h1 className="lockup">
          <span className="lockup__part">PHR</span>
          <Halo
            size={oSize}
            state="idle"
            className="lockup__o"
            style={{ ['--o-size' as string]: `${oSize}px` }}
          />
          <span className="lockup__part">NESIS</span>
        </h1>
        <p className="intro__tag">Understand before you repair.</p>
      </div>

      <div className="intro__bar" role="progressbar" aria-label="Starting">
        <span />
      </div>
    </main>
  )
}
