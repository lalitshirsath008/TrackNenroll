import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Institutional Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlc1V1jVnWud6Vjos_L2f2x-aTMW7OlMM",
  authDomain: "tracknenroll.firebaseapp.com",
  projectId: "tracknenroll",
  storageBucket: "tracknenroll.firebasestorage.app",
  messagingSenderId: "1077569938682",
  appId: "1:1077569938682:web:f74c3b617c4dc180091543",
  measurementId: "G-VPQ4XXV36B"
};

// Initialize Firebase once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export instances with the specific app reference to ensure registration
// This explicitly binds the services to the correct initialized instance
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;