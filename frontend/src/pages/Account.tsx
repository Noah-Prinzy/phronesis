// frontend/src/pages/Account.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import StarfieldBackground from '../components/StarfieldBackground';
import { clearProfile, getStoredEmail, getStoredJourney, setStoredJourney, type Journey } from '../profileStorage';

const JOURNEY_LABELS: Record<Journey, string> = {
  'pre-car': "Pre-car — I don't own a car yet",
  'post-car': 'Post-car — I own a car',
};

/**
 * Account/profile page. There's no backend yet, so "profile" here is just
 * whatever got saved to localStorage during Onboarding (see
 * profileStorage.ts) — an email if one was typed in, and the journey
 * choice, which can be changed here. "Sign out" clears that local state and
 * sends the user back to sign in again.
 */
export function Account() {
  const navigate = useNavigate();
  const [journey, setJourney] = useState<Journey | null>(() => getStoredJourney());
  const [micOn, setMicOn] = useState(false);
  const email = getStoredEmail();

  function handleJourneyChange(next: Journey) {
    setStoredJourney(next);
    setJourney(next);
  }

  function handleSignOut() {
    clearProfile();
    navigate('/onboarding');
  }

  return (
    <div className="relative flex h-screen w-screen flex-col items-center bg-[#050914] px-6 py-10">
      <StarfieldBackground theme="dark" />

      <div className="mb-8 flex w-full max-w-sm items-center">
        <Link to="/home" aria-label="Back to chat" className="text-[#e8eefb]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="mx-auto text-lg font-bold text-[#e8eefb]">Account</h1>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-8">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-[#e8eefb]/50 uppercase">Email</p>
          <p className="text-[#e8eefb]">{email ?? 'Not signed in yet'}</p>
        </div>

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

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 rounded-lg border border-red-400/40 px-6 py-3 font-semibold text-red-300 transition-colors hover:bg-red-500/10"
        >
          Sign out
        </button>
      </div>

      {/* Plan §4.4: minimised but still interactive on Account. Tapping it
          toggles the mic, same as everywhere else it is interactive. */}
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
