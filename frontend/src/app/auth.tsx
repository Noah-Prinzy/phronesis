import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { firebaseConfigured, getFirebaseAuth } from '../lib/firebase'

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut' | 'unavailable'

export interface AuthValue {
  user: User | null
  status: AuthStatus
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** Sets the signed-in user's display name — what Phronesis calls them. */
  updateName: (name: string) => Promise<void>
  /** The Firebase ID token, for the backend's `Authorization: Bearer` header. */
  getToken: () => Promise<string | null>
}

const Ctx = createContext<AuthValue | null>(null)

/** First name off a Firebase display name — less overfamiliar than the full thing. */
export function firstNameOf(user: User | null): string | null {
  const name = user?.displayName?.trim()
  return name ? name.split(/\s+/)[0] : null
}

/**
 * Turns a Firebase error code into something a person can act on.
 *
 * Firebase's own messages are written for developers ("Firebase: Error
 * (auth/invalid-credential).") and leak the vendor into the product. They are
 * also, in the sign-in case, deliberately vague about whether the email or the
 * password was wrong — that vagueness is a security property and is preserved
 * here rather than helpfully undone.
 */
export function authErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'There is already an account with that email. Try signing in instead.'
    case 'auth/invalid-email':
      return 'That does not look like an email address.'
    case 'auth/weak-password':
      return 'That password is too short — use at least 8 characters.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password do not match an account.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'The Google window closed before sign-in finished.'
    case 'auth/network-request-failed':
      return 'I could not reach the server. Check your connection.'
    default:
      return 'Something went wrong signing you in. Try again.'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = getFirebaseAuth()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    firebaseConfigured ? 'loading' : 'unavailable',
  )

  useEffect(() => {
    if (!auth) {
      setStatus('unavailable')
      return
    }
    // Fires immediately with the restored session, then on every change — so
    // a reload does not bounce a signed-in user back to the start.
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setStatus(u ? 'signedIn' : 'signedOut')
    })
  }, [auth])

  const require = useCallback(() => {
    if (!auth) throw new Error('Firebase is not configured in this build.')
    return auth
  }, [auth])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      status,
      signUp: async (email, password) => {
        await createUserWithEmailAndPassword(require(), email, password)
      },
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(require(), email, password)
      },
      signInWithGoogle: async () => {
        await signInWithPopup(require(), new GoogleAuthProvider())
      },
      signOut: async () => {
        await fbSignOut(require())
      },
      updateName: async (name) => {
        const current = require().currentUser
        if (!current) throw new Error('Not signed in.')
        await updateProfile(current, { displayName: name })
        // `updateProfile` mutates the existing user object in place rather than
        // firing onAuthStateChanged, so the same reference is already correct
        // for anything that reads it fresh (e.g. after this resolves). This
        // `setUser` just wakes up anything already mounted and watching —
        // a clone with the same prototype so `getIdToken` and friends survive.
        setUser(Object.assign(Object.create(Object.getPrototypeOf(current)), current))
      },
      getToken: async () => (user ? user.getIdToken() : null),
    }),
    [user, status, require],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
