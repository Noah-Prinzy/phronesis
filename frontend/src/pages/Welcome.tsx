import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, SpokenText } from '../ui'
import { Halo } from '../avatar/Halo'
import { useRem } from '../app/useRootFontSize'
import { useMediaQuery } from '../app/useMediaQuery'
import { useSpeak } from '../app/useSpeak'
import { WELCOME } from '../app/lines'

/**
 * What he says — and, a word at a time, what appears.
 *
 * The paragraph is not printed and then narrated. It arrives as he speaks
 * it, which is the difference between someone talking to you and someone
 * reading you a page that was already there.
 *
 * The words themselves live in `app/lines.ts` so the build can render them
 * to audio ahead of time — this is the first thing anyone hears, and it now
 * plays instantly instead of after a round trip.
 */
const SPOKEN = WELCOME

export function Welcome() {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 768px)')
  const size = useRem(wide ? 9.6 : 7.6)
  const { talking, speak, progress } = useSpeak()

  useEffect(() => {
    speak(SPOKEN)
    // Runs once, on mount — the line plays exactly once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main id="main" className="screen welcome">
      <div className="welcome__stage">
        <Halo size={size} state={talking ? 'responding' : 'idle'} />
      </div>

      <div className="welcome__text">
        <span className="label">Phronesis</span>
        <h1 className="welcome__title">Your car, explained.</h1>
        <SpokenText text={SPOKEN} progress={progress} className="welcome__line" />
      </div>

      <div className="welcome__actions">
        <Button variant="primary" size="lg" wide onClick={() => navigate('/start')}>
          Get started
        </Button>
        <Button variant="ghost" wide onClick={() => navigate('/join')}>
          I&rsquo;ve used Phronesis before
        </Button>
      </div>
    </main>
  )
}
