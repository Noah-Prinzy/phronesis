// frontend/src/profileStorage.ts
//
// No backend/auth yet, so this is the only place a user's profile
// (journey choice, email from the mock sign-up form) is persisted —
// localStorage, scoped to this browser only. Once real auth/a backend
// exists, this whole module gets replaced by real account data.

export type Journey = 'pre-car' | 'post-car';

const JOURNEY_KEY = 'phronesis:journey';
const EMAIL_KEY = 'phronesis:email';

export function getStoredJourney(): Journey | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(JOURNEY_KEY);
  return value === 'pre-car' || value === 'post-car' ? value : null;
}

export function setStoredJourney(journey: Journey): void {
  window.localStorage.setItem(JOURNEY_KEY, journey);
}

export function getStoredEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(EMAIL_KEY);
}

export function setStoredEmail(email: string): void {
  window.localStorage.setItem(EMAIL_KEY, email);
}

/** Clears everything — used by "sign out." */
export function clearProfile(): void {
  window.localStorage.removeItem(JOURNEY_KEY);
  window.localStorage.removeItem(EMAIL_KEY);
}
