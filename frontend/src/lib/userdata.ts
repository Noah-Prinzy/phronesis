import { deleteUser, updateProfile, type User } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import { getFirebaseApp } from './firebase'
import type { CarProfile, DiagnosisReport, Preferences } from './api'

/**
 * The user's own data, read and written straight from the browser.
 *
 * **Why not through the backend.** There are two backends: an Express server
 * for local development and a set of Vercel functions for production. Account
 * was written against the Express routes, and those routes do not exist as
 * functions — so on the deployed site the car, the alerts, the export and the
 * delete were all calling endpoints that were never there.
 *
 * Porting them would have meant firebase-admin, a service-account key and two
 * more environment variables, to reach data the browser is already
 * authenticated for. Firestore's rules are the authority either way: every
 * document here is keyed by uid and `firestore.rules` allows a user to touch
 * only their own. A server in the middle would add a hop and another copy to
 * keep in sync, and enforce nothing the rules do not already enforce.
 *
 * Chat and diagnosis stay on the server, because those hold API keys that
 * must never reach a browser. This is the line: the user's own records here,
 * anything holding a secret there.
 */

function db(): Firestore | null {
  const app = getFirebaseApp()
  return app ? getFirestore(app) : null
}

/* --------------------------------------------------------------- the car */

export async function loadCar(uid: string): Promise<CarProfile | null> {
  const d = db()
  if (!d) return null
  const snap = await getDoc(doc(d, 'cars', uid))
  if (!snap.exists()) return null
  const data = snap.data() as CarProfile & { userId?: string }
  return data.make ? data : null
}

export async function storeCar(uid: string, car: CarProfile): Promise<void> {
  const d = db()
  if (!d) throw new Error('Firebase is not configured.')
  // userId is written into the body as well as the id, because the rules for
  // this collection check the FIELD rather than the document name.
  await setDoc(doc(d, 'cars', uid), { ...car, userId: uid, updatedAt: serverTimestamp() }, { merge: true })
}

/* ----------------------------------------------------------- preferences */

const DEFAULT_PREFERENCES: Preferences = { faultAlerts: true, serviceReminders: false }

export async function loadPreferences(uid: string): Promise<Preferences> {
  const d = db()
  if (!d) return DEFAULT_PREFERENCES
  const snap = await getDoc(doc(d, 'preferences', uid))
  // Defaults rather than blanks: someone who has never opened Account should
  // be shown what WILL happen, not an empty switch.
  return { ...DEFAULT_PREFERENCES, ...(snap.exists() ? (snap.data() as Preferences) : {}) }
}

export async function storePreferences(uid: string, patch: Partial<Preferences>): Promise<Preferences> {
  const d = db()
  if (!d) throw new Error('Firebase is not configured.')
  await setDoc(doc(d, 'preferences', uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true })
  return loadPreferences(uid)
}

/* ---------------------------------------------------------- the portrait */

/**
 * Stored in Firestore rather than Firebase Storage, and that is a deliberate
 * trade. Storage would mean enabling the product, writing a second set of
 * rules and deploying them; a 256px JPEG is about 20KB, comfortably inside
 * Firestore's 1MB document limit, and it syncs across devices exactly the
 * same way. Auth's own `photoURL` cannot hold it — that field takes a URL,
 * not an image.
 */
export async function loadAvatar(uid: string): Promise<string | null> {
  const d = db()
  if (!d) return null
  const snap = await getDoc(doc(d, 'users', uid))
  return snap.exists() ? ((snap.data() as { photo?: string }).photo ?? null) : null
}

export async function storeAvatar(uid: string, dataUrl: string): Promise<void> {
  const d = db()
  if (!d) throw new Error('Firebase is not configured.')
  await setDoc(doc(d, 'users', uid), { uid, photo: dataUrl, updatedAt: serverTimestamp() }, { merge: true })
}

/**
 * Square-crop, downscale and re-encode before anything is stored.
 *
 * A phone photo is several megabytes and would blow the document limit
 * outright. Cropping to the centre square first means the result is never
 * distorted, only trimmed — which is what people expect a portrait to do.
 */
