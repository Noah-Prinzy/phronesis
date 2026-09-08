import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'

/**
 * Firebase client, initialised from `VITE_FIREBASE_*` in `.env`.
 *
 * Deliberately tolerant of missing configuration. A build with no Firebase
 * keys should still run — every screen except sign-in works without an
 * account, and a hard throw at module load would take the whole app down over
 * a value that is expected to be absent in some environments.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** True when every key needed to talk to Firebase is present. */
export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId)

let cached: Auth | null = null

export function getFirebaseAuth(): Auth | null {
  if (!firebaseConfigured) return null
  if (cached) return cached
  try {
    cached = getAuth(initializeApp(config))
    return cached
  } catch (err) {
    console.error('Firebase failed to initialise:', err)
    return null
  }
}
