// frontend/src/pages/Welcome.tsx

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import StarfieldBackground from '../components/StarfieldBackground';

export interface WelcomeProps {
  /** Called once, when it's time to move to Onboarding. */
  onComplete?: () => void;
}

const INTRO_PARAGRAPHS = [
  'Hey there, my name is Phronesis.',
  "I'm your AI car diagnostic assistant. Whether you're looking to buy your first car, understand what's wrong with your current ride, or find trusted mechanics in your area — I'm here to help.",
  'I learn with every interaction, so the more you tell me, the better I can serve you.',
];

// Tuned so the ~56-word intro lands in a few seconds.
const WORD_STAGGER_S = 0.06;
const WORD_ANIM_DURATION_S = 0.4;
const FADE_OUT_DURATION_S = 0.5;

/** Word count driving the reveal-duration timer, so the two never drift apart. */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

function revealDurationS(text: string): number {
  return WORD_STAGGER_S * Math.max(0, wordCount(text) - 1) + WORD_ANIM_DURATION_S;
}

const wordVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: WORD_ANIM_DURATION_S, ease: 'easeOut' as const } },
};

/** Renders `paragraphs` as staggered, word-by-word fading text. */
function StagedParagraphs({ paragraphs, className }: { paragraphs: string[]; className?: string }) {
  let index = 0;
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: WORD_STAGGER_S } } }}
    >
      {paragraphs.map((paragraph, pIndex) => (
        <p key={pIndex} className="mb-3 last:mb-0">
          {paragraph.split(' ').map((word) => {
            const wordIndex = index++;
            return (
              <motion.span key={wordIndex} variants={wordVariants} className="mr-[0.28em] inline-block">
                {word}
              </motion.span>
            );
          })}
        </p>
      ))}
    </motion.div>
  );
}

/**
 * Phronesis' introduction: reveals a short welcome message, then waits for
 * the user to tap the avatar to continue to Onboarding.
 */
export function Welcome({ onComplete }: WelcomeProps) {
  const [showHint, setShowHint] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setShowHint(true),
      revealDurationS(INTRO_PARAGRAPHS.join(' ')) * 1000,
    );
    return () => clearTimeout(timer);
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
          state={showHint ? 'idle' : 'responding'}
          theme="dark"
          size="clamp(220px, 60vw, 400px)"
          interactive={false}
          captureMic={false}
        />
      </button>

      <div className="max-w-xl">
        <StagedParagraphs
          paragraphs={INTRO_PARAGRAPHS}
          className="text-[clamp(1rem,2.2vw,1.25rem)] leading-relaxed text-[#e8eefb]"
        />
      </div>

      {showHint && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-sm font-medium tracking-wide text-[#60a5fa] uppercase"
        >
          Tap the avatar to continue
        </motion.p>
      )}
    </motion.div>
  );
}

export default Welcome;
