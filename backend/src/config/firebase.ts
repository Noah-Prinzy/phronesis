// backend/src/config/firebase.ts

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';

/**
 * Whether anything here can actually reach Firestore.
 *
 * Without a service account the Admin SDK falls back to Application Default
 * Credentials, which on a developer's laptop do not exist — so every history
 * call fails, one stack trace at a time, several per request. The server
 * survives it, which is worse than it sounds: nothing looks obviously broken,
 * the log becomes unreadable, and the cause is buried under repetition.
 *
 * So it is decided once, here, and said once at startup. Everything that
 * stores or reads history checks this and does nothing rather than throwing.
 * The app works without it — a conversation simply does not outlive a reload,
 * which is a far better failure than a wall of red.
 */
export const hasFirestore = Boolean(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);

if (!getApps().length) {
  const projectId = env.FIREBASE_PROJECT_ID || 'phronesis-51bc9';

  if (hasFirestore) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    initializeApp({ projectId });
    console.warn(
      '[firebase] No service account, so nothing is being saved or read.\n' +
        '           Chats, diagnoses, saved cars and preferences will not outlive a reload.\n' +
        '           Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in backend/.env — see .env.example.',
    );
  }
}

export const db = getFirestore();
export const auth = getAuth();
