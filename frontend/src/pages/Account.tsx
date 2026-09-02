// frontend/src/pages/Account.tsx

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import StarfieldBackground from '../components/StarfieldBackground';
import { useAuth } from '../context/AuthContext';
import { clearProfile, getStoredJourney, setStoredJourney, type Journey } from '../profileStorage';

const JOURNEY_LABELS: Record<Journey, string> = {
  'pre-car': "Pre-car — I don't own a car yet",
  'post-car': 'Post-car — I own a car',
};

export function Account() {
  const navigate = useNavigate();
  const { currentUser, signInWithEmail, signUpWithEmail, signInWithGoogle, logout } = useAuth();

  const [journey, setJourney] = useState<Journey | null>(() => getStoredJourney());
  const [micOn, setMicOn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  function handleJourneyChange(next: Journey) {
    setStoredJourney(next);
    setJourney(next);
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(emailInput, passwordInput);
      } else {
        await signInWithEmail(emailInput, passwordInput);
      }
    } catch (err: any) {
      console.error('Authentication failed:', err);
      setAuthError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setAuthError(err.message || 'Google Sign-In failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    clearProfile();
    await logout();
    navigate('/onboarding');
  }

  return (
    <div className="relative flex h-screen w-screen flex-col items-center bg-[#050914] px-6 py-10 overflow-y-auto">
      <StarfieldBackground theme="dark" />

      <div className="mb-8 flex w-full max-w-sm items-center">
        <Link to="/home" aria-label="Back to chat" className="text-[#e8eefb]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="mx-auto text-lg font-bold text-[#e8eefb]">Account</h1>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6">
        {currentUser ? (
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-[#e8eefb]/50 uppercase">Firebase Account</p>
            <p className="text-[#e8eefb] font-medium">{currentUser.email || 'Anonymous User'}</p>
            <p className="text-xs text-[#93a6c6] mt-1">UID: {currentUser.uid}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-[#1c2b47] bg-[#0c1424] p-5">
            <h2 className="text-sm font-semibold text-[#e8eefb] mb-3">
              {isSignUp ? 'Create Phronesis Account' : 'Sign in to Phronesis'}
            </h2>
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="rounded-lg border border-[#3b82f6]/40 bg-transparent px-3 py-2 text-sm text-[#e8eefb] placeholder:text-[#93a6c6]/60 outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="rounded-lg border border-[#3b82f6]/40 bg-transparent px-3 py-2 text-sm text-[#e8eefb] placeholder:text-[#93a6c6]/60 outline-none"
              />
              {authError && <p className="text-xs text-[#ef4444]">{authError}</p>}
              <button
                type="submit"
                disabled={authLoading}
                className="rounded-lg bg-[#3b82f6] py-2 text-sm font-semibold text-white hover:bg-[#2f6fd6] disabled:opacity-60"
              >
                {authLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="mt-3 w-full rounded-lg border border-[#3b82f6]/30 bg-transparent py-2 text-sm font-medium text-[#e8eefb] hover:bg-[#3b82f6]/10"
            >
              Sign in with Google
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="mt-3 text-xs text-[#60a5fa] underline"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}

        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-[#e8eefb]/50 uppercase">Journey</p>
          <div className="flex flex-col gap-2">
            {(Object.entries(JOURNEY_LABELS) as [Journey, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleJourneyChange(value)}
                className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                  journey === value
                    ? 'border-[#3b82f6] bg-[#3b82f6]/20 text-[#e8eefb]'
                    : 'border-[#1c2b47] text-[#e8eefb]/70 hover:bg-[#3b82f6]/15'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {currentUser && (
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 rounded-lg border border-red-400/40 px-6 py-3 font-semibold text-red-300 transition-colors hover:bg-red-500/10"
          >
            Sign out
          </button>
        )}
      </div>

      <div className="absolute right-6 bottom-6">
        <AvatarElement
          state={micOn ? 'listening' : 'idle'}
          theme="dark"
          size={64}
          micOn={micOn}
          onMicToggle={setMicOn}
          pointCount={2400}
        />
      </div>
    </div>
  );
}

export default Account;