export function toAvatarDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.addEventListener('load', () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Could not read that image.'))
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    })
    img.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('That does not look like an image.'))
    })
    img.src = url
  })
}

/* -------------------------------------------------------- the diagnoses */

export interface StoredDiagnosis extends DiagnosisReport {
  userId: string
  symptom: string
  at: string
}

/**
 * Every report he produces, kept.
 *
 * Nothing saved them before — not the Express route in production, because
 * production does not run it, and not the page. So there was no history, and
 * therefore nothing for an alert to fire from: "tell me when something needs
 * attention" had no record of anything needing attention.
 *
 * Written with the id generated here rather than by the server, so the write
 * is one round trip and the caller has the id immediately.
 */
export async function storeDiagnosis(
  uid: string,
  report: DiagnosisReport,
  symptom: string,
): Promise<void> {
  const d = db()
  if (!d) return
  const id = `${uid}-${Date.now()}`
  await setDoc(doc(d, 'diagnoses', id), {
    ...report,
    diagnosisId: id,
    userId: uid,
    symptom,
    at: new Date().toISOString(),
    createdAt: serverTimestamp(),
  })
}

export async function loadDiagnoses(uid: string): Promise<StoredDiagnosis[]> {
  const d = db()
  if (!d) return []
  const snap = await getDocs(query(collection(d, 'diagnoses'), where('userId', '==', uid)))
  return snap.docs
    .map((s) => s.data() as StoredDiagnosis)
    .toSorted((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
}

/* -------------------------------------------------------------- the exit */

/** Firestore Timestamps do not survive JSON.stringify as anything readable. */
function readable(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object') return value
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  if (Array.isArray(value)) return value.map(readable)
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, readable(v)]))
}

async function ownedBy(d: Firestore, name: string, uid: string) {
  const snap = await getDocs(query(collection(d, name), where('userId', '==', uid)))
  return snap.docs.map((s) => readable(s.data()))
}

export async function exportEverything(user: User): Promise<Record<string, unknown>> {
  const d = db()
  if (!d) throw new Error('Firebase is not configured.')
  const [profile, car, preferences, diagnoses, chats] = await Promise.all([
    getDoc(doc(d, 'users', user.uid)),
    loadCar(user.uid),
    loadPreferences(user.uid),
    ownedBy(d, 'diagnoses', user.uid),
    ownedBy(d, 'chats', user.uid),
  ])

  return {
    exportedAt: new Date().toISOString(),
    account: { uid: user.uid, email: user.email, name: user.displayName },
    profile: profile.exists() ? readable(profile.data()) : null,
    car: readable(car),
    preferences,
    diagnoses,
    conversations: chats,
  }
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // A few megabytes of conversation history would otherwise sit in memory
  // for the life of the tab.
  URL.revokeObjectURL(url)
}

/**
 * Erase everything, then the account itself.
 *
 * Firestore has no cascade, so every collection that can hold this person's
 * data is named here explicitly. A collection added later and not added to
 * this list is a silent privacy failure — the account will look deleted and
 * will not be.
 *
 * Documents first, then the auth record: reversed, the request loses the
 * credentials its own rules are checking and orphans everything else.
 */
export async function deleteEverything(user: User): Promise<void> {
  const d = db()
  if (!d) throw new Error('Firebase is not configured.')

  await Promise.all([
    deleteDoc(doc(d, 'users', user.uid)).catch(() => {}),
    deleteDoc(doc(d, 'cars', user.uid)).catch(() => {}),
    deleteDoc(doc(d, 'preferences', user.uid)).catch(() => {}),
  ])

  for (const name of ['diagnoses', 'chats']) {
    const snap = await getDocs(query(collection(d, name), where('userId', '==', user.uid)))
    await Promise.all(snap.docs.map((s) => deleteDoc(s.ref).catch(() => {})))
  }

  await deleteUser(user)
}

/** Kept here so every write to the user's own record lives in one module. */
export async function setDisplayName(user: User, name: string): Promise<void> {
  await updateProfile(user, { displayName: name })
}
