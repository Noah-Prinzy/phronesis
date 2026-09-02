// frontend/src/pages/LoadingScreen.tsx

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import type { AvatarTheme } from '../components/AvatarElement/avatarShader';

export interface LoadingScreenProps {
  /** Page theme — matches the Avatar's own theme system. */
  theme?: AvatarTheme;
  /** Seconds from mount until the exit animation starts (comfortably longer than the ~2.1s entrance, so the finished wordmark holds briefly first). */
  duration?: number;
  /** When true, an exit animation plays and `onComplete` fires automatically once it finishes. When false, the screen plays its entrance and then just waits — the caller decides when to move on. */
  autoTransition?: boolean;
  /** Called once, when it's time to move to the next screen. */
  onComplete?: () => void;
}

const LETTERS = ['P', 'H', 'R', 'O', 'N', 'E', 'S', 'I', 'S'] as const;
/** The "O" is a live Avatar orb, not a letter — matches the wordmark's own design. */
const AVATAR_LETTER_INDEX = LETTERS.indexOf('O');

const LETTER_STAGGER_S = 0.1;
const LETTER_DURATION_S = 0.7;
/** Starts right as the last letter finishes animating in. */
const TAGLINE_DELAY_S = LETTER_STAGGER_S * (LETTERS.length - 1) + LETTER_DURATION_S;
const TAGLINE_DURATION_S = 0.9;
/** How long the exit fade runs before onComplete fires. */
const EXIT_DURATION_S = 0.6;

const TAGLINE_TEXT = 'Understand before you repair.';

/** Exo 2, loaded via Google Fonts in index.html — see the comment there for why. */
const WORDMARK_FONT_CLASS = "[font-family:'Exo_2',sans-serif]";

// The floor here matters: 9 letters at even a 5.5rem (88px) minimum add up
// to 700px+ before gaps are counted, which overflows any phone-width
// viewport — the vw-based middle term only ever kicks in once the viewport
// is wide enough for it to exceed this floor, so the floor has to be small.
const LETTER_SIZE_CLASS = '[font-size:clamp(1.75rem,9vw,7.5rem)]';
/**
 * Same clamp() as LETTER_SIZE_CLASS, so the O is sized to match the letters
 * exactly — kept as a separate JS constant since Tailwind needs the letters'
 * class as a static literal (can't be built from this value), while this one
 * drives the Avatar's `style` override directly. Keep in sync by hand.
 */
const AVATAR_SIZE_STYLE = { width: 'clamp(1.75rem, 9vw, 7.5rem)', height: 'clamp(1.75rem, 9vw, 7.5rem)' };
/** Uniform gap between every character (letters and the avatar alike), so nothing sits flush while something else has margin around it. */
const CHARACTER_GAP_CLASS = 'gap-[clamp(0.35rem,1.5vw,1.9rem)]';

