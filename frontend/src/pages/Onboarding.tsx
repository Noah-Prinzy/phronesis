import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CardButton, SectionHead, Spinner, SpokenText, Steps } from '../ui'
import { Halo } from '../avatar/Halo'
import { IconPlug } from '../icons'
import { useRem } from '../app/useRootFontSize'
import { useJourney } from '../app/journey'
import { useSpeak } from '../app/useSpeak'

export { OnboardingAccount } from './onboarding-account'

/** Two screens: the branch, then the account. Nothing else is required. */
export const ONBOARDING_STEPS = 2

/* ============================================================ step 1 · journey
   No login yet. The answer here is the branch: it decides which pages fill
   nav slots 2 and 3 for the rest of the app. See design/04-precar.md. */

/** Asked aloud, and written as it is asked. */
const JOURNEY_ASK =
  "So before anything else — have you already got a car, or are you still shopping for one?"

export function OnboardingJourney() {
  const heroSize = useRem(7.2)
  const navigate = useNavigate()
  const { setJourney } = useJourney()
  const { talking, speak, progress } = useSpeak()

  useEffect(() => {
    speak(JOURNEY_ASK)
    // Runs once, on mount — the line plays exactly once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function choose(j: 'owner' | 'buyer') {
    setJourney(j)
    navigate('/join')
  }

  return (
    <main id="main" className="screen onboarding">
      <Steps total={ONBOARDING_STEPS} current={1} className="onboarding__steps" />

      <div className="onboarding__body">
        <div className="onboarding__intro">
          <Halo size={heroSize} state={talking ? 'responding' : 'idle'} />
          <SpokenText text={JOURNEY_ASK} progress={progress} className="onboarding__ask" />
          <p className="onboarding__sub">You can change this later in Account.</p>
        </div>

        <div className="onboarding__choices">
          <CardButton onClick={() => choose('owner')} className="choice">
            <span className="choice__name">I own a car</span>
            <span className="choice__note">
              Diagnose faults, watch its health, find mechanics you can trust.
            </span>
          </CardButton>
          <CardButton onClick={() => choose('buyer')} className="choice">
            <span className="choice__name">Not yet</span>
            <span className="choice__note">
              Compare models, check what they really cost, find sellers.
            </span>
          </CardButton>
        </div>
      </div>
    </main>
  )
}

/* ============================================================= pairing · OBD
   No longer part of onboarding. It is entirely optional, it is skippable, and
   putting it in the required flow bought a step that most people skipped —
   so it lives in Account now and is reached deliberately. */

interface Reader {
  name: string
  mac: string
  strong: boolean
}

const FOUND: Reader[] = [
  { name: 'ELM327 v1.5', mac: '00:1D:A5:68:98:8B', strong: true },
  { name: 'OBDII', mac: '00:0D:18:3A:67:12', strong: false },
]

export function OnboardingPair() {
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(true)
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setScanning(false), 2600)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <main id="main" className="screen onboarding">
      <div className="onboarding__body">
        <div>
          <h1 className="onboarding__title">Pair a reader</h1>
          <p className="onboarding__sub">
            An OBD reader plugs in under your dash and lets me read the engine directly. Phronesis
            works without one — you would describe symptoms instead, and I would reason from those.
          </p>
        </div>

        <div className="scan">
          <SectionHead>
            {scanning ? 'Looking for readers' : `${FOUND.length} readers found`}
          </SectionHead>

          {scanning && (
            <span className="scan__status">
              <Spinner size={12} /> Scanning…
            </span>
          )}

          {!scanning &&
            FOUND.map((r) => (
              <CardButton
                key={r.mac}
                selected={picked === r.mac}
                onClick={() => setPicked(r.mac)}
                className="reader"
              >
                <span className="reader__icon" aria-hidden="true">
                  <IconPlug size={16} />
                </span>
                <span className="reader__text">
                  <span className="reader__name">{r.name}</span>
                  <span className="reader__mac">
                    {r.mac} · {r.strong ? 'strong signal' : 'weak signal'}
                  </span>
                </span>
              </CardButton>
            ))}
        </div>
      </div>

      <div className="onboarding__actions">
        <Button
          variant="primary"
          size="lg"
          wide
          disabled={!picked}
          onClick={() => navigate('/account')}
        >
          {picked ? 'Pair reader' : 'Select a reader'}
        </Button>
        <Button variant="ghost" wide onClick={() => navigate(-1)}>
          Not now
        </Button>
      </div>
    </main>
  )
}
