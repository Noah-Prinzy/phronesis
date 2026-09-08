import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Divider, PasswordInput, Segmented, SpokenText, Steps, TextInput } from '../ui'
import { Halo } from '../avatar/Halo'
import { useRem } from '../app/useRootFontSize'
import { useJourney } from '../app/journey'
import { authErrorMessage, useAuth } from '../app/auth'
import { useSpeak } from '../app/useSpeak'
import { ONBOARDING_STEPS } from './Onboarding'

/**
 * Onboarding step 2 — the account, and the last required screen.
 *
 * The name is asked for **here**, in the same form, rather than on a screen of
 * its own. It was a whole step for one field, and a step the user could not
 * skip, which is a poor trade for a greeting.
 */
export function OnboardingAccount() {
  const avatarSize = useRem(3.6)
  const navigate = useNavigate()
  const { journey } = useJourney()
  const { status, signUp, signIn, signInWithGoogle, updateName } = useAuth()
  const { talking, speak, progress } = useSpeak()

  const [mode, setMode] = useState<'create' | 'signin'>('create')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<null | 'email' | 'google'>(null)
  const [error, setError] = useState<string | null>(null)

  const owner = journey !== 'buyer'

  // Ends on the question the first field is asking anyway, so the form reads
  // as her asking rather than as a form.
  const ask = owner
    ? "Last thing, then we're done. Make an account and I'll remember your car and everything we work out together. What should I call you?"
    : "Last thing, then we're done. Make an account and I'll remember your budget and what you've already ruled out. What should I call you?"

  useEffect(() => {
    speak(ask)
    // Runs once, on mount — the line plays exactly once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Already signed in — including on a reload — so do not make them do it
  // again just because they landed back on this route.
  useEffect(() => {
    if (status === 'signedIn') navigate('/home', { replace: true })
  }, [status, navigate])

  // Switching between Create and Sign in should not leave the previous
  // attempt's error sitting under the fields.
  useEffect(() => setError(null), [mode])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy('email')
    try {
      if (mode === 'create') {
        await signUp(email, password)
        // Strictly after: updateName writes to auth.currentUser, which does
        // not exist until sign-up has resolved.
        const trimmed = name.trim()
        if (trimmed) {
          try {
            await updateName(trimmed)
          } catch {
            // The account exists, which is the part that matters. A missing
            // display name costs a greeting, not a session — and Account can
            // set it later. Stranding them on this form would be worse.
          }
        }
      } else {
        await signIn(email, password)
      }
      navigate('/home')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function google() {
    setError(null)
    setBusy('google')
    try {
      // Google supplies a display name of its own, so there is nothing to ask.
      await signInWithGoogle()
      navigate('/home')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const unavailable = status === 'unavailable'
  const locked = unavailable || busy !== null

  return (
    <main id="main" className="screen onboarding">
      <Steps total={ONBOARDING_STEPS} current={2} className="onboarding__steps" />

      <div className="onboarding__body">
        <div className="onboarding__greet">
          <Halo size={avatarSize} state={busy ? 'thinking' : talking ? 'responding' : 'idle'} />
          <SpokenText text={ask} progress={progress} className="greet__line" />
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

        <form className="onboarding__form" onSubmit={submit}>
          {mode === 'create' && (
            <TextInput
              label="First name"
              autoComplete="given-name"
              placeholder="What should I call you?"
              hint="So I can talk to you by name."
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              disabled={locked}
            />
          )}

          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            disabled={locked}
          />

          <PasswordInput
            label="Password"
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            placeholder="At least 8 characters"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            disabled={locked}
            // The error hangs off the password field because that is the last
            // thing touched before submitting — it is where the eye already is.
            error={error ?? undefined}
          />

          <Button
            variant="primary"
            size="lg"
            wide
            type="submit"
            className="onboarding__submit"
            loading={busy === 'email'}
            disabled={locked}
          >
            {mode === 'create' ? 'Create account' : 'Sign in'}
          </Button>

          <Divider>or</Divider>

          <Button
            variant="secondary"
            wide
            type="button"
            iconLeft={<GoogleMark />}
            onClick={google}
            loading={busy === 'google'}
            disabled={locked}
          >
            Continue with Google
          </Button>
        </form>

        {unavailable && (
          <p className="onboarding__fine" role="status">
            Sign-in is unavailable in this build — no Firebase configuration. You can still look
            around.{' '}
            <button type="button" className="linklike" onClick={() => navigate('/home')}>
              Continue without an account
            </button>
          </p>
        )}
      </div>
    </main>
  )
}

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
