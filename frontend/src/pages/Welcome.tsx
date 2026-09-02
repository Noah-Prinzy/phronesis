// frontend/src/pages/Welcome.tsx

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import StarfieldBackground from '../components/StarfieldBackground';
import { useVoice } from '../components/Voice/VoiceProvider';

export interface WelcomeProps {
  /** Called once, when it's time to move to Onboarding. */
  onComplete?: () => void;
}

const INTRO_TEXT =
  "Hey there, my name is Phronesis. I'm your AI car diagnostic assistant. Whether you're looking to buy your first car, understand what's wrong with your current ride, or find trusted mechanics in your area — I'm here to help. I learn with every interaction, so the more you tell me, the better I can serve you.";

// Roughly how long the intro takes to say, so the tap becomes available
// around when it finishes — voice-only now, no on-screen text.
const WORD_STAGGER_S = 0.06;
const WORD_ANIM_DURATION_S = 0.4;
const FADE_OUT_DURATION_S = 0.5;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

function revealDurationS(text: string): number {
  return WORD_STAGGER_S * Math.max(0, wordCount(text) - 1) + WORD_ANIM_DURATION_S;
}

/**
 * Phronesis' introduction: speaks a short welcome message (no on-screen
 * text — voice-only), then waits for the user to tap the avatar to
 * continue to Onboarding.
 */
export function Welcome({ onComplete }: WelcomeProps) {
  const [showHint, setShowHint] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const { speak, stop, isSpeaking } = useVoice();

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), revealDurationS(INTRO_TEXT) * 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    speak(INTRO_TEXT);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAvatarTap() {
    if (!showHint || fadeOut) return;
    setFadeOut(true);
  }

  useEffect(() => {
    if (!fadeOut) return;
    const timer = setTimeout(() => onComplete?.(), FADE_OUT_DURATION_S * 1000);
    return () => clearTimeout(timer);
  }, [fadeOut, onComplete]);

  return (
    <motion.div
      className="relative flex h-screen w-screen flex-col items-center justify-center gap-8 bg-[#050914] px-6 text-center"
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: FADE_OUT_DURATION_S, ease: 'easeInOut' }}
    >
      <StarfieldBackground theme="dark" />

      <button
        type="button"
        onClick={handleAvatarTap}
        disabled={!showHint}
        aria-label={showHint ? 'Tap to continue' : 'Phronesis'}
        className={showHint ? 'cursor-pointer' : 'cursor-default'}
      >
        {/* interactive={false} on purpose: on this screen a tap advances the
            flow, so the wrapping button owns the gesture. The mic toggle
            starts on Home, where there is something to say. */}
        <AvatarElement
          state={isSpeaking || !showHint ? 'responding' : 'idle'}
          theme="dark"
          size="clamp(220px, 60vw, 400px)"
          interactive={false}
          captureMic={false}
        />
      </button>
    </motion.div>
  );
}

export default Welcome;
