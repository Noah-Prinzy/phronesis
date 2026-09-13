import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CardButton, SectionHead, SpokenText, Steps } from '../ui'
import { Halo } from '../avatar/Halo'
import { IconPlug } from '../ui/icons'
import { useRem } from '../app/useRootFontSize'
import { useJourney } from '../app/journey'
import { useSpeak } from '../voice/useSpeak'
import { JOURNEY_ASK, READER_SUPPORTED, READER_UNSUPPORTED } from '../voice/lines'
import { RECOMMENDED_HARDWARE, detectTransport, pairReader, unavailableReason } from '../lib/obd'
import type { ObdTransportKind, PairedReader } from '../lib/obd'

export { OnboardingAccount } from './OnboardingAccount'

/** Two screens: the branch, then the account. Nothing else is required. */
export const ONBOARDING_STEPS = 2

/* ============================================================ step 1 · journey
   No login yet. The answer here is the branch: it decides which pages fill
   nav slots 2 and 3 for the rest of the app. See design/04-precar.md. */

/* Asked aloud, and written as it is asked. The words live in `app/lines.ts`
   so the build can render them to audio ahead of time. */

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
    <main id="main" className="screen onboarding onboarding--center">
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

/* ================================================================ step 3 · OBD
   Optional, and reachable later from Account. */

/**
 * Pair a reader.
 *
 * **There is no device list here on purpose.** Every platform that can reach
 * Bluetooth insists on showing its *own* chooser, from a user gesture, and
 * will not hand a web page a list of what is nearby — that is the privacy
 * model, not a limitation to work around. So this screen has one button, and
 * the list you see after tapping it belongs to the operating system.
 *
 * What the app can say usefully is everything either side of that: whether
 * this platform can pair at all, what to buy if it cannot, and whether the
 * adapter that answered is actually talking to a car.
 */
export function OnboardingPair() {
  const navigate = useNavigate()
  const avatarSize = useRem(3.6)
  const { talking, speak, progress } = useSpeak()

  const [transport] = useState<ObdTransportKind>(() => detectTransport())
  const [phase, setPhase] = useState<'idle' | 'pairing' | 'paired'>('idle')
  const [reader, setReader] = useState<PairedReader | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supported = transport !== 'none'

  const ask = supported ? READER_SUPPORTED : READER_UNSUPPORTED

  useEffect(() => {
    speak(ask)
    // Once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A half-open connection keeps the adapter claimed, so nothing else can see
  // it — including this app on the next attempt.
  useEffect(() => {
    return () => {
      reader?.connection.disconnect().catch(() => {})
    }
  }, [reader])

  async function pair() {
    setError(null)
    setPhase('pairing')
    try {
      const paired = await pairReader()
      setReader(paired)
      setPhase('paired')
    } catch (err) {
      // A cancelled chooser is not a failure; it is a person changing their
      // mind, and saying "something went wrong" to that is a small lie.
      const cancelled = err instanceof Error && /cancel|User cancelled|NotFoundError/i.test(err.message)
      setError(cancelled ? null : err instanceof Error ? err.message : 'Could not pair that reader.')
      setPhase('idle')
    }
  }

  return (
    <main id="main" className="screen onboarding">
      <Steps total={ONBOARDING_STEPS} current={2} className="onboarding__steps" />

      <div className="onboarding__body">
        <div className="onboarding__greet">
          <Halo size={avatarSize} state={phase === 'pairing' ? 'thinking' : talking ? 'responding' : 'idle'} />
          <SpokenText text={ask} progress={progress} className="greet__line" />
        </div>

        {supported ? (
          <div className="scan">
            {phase === 'paired' && reader ? (
              <>
                <SectionHead>Connected</SectionHead>
                <div className="reader">
                  <span className="reader__icon" aria-hidden="true">
                    <IconPlug size={16} />
                  </span>
                  <span className="reader__text">
                    <span className="reader__name">{reader.device.name}</span>
                    <span className="reader__mac">{reader.session.adapter}</span>
                  </span>
                </div>
                <p className={reader.session.vehicleResponding ? 'onboarding__fine' : 'onboarding__warn'}>
                  {reader.session.vehicleResponding
                    ? 'The car is answering. I can read its codes whenever you want.'
                    : 'The reader is connected but the car is not answering. Turn the ignition to on — the engine does not need to be running.'}
                </p>
              </>
            ) : (
              <p className="onboarding__fine">{RECOMMENDED_HARDWARE}</p>
            )}

            {error && (
              <p className="onboarding__warn" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <p className="onboarding__fine" role="status">
            {unavailableReason()}
          </p>
        )}
      </div>

      <div className="onboarding__actions">
        {supported && phase !== 'paired' && (
          <Button
            variant="primary"
            size="lg"
            wide
            loading={phase === 'pairing'}
            onClick={pair}
          >
            {phase === 'pairing' ? 'Looking…' : 'Find my reader'}
          </Button>
        )}
        <Button
          variant={phase === 'paired' || !supported ? 'primary' : 'ghost'}
          size={phase === 'paired' || !supported ? 'lg' : 'md'}
          wide
          onClick={() => navigate('/home')}
        >
          {phase === 'paired' ? 'Done' : supported ? 'Not now' : 'Continue'}
        </Button>
      </div>
    </main>
  )
}
