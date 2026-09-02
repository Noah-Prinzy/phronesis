// frontend/src/theme.ts
//
// Single source of truth for the Phronesis brand palette/fonts. Mirrors the
// CSS custom properties in index.css (--color-bg etc.) for use in non-CSS
// contexts — the 3D shader's THREE.Color values, inline styles, anywhere a
// raw JS value is needed rather than a class name.
//
// Tailwind can't consume a JS import inside a class string (arbitrary
// values must be static text for its build-time scanner), so this doesn't
// replace `text-[#e8eefb]`-style classes elsewhere — it's the reference
// those literals are copied from, so keep them in sync with this file.
//
// The app runs on a night ground (see the note at the top of index.css).
// `deepBlue` is the old #1e3a8a: still brand, but an accent now rather than
// the colour of most of the text.

export const THEME = {
  colors: {
    bg: '#050914',
    surface: '#0c1424',
    border: '#1c2b47',

    ink: '#e8eefb',
    muted: '#93a6c6',

    blue: '#3b82f6',
    blueLight: '#60a5fa',
    deepBlue: '#1e3a8a',
    white: '#ffffff',
  },
  fonts: {
    primary: "'Exo 2', sans-serif",
  },
} as const;
