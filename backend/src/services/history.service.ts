// backend/src/services/history.service.ts

import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { db } from '../config/firebase';

export interface UserProfileData {
  uid: string;
  email?: string;
  displayName?: string;
  journey?: 'pre-car' | 'post-car';
}

export interface CarProfileData {
  userId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  engineType?: string;
  fuelType?: string;
  transmission?: string;
  mileage?: number;
  tankSize?: number;
  lastServiceDate?: string;
}

/**
 * The alert switches, stored per user rather than per device: someone who
 * turns off service reminders on their phone means it, not "on this handset".
 * That is the opposite of the speak-aloud setting, which IS per device, and
 * lives in localStorage for exactly that reason.
 */
export interface PreferencesData {
  /** Only for faults marked critical or high. Never anything cosmetic. */
  faultAlerts?: boolean;
  /** Driven by mileage rather than a calendar. */
  serviceReminders?: boolean;
}

export interface SaveDiagnosisInput {
  userId: string;
  symptomText: string;
  carProfile?: Record<string, any>;
  obdSnapshot?: Record<string, any>;
  report: Record<string, any>;
}

export interface SaveChatMessageInput {
  userId: string;
  journey?: 'pre-car' | 'post-car';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function syncUserProfile(data: UserProfileData): Promise<void> {
  const userRef = db.collection('users').doc(data.uid);
  await userRef.set(
    {
      uid: data.uid,
      ...(data.email && { email: data.email }),
      ...(data.displayName && { displayName: data.displayName }),
      ...(data.journey && { journey: data.journey }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveCarProfile(data: CarProfileData): Promise<string> {
  const carRef = db.collection('cars').doc(data.userId);
  await carRef.set(
    {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return carRef.id;
}

export async function getCarProfile(userId: string): Promise<Record<string, any> | null> {
  const doc = await db.collection('cars').doc(userId).get();
  return doc.exists ? doc.data() || null : null;
}

export async function saveDiagnosisReport(input: SaveDiagnosisInput): Promise<string> {
  const docRef = db.collection('diagnoses').doc();
  await docRef.set({
    diagnosisId: docRef.id,
    userId: input.userId,
    symptomText: input.symptomText,
    carProfile: input.carProfile || null,
    obdSnapshot: input.obdSnapshot || null,
    report: input.report,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserDiagnoses(userId: string): Promise<Array<Record<string, any>>> {
  const snapshot = await db
    .collection('diagnoses')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  }));
}

export async function saveChatSession(input: SaveChatMessageInput): Promise<string> {
  const docRef = db.collection('chats').doc();
  await docRef.set({
    chatId: docRef.id,
    userId: input.userId,
    journey: input.journey || 'post-car',
    messages: input.messages,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserChats(userId: string): Promise<Array<Record<string, any>>> {
  const snapshot = await db
    .collection('chats')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .limit(20)
    .get();

  return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data(),
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  }));
}


// ------------------------------------------------------------- preferences

const DEFAULT_PREFERENCES: Required<PreferencesData> = {
  faultAlerts: true,
  serviceReminders: false,
};

export async function getPreferences(userId: string): Promise<Required<PreferencesData>> {
  const doc = await db.collection('preferences').doc(userId).get();
  // Defaults rather than nulls: a user who has never opened Account should be
  // told what WILL happen, not shown an empty switch.
  return { ...DEFAULT_PREFERENCES, ...(doc.exists ? doc.data() : {}) };
}

export async function savePreferences(userId: string, data: PreferencesData): Promise<void> {
  await db
    .collection('preferences')
    .doc(userId)
    .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

// ------------------------------------------------------------------ export

/**
 * Everything held about one person, in one object.
 *
 * Assembled rather than dumped: Firestore timestamps do not survive
 * JSON.stringify as anything readable, so they are converted to ISO strings.
 * A file someone cannot open is not a copy of their data.
 */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const [profile, car, diagnoses, chats, preferences] = await Promise.all([
    db.collection('users').doc(userId).get(),
    getCarProfile(userId),
    getUserDiagnoses(userId),
    getUserChats(userId),
    getPreferences(userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: readable(profile.exists ? profile.data() : null),
    car: readable(car),
    preferences,
    diagnoses: diagnoses.map(readable),
    conversations: chats.map(readable),
  };
}

/** Firestore Timestamps become ISO strings; everything else passes through. */
function readable(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(readable);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, readable(v)]));
}

// ------------------------------------------------------------------ delete

/**
 * Erase everything belonging to one user.
 *
 * Firestore has no cascade, so every collection that can hold their data is
 * named here explicitly. A collection added later and not added to this list
 * is a silent privacy failure — the account will look deleted and will not be
 * — which is why this sits next to the writes rather than somewhere tidier.
 */
export async function deleteUserData(userId: string): Promise<void> {
  const owned = ['users', 'cars', 'preferences'];
  const queried = ['diagnoses', 'chats'];

  const batch = db.batch();
  for (const name of owned) {
    batch.delete(db.collection(name).doc(userId));
  }
  for (const name of queried) {
    const snap = await db.collection(name).where('userId', '==', userId).get();
    snap.docs.forEach((d) => batch.delete(d.ref));
  }
  await batch.commit();
}
