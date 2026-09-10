import { initializeApp, type FirebaseApp } from 'firebase/app'
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

let app: FirebaseApp | null = null
let cached: Auth | null = null

/**
 * The initialised app, or null when Firebase is not configured.
 *
 * Exposed because Firestore needs it too: the user's own records are read
 * straight from the browser under the rules, rather than through a server
 * that would enforce nothing the rules do not. Initialising twice would
 * create two apps, so this is the single place it happens.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null
  if (app) return app
  try {
    app = initializeApp(config)
    return app
  } catch (err) {
    console.error('Firebase failed to initialise:', err)
    return null
  }
}

export function getFirebaseAuth(): Auth | null {
  if (cached) return cached
  const a = getFirebaseApp()
  if (!a) return null
  cached = getAuth(a)
  return cached
}
