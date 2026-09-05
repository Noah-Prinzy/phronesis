import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  CardButton,
  Divider,
  PasswordInput,
  Segmented,
  Spinner,
  Steps,
  TextInput,
} from '../ui'
import { Halo } from '../avatar/Halo'
import { useJourney } from '../app/journey'

/* ============================================================ step 1 · journey
   No login yet. The answer here is the branch: it decides which pages fill
   nav slots 2 and 3 for the rest of the app, and whether step 3 exists at all.
   See design/03-breakpoints.md and design/04-precar.md. */

export function OnboardingJourney() {
  const navigate = useNavigate()
  const { setJourney, steps } = useJourney()

  function choose(j: 'owner' | 'buyer') {
    setJourney(j)
    navigate('/join')
  }

  return (
    <main className="screen onboarding">
      <Steps total={steps} current={1} className="onboarding__steps" />

      <div className="onboarding__body">
        <div className="onboarding__intro">
          <Halo size={118} state="idle" />
          <h1 className="onboarding__title">ONE QUESTION</h1>
          <p className="onboarding__sub">
            It decides what I show you first, and you can change it later in Account.
          </p>
        </div>

        <div className="onboarding__choices">
          <CardButton onClick={() => choose('owner')}>
            <span className="choice__name">I own a car</span>
            <span className="choice__note">
              Diagnose faults, watch its health, find mechanics you can trust.
            </span>
          </CardButton>
          <CardButton onClick={() => choose('buyer')}>
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

/* ============================================================ step 2 · account
   The only required step. Personalised by the answer above. */

export function OnboardingAccount() {
  const navigate = useNavigate()
  const { journey, steps } = useJourney()
  const [mode, setMode] = useState<'create' | 'signin'>('create')

  const owner = journey !== 'buyer'

  return (
    <main className="screen onboarding">
      <Steps total={steps} current={2} className="onboarding__steps" />

      <div className="onboarding__body">
        <div className="onboarding__greet">
          <Halo size={56} state="idle" />
          <div>
            <p className="greet__line">
              {owner ? "I'm your car's co-pilot now." : "Let's find you the right car."}
            </p>
            <p className="greet__note">
              {owner
                ? "Make an account and I'll remember your car and its history."
                : "Make an account and I'll remember what you're looking for."}
            </p>
          </div>
        </div>

        <Segmented
          label="Account"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'create', label: 'Create account' },
            { value: 'signin', label: 'Sign in' },
          ]}
        />

        <form
          className="onboarding__form"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(owner ? '/pair' : '/home')
          }}
        >
          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <PasswordInput
            label="Password"
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            placeholder="At least 8 characters"
            required
          />

          <Divider>or</Divider>

          <Button variant="secondary" wide type="button" iconLeft={<GoogleMark />}>
            Continue with Google
          </Button>

          <Button variant="primary" size="lg" wide type="submit" className="onboarding__submit">
            {mode === 'create' ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  )
}

/* ================================================================ step 3 · OBD
   Owners only, and skippable. A buyer never reaches this route — there is
   nothing to plug a reader into. */

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
  const { journey, steps } = useJourney()
  const [scanning, setScanning] = useState(true)
  const [picked, setPicked] = useState<string | null>(null)

  // A buyer has no car; this step does not apply to them.
  useEffect(() => {
    if (journey === 'buyer') navigate('/home', { replace: true })
  }, [journey, navigate])

  useEffect(() => {
    const t = window.setTimeout(() => setScanning(false), 2600)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <main className="screen onboarding">
      <Steps total={steps} current={3} className="onboarding__steps" />

      <div className="onboarding__body">
        <div className="onboarding__greet">
          <Halo size={56} state="idle" />
          <div>
            <p className="greet__line">One last thing.</p>
            <p className="greet__note">Optional, and skippable.</p>
          </div>
        </div>

        <p className="onboarding__prose">
          An OBD reader plugs in under your dash and lets me read the engine directly.
        </p>

        <div className="scan">
          <span className="scan__status">
            {scanning ? (
              <>
                <Spinner size={12} /> Looking for readers…
              </>
            ) : (
              `${FOUND.length} readers found`
            )}
          </span>

          {FOUND.map((r) => (
            <CardButton
              key={r.mac}
              selected={picked === r.mac}
              onClick={() => setPicked(r.mac)}
              className="reader"
            >
              <span className="reader__icon" aria-hidden="true">
                <PlugIcon />
              </span>
              <span className="reader__text">
                <span className="reader__name">{r.name}</span>
                <span className="reader__mac">
                  {r.mac} · {r.strong ? 'strong signal' : 'weak signal'}
                </span>
              </span>
              {picked === r.mac && <span className="reader__dot" />}
            </CardButton>
          ))}
        </div>

        <p className="onboarding__fine">
          Phronesis works without one — you would describe symptoms instead, and I would reason from
          those.
        </p>
      </div>

      <div className="onboarding__actions">
        <Button variant="primary" size="lg" wide disabled={!picked} onClick={() => navigate('/home')}>
          {picked ? 'Pair reader' : 'Select a reader'}
        </Button>
        <Button variant="ghost" wide onClick={() => navigate('/home')}>
          Skip — I&rsquo;ll do this later
        </Button>
      </div>
    </main>
  )
}

/* -------------------------------------------------------------------- icons */

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.25v3.11A11.99 11.99 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.25a12 12 0 0 0 0 10.76l4.02-3.11Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.25 6.62l4.02 3.11C6.22 6.87 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

function PlugIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 3v18M12 8l5-3M12 16l5 3M12 8L7 5M12 16l-5 3" />
    </svg>
  )
}
