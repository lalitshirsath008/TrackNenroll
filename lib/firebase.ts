
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDlc1V1jVnWud6Vjos_L2f2x-aTMW7OlMM",
  authDomain: "tracknenroll.firebaseapp.com",
  projectId: "tracknenroll",
  storageBucket: "tracknenroll.firebasestorage.app",
  messagingSenderId: "1077569938682",
  appId: "1:1077569938682:web:f74c3b617c4dc180091543",
  measurementId: "G-VPQ4XXV36B"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize and export services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
