// frontend/src/pages/Onboarding.tsx

import { motion } from 'framer-motion';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import StarfieldBackground from '../components/StarfieldBackground';
import { useVoice } from '../components/Voice/VoiceProvider';
import { useAuth } from '../context/AuthContext';
import { setStoredEmail, setStoredJourney, type Journey } from '../profileStorage';

type AuthMode = 'signIn' | 'signUp';
type Step = 'auth' | 'journey';

const JOURNEY_QUESTION = 'Do you own a car?';

export function Onboarding() {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithEmail, signInWithGoogle, getIdToken } = useAuth();

  const [step, setStep] = useState<Step>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const { speak, stop, isSpeaking } = useVoice();

  useEffect(() => {
    if (step !== 'journey') return;
    speak(JOURNEY_QUESTION);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    if (authMode === 'signUp' && password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'signUp') {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      setStoredEmail(email.trim());
      setStep('journey');
    } catch (err: any) {
      console.error('Authentication failed:', err);
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      setStep('journey');
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setAuthError(err.message || 'Google Sign-In failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  function handleSkipAuth() {
    setStep('journey');
  }

  async function handleJourneyChoice(journey: Journey) {
    setStoredJourney(journey);

    // Sync to backend if authenticated
    try {
      const token = await getIdToken();
      if (token) {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ journey }),
        });
      }
    } catch (err) {
      console.warn('Could not sync user profile to backend:', err);
    }

    navigate('/home');
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-[#050914] px-6 overflow-y-auto">
      <StarfieldBackground theme="dark" />

      {step === 'auth' && (
        <div className="pointer-events-none absolute right-6 bottom-6 z-10">
          <div className="pointer-events-auto">
            <AvatarElement state="idle" theme="dark" size={64} captureMic={false} interactive={false} pointCount={2200} />
          </div>
        </div>
      )}

      {step === 'auth' && (
        <div className="w-full max-w-sm my-auto">
          <h1 className="mb-1 text-center text-2xl font-bold text-[#e8eefb]">
            {authMode === 'signIn' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mb-6 text-center text-sm text-[#e8eefb]/60">
            {authMode === 'signIn'
              ? 'Sign in to sync your vehicle diagnostic history.'
              : 'Sign up to get started with Phronesis.'}
          </p>

          <div className="mb-6 flex rounded-lg border border-[#3b82f6]/30 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signUp');
                setAuthError(null);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                authMode === 'signUp' ? 'bg-[#3b82f6] text-white' : 'text-[#e8eefb]'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signIn');
                setAuthError(null);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                authMode === 'signIn' ? 'bg-[#3b82f6] text-white' : 'text-[#e8eefb]'
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="rounded-lg border border-[#3b82f6]/40 px-4 py-3 text-[#e8eefb] placeholder:text-[#93a6c6]/60 outline-none focus:border-[#3b82f6]"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-lg border border-[#3b82f6]/40 px-4 py-3 text-[#e8eefb] placeholder:text-[#93a6c6]/60 outline-none focus:border-[#3b82f6]"
            />
            {authMode === 'signUp' && (
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="rounded-lg border border-[#3b82f6]/40 px-4 py-3 text-[#e8eefb] placeholder:text-[#93a6c6]/60 outline-none focus:border-[#3b82f6]"
              />
            )}

            {authError && <p className="text-xs text-[#ef4444]">{authError}</p>}

            <button
              type="submit"
              disabled={authLoading}
              className="mt-1 rounded-lg bg-[#3b82f6] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#2f6fd6] disabled:opacity-60"
            >
              {authLoading ? 'Processing...' : authMode === 'signIn' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#1c2b47]" />
            <span className="text-xs font-medium tracking-wide text-[#e8eefb]/50 uppercase">or</span>
            <div className="h-px flex-1 bg-[#1c2b47]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authLoading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#3b82f6]/40 px-6 py-3 font-semibold text-[#e8eefb] transition-colors hover:bg-[#3b82f6]/15 disabled:opacity-60"
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

          <button
            type="button"
            onClick={handleSkipAuth}
            className="mt-4 w-full text-center text-xs text-[#93a6c6] hover:underline"
          >
            Continue as Guest
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