const THEME_BG_CLASSES: Record<AvatarTheme, string> = {
  dark: 'bg-black',
  light: 'bg-[#050914]',
};
// Literal hex, not built from theme.ts at runtime — Tailwind's JIT scanner
// needs the full class string present statically in source, so these are
// hand-kept in sync with THEME.colors.darkBlue / THEME.colors.blue there.
const THEME_TEXT_CLASSES: Record<AvatarTheme, string> = {
  dark: 'text-white',
  light: 'text-[#e8eefb]',
};
const THEME_TAGLINE_CLASSES: Record<AvatarTheme, string> = {
  dark: 'text-sky-300',
  light: 'text-[#60a5fa]',
};
/** Static fallback images for prefers-reduced-motion — see the branding-prep note below. */
const THEME_WORDMARK_SRC: Record<AvatarTheme, string> = {
  dark: '/branding/Phronesis_Word_Mark_Dark.png',
  light: '/branding/Phronesis_Word_Mark_Light.png',
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animated Phronesis wordmark loading screen.
 *
 * Built from live text (Exo 2, loaded in index.html — a geometric/tech
 * family matching the wordmark's angular letterforms) + a live Avatar orb
 * standing in for the "O" — not the flattened wordmark PNG in
 * /public/branding/, which can't be split into independently-staggered
 * letters or have a live 3D sphere embedded in place of one of them. That
 * PNG (prepared in both a dark-theme and a light-theme variant, since the
 * source's white text/pale-blue tagline only read against a dark page) is
 * used instead as the reduced-motion fallback: shown instantly, no
 * animation, for viewers who've asked for that.
 *
 * The "O" is a real Avatar instance, sized via `style` to match the letters
 * exactly. On exit, everything (letters, tagline, avatar alike) fades out.
 */
export function LoadingScreen({
  theme = 'light',
  duration = 3.5,
  autoTransition = true,
  onComplete,
}: LoadingScreenProps) {
  const [reducedMotion] = useState(prefersReducedMotion);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!autoTransition) return;
    if (reducedMotion) {
      const timer = setTimeout(() => onComplete?.(), duration * 1000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setIsExiting(true), duration * 1000);
    return () => clearTimeout(timer);
  }, [autoTransition, duration, onComplete, reducedMotion]);

  useEffect(() => {
    if (!isExiting) return;
    const timer = setTimeout(() => onComplete?.(), EXIT_DURATION_S * 1000);
    return () => clearTimeout(timer);
  }, [isExiting, onComplete]);

  return (
    <div
      className={`flex h-screen w-screen flex-col items-center justify-center gap-6 px-6 transition-colors duration-300 ${THEME_BG_CLASSES[theme]}`}
    >
      {reducedMotion ? (
        <img
          src={THEME_WORDMARK_SRC[theme]}
          alt={`Phronesis — ${TAGLINE_TEXT}`}
          className="w-full max-w-2xl"
        />
      ) : (
        <>
          <div className={`flex w-full max-w-7xl flex-wrap items-center justify-center ${CHARACTER_GAP_CLASS}`}>
            {LETTERS.map((letter, i) =>
              i === AVATAR_LETTER_INDEX ? (
                <motion.div
                  key={i}
                  className="flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isExiting ? 0 : 1 }}
                  transition={
                    isExiting
                      ? { duration: EXIT_DURATION_S, ease: 'easeInOut' }
                      : { duration: LETTER_DURATION_S, delay: i * LETTER_STAGGER_S, ease: 'easeOut' }
                  }
                >
                  <AvatarElement
                    state="idle"
                    theme={theme}
                    size="100%"
                    style={AVATAR_SIZE_STYLE}
                    interactive={false}
                    captureMic={false}
                    // A wordmark letter, not the assistant. Point size is
                    // authored against a 320px render and scales down with
                    // it, which at letter height leaves sub-pixel specks —
                    // so this instance overrides size and glow upward to
                    // read as a solid O, and trades away points it cannot
                    // resolve at that scale anyway.
                    pointCount={1400}
                    coreBias={0.85}
                    motionOverride={{ pointSize: 11, coreGlow: 1.2, twinkle: 0.2 }}
                  />
                </motion.div>
              ) : (
                <motion.span
                  key={i}
                  className={`font-bold leading-none tracking-tight ${LETTER_SIZE_CLASS} ${WORDMARK_FONT_CLASS} ${THEME_TEXT_CLASSES[theme]}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isExiting ? { opacity: 0 } : { opacity: 1, scale: 1 }}
                  transition={
                    isExiting
                      ? { duration: EXIT_DURATION_S, ease: 'easeInOut' }
                      : { duration: LETTER_DURATION_S, delay: i * LETTER_STAGGER_S, ease: 'easeOut' }
                  }
                >
                  {letter}
                </motion.span>
              ),
            )}
          </div>

          <motion.p
            className={`text-[clamp(0.7rem,1.4vw,1rem)] font-normal tracking-[0.35em] uppercase ${WORDMARK_FONT_CLASS} ${THEME_TAGLINE_CLASSES[theme]}`}
            initial={{ opacity: 0, y: 10 }}
            animate={isExiting ? { opacity: 0, y: 0 } : { opacity: 1, y: 0 }}
            transition={
              isExiting
                ? { duration: EXIT_DURATION_S, ease: 'easeInOut' }
                : { duration: TAGLINE_DURATION_S, delay: TAGLINE_DELAY_S, ease: 'easeOut' }
            }
          >
            {TAGLINE_TEXT}
          </motion.p>
        </>
      )}
    </div>
  );
}

export default LoadingScreen;
