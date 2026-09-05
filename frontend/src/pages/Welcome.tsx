import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui'
import { Halo } from '../avatar/Halo'

/**
 * Welcome. One action, and the avatar introduces itself.
 *
 * The avatar sits in `responding` while the introduction is revealing, then
 * settles to `idle` — so the first thing a user sees the ring do is the thing
 * it does when it speaks.
 */
export function Welcome() {
  const navigate = useNavigate()
  const [shown, setShown] = useState(false)
  const [speaking, setSpeaking] = useState(true)

  useEffect(() => {
    const on = window.setTimeout(() => setShown(true), 40)
    const quiet = window.setTimeout(() => setSpeaking(false), 3400)
    return () => {
      window.clearTimeout(on)
      window.clearTimeout(quiet)
    }
  }, [])

  return (
    <main className="screen welcome" data-shown={shown}>
      <p className="welcome__mark">PHRONESIS</p>

      <div className="welcome__body">
        <Halo size={150} state={speaking ? 'responding' : 'idle'} />
        {/*
          Real text nodes between the spans, not `inline-block` siblings.
          An inline-block swallows its trailing space, and the sentence renders
          as "Ihelpyouunderstandyourcar".
        */}
        <p className="welcome__line">
          <span className="reveal" style={{ ['--i' as string]: 0 }}>
            Hey — I&rsquo;m Phronesis.
          </span>{' '}
          <span className="reveal" style={{ ['--i' as string]: 1 }}>
            I help you understand your car:
          </span>{' '}
          <span className="reveal" style={{ ['--i' as string]: 2 }}>
            what&rsquo;s wrong, what it should cost,
          </span>{' '}
          <span className="reveal" style={{ ['--i' as string]: 3 }}>
            and which mechanic to trust.
          </span>
        </p>
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
