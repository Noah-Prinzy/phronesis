// backend/src/services/history.service.ts

import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';

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
  /**
   * The new turn only — the question and the answer — NOT the whole
   * conversation. The stored thread is whatever is already in the document
   * plus this.
   */
  append: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** The session to append to. Absent starts a new one. Ownership is checked. */
  chatId?: string;
}

/**
 * How much of a conversation is kept.
 *
 * A Firestore document is capped at 1MB, and a thread that now survives
 * reloads has no natural end. Hitting that ceiling would make every
 * subsequent save fail — the history would silently stop growing with no
 * error anyone sees. Four hundred messages is far beyond any real
 * conversation and comfortably inside the limit.
 */
const MAX_STORED_MESSAGES = 400;

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

/**
 * Write a conversation, as ONE document that grows.
 *
 * It used to call `.doc()` with no id on every turn, which mints a new
 * document each time — and since the client posts the whole conversation with
 * each request, every one of those documents held the entire history up to
 * that point. A twenty-turn chat left twenty documents totalling four hundred
 * messages, `getUserChats` returned twenty copies of the same conversation
 * under twenty different ids, and the growth was quadratic in a collection
 * that is billed by the read.
 *
 * So the caller passes back the id it was given and the session is updated in
 * place. A missing id means a genuinely new conversation.
 *
 * **The id is checked before it is trusted.** It arrives from the client, and
 * writing to whatever document id someone sends would let one account
 * overwrite another's chat. An id that does not exist or belongs to somebody
 * else silently starts a new session rather than erroring: the reply has
 * already been streamed by this point, and failing the save is not worth
 * losing it over.
 */
export async function saveChatSession(input: SaveChatMessageInput): Promise<string> {
  const existing = input.chatId
    ? await db.collection('chats').doc(input.chatId).get()
    : null;

  const mine = existing?.exists && existing.data()?.userId === input.userId;
  const docRef = mine
    ? db.collection('chats').doc(input.chatId!)
    : db.collection('chats').doc();

  /**
   * The thread grows HERE, from what is already stored.
   *
   * The client only sends the recent tail of the conversation with each
   * question — it has to, or the prompt grows without limit — so writing
   * whatever it sent would quietly truncate the stored history down to that
   * same tail. The server owns the full record; the client owns the context
   * window. Those are different lengths and conflating them loses the older
   * half of every long conversation.
   */
  const previous: SaveChatMessageInput['append'] = mine
    ? (existing?.data()?.messages ?? [])
    : [];
  const messages = [...previous, ...input.append].slice(-MAX_STORED_MESSAGES);

  await docRef.set(
    {
      chatId: docRef.id,
      userId: input.userId,
      journey: input.journey || 'post-car',
      messages,
      // Only on creation, or every update would reset when the chat began.
      ...(mine ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
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
