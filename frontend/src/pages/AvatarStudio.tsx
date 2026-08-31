// frontend/src/pages/AvatarStudio.tsx

import React, { useState } from 'react';
import Avatar from '../components/Avatar/Avatar';

type Theme = 'light' | 'dark';

const THEME_CLASSES: Record<Theme, string> = {
  light: 'bg-white text-slate-900',
  dark: 'bg-black text-white',
};

const THEME_BUTTON_CLASSES: Record<Theme, string> = {
  light: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
  dark: 'border-white/20 bg-white/5 text-white hover:bg-white/10',
};

export const AvatarStudio: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  return (
    <div
      className={`relative flex h-screen w-screen items-center justify-center transition-colors duration-300 ${THEME_CLASSES[theme]}`}
    >
      <button
        type="button"
        onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        className={`absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-200 ${THEME_BUTTON_CLASSES[theme]}`}
      >
        {theme === 'light' ? (
          // Moon icon: shown when the button will switch TO dark
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 1 0 20.354 15.354Z" />
          </svg>
        ) : (
          // Sun icon: shown when the button will switch TO light
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
      </button>

      <Avatar size="large" isLoading={isLoading} theme={theme} />

      {/* Hidden input for keyboard shortcut */}
      <input
        autoFocus
        type="text"
        style={{ position: 'absolute', left: '-9999px' }}
        onKeyDown={(e) => {
          if (e.key === 'l' || e.key === 'L') {
            setIsLoading(!isLoading);
          }
        }}
      />
    </div>
  );
};

export default AvatarStudio;
