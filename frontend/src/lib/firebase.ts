// frontend/src/lib/firebase.ts

import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBsWVoVJoth38jdW0cvUnxT90NFLVx7Ooo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'phronesis-51bc9.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'phronesis-51bc9',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'phronesis-51bc9.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1015130367479',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1015130367479:web:b0f19092fe17139e437af2',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-VDB86VWJMZ',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
