import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBGr47EeApwcfkSsuZ-uyseOLTSAmaIkqI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "progress-tracker-9cdec.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "progress-tracker-9cdec",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "progress-tracker-9cdec.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "963365387128",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:963365387128:web:bad6e8978633260ff3e68d"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
