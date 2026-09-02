// frontend/src/pages/Onboarding.tsx

import { motion } from 'framer-motion';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import StarfieldBackground from '../components/StarfieldBackground';
import { useVoice } from '../components/Voice/VoiceProvider';
import { setStoredEmail, setStoredJourney, type Journey } from '../profileStorage';

type AuthMode = 'signIn' | 'signUp';
type Step = 'auth' | 'journey';

const JOURNEY_QUESTION = 'Do you own a car?';

/**
 * Sign-in/sign-up UI, followed by journey detection ("Do you own a car?").
 * There's no auth backend yet, so the sign-in/sign-up/Google step is UI
 * only — nothing here actually creates an account, verifies a password, or
 * talks to any identity provider. The journey choice is real, though: it's
 * saved to localStorage (see `getStoredJourney`) since there's nowhere else
 * to persist it yet, and determines which of the two onward experiences
 * (pre-car vs. post-car) Home eventually branches into.
 */
export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { speak, stop, isSpeaking } = useVoice();

  useEffect(() => {
    if (step !== 'journey') return;
    speak(JOURNEY_QUESTION);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim()) setStoredEmail(email.trim());
    setStep('journey');
  }

  function handleJourneyChoice(journey: Journey) {
    setStoredJourney(journey);
    navigate('/home');
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-[#050914] px-6">
      <StarfieldBackground theme="dark" />

      {/* Plan §4.4: on sign-in/sign-up the avatar minimises to a corner but
          stays present — the form has the floor, Phronesis is still here. */}
      {step === 'auth' && (
        <div className="pointer-events-none absolute right-6 bottom-6 z-10">
          <div className="pointer-events-auto">
            <AvatarElement state="idle" theme="dark" size={64} captureMic={false} interactive={false} pointCount={2200} />
          </div>
        </div>
      )}

      {step === 'auth' && (
        <div className="w-full max-w-sm">
          <h1 className="mb-1 text-center text-2xl font-bold text-[#e8eefb]">
            {authMode === 'signIn' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mb-8 text-center text-sm text-[#e8eefb]/60">
            {authMode === 'signIn'
              ? 'Sign in to continue with Phronesis.'
              : 'Sign up to get started with Phronesis.'}
          </p>

          <div className="mb-6 flex rounded-lg border border-[#3b82f6]/30 p-1">
            <button
              type="button"
              onClick={() => setAuthMode('signIn')}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                authMode === 'signIn' ? 'bg-[#3b82f6] text-white' : 'text-[#e8eefb]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signUp')}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                authMode === 'signUp' ? 'bg-[#3b82f6] text-white' : 'text-[#e8eefb]'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="rounded-lg border border-[#3b82f6]/40 px-4 py-3 text-[#e8eefb] outline-none focus:border-[#3b82f6]"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-lg border border-[#3b82f6]/40 px-4 py-3 text-[#e8eefb] outline-none focus:border-[#3b82f6]"
            />
            {authMode === 'signUp' && (
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="rounded-lg border border-[#3b82f6]/40 px-4 py-3 text-[#e8eefb] outline-none focus:border-[#3b82f6]"
              />
            )}

            <button
              type="submit"
              className="mt-2 rounded-lg bg-[#3b82f6] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#2f6fd6]"
            >
              {authMode === 'signIn' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#1c2b47]" />
            <span className="text-xs font-medium tracking-wide text-[#e8eefb]/50 uppercase">or</span>
            <div className="h-px flex-1 bg-[#1c2b47]" />
          </div>

          <button
            type="button"
            onClick={() => setStep('journey')}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#3b82f6]/40 px-6 py-3 font-semibold text-[#e8eefb] transition-colors hover:bg-[#3b82f6]/15"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.25v3.11A11.99 11.99 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.25a12 12 0 0 0 0 10.76l4.02-3.11Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.25 6.62l4.02 3.11C6.22 6.87 8.87 4.75 12 4.75Z"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      )}

      {step === 'journey' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex w-full max-w-sm flex-col items-center gap-8 text-center"
        >
          {/* Question is voice-only — no on-screen text, just the buttons. */}
          <AvatarElement
            state={isSpeaking ? 'responding' : 'idle'}
            theme="dark"
            size="clamp(180px, 45vw, 300px)"
            interactive={false}
            captureMic={false}
          />

          <div className="flex w-full gap-4">
            <button
              type="button"
              onClick={() => handleJourneyChoice('post-car')}
              className="flex-1 rounded-lg bg-[#3b82f6] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#2f6fd6]"
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => handleJourneyChoice('pre-car')}
              className="flex-1 rounded-lg border border-[#3b82f6]/40 px-8 py-3 font-semibold text-[#e8eefb] transition-colors hover:bg-[#3b82f6]/15"
            >
              NO
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default Onboarding;
