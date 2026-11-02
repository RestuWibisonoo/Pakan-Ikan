import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyPlaceholderKeyForDevelopmentOnly',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pakan-ikan.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pakan-ikan',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pakan-ikan.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || undefined,
};

// Status apakah konfigurasi environment variable Firebase telah disediakan
export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const database = firebaseConfig.databaseURL ? getDatabase(app) : null;

export default app;

