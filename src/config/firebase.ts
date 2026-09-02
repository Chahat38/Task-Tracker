import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBGr47EeApwcfkSsuZ-uyseOLTSAmaIkqI",
  authDomain: "progress-tracker-9cdec.firebaseapp.com",
  projectId: "progress-tracker-9cdec",
  storageBucket: "progress-tracker-9cdec.firebasestorage.app",
  messagingSenderId: "963365387128",
  appId: "1:963365387128:web:bad6e8978633260ff3e68d"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
