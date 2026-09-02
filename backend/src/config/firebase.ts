// backend/src/config/firebase.ts

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env';

if (!getApps().length) {
  const projectId = env.FIREBASE_PROJECT_ID || 'phronesis-51bc9';

  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    initializeApp({
      projectId,
    });
  }
}

export const db = getFirestore();
export const auth = getAuth();
