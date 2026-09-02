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
