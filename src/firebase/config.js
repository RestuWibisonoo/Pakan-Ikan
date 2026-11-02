import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const rawAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const rawStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const rawMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const rawAppId = import.meta.env.VITE_FIREBASE_APP_ID;
const rawMeasurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
const rawDatabaseUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;

// Daftar key wajib untuk menentukan apakah Firebase telah dikonfigurasi dengan benar
const requiredConfig = {
  apiKey: rawApiKey,
  projectId: rawProjectId,
  appId: rawAppId,
};

const missingKeys = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

// Status apakah environment variable Firebase resmi telah disediakan dan valid
export const isFirebaseConfigured = Boolean(
  missingKeys.length === 0 &&
  rawProjectId === 'pakan-ikan-4c18e'
);

// Pesan diagnostik yang jelas pada mode development jika konfigurasi belum lengkap atau salah
if (!isFirebaseConfigured && typeof window !== 'undefined' && import.meta.env.DEV) {
  if (rawProjectId && rawProjectId !== 'pakan-ikan-4c18e') {
    console.error(
      `[Pakan Ikan] Project ID Firebase tidak sesuai! Ditemukan: '${rawProjectId}', seharusnya: 'pakan-ikan-4c18e'. Periksa .env.local Anda.`
    );
  } else {
    console.warn(
      `[Pakan Ikan] Konfigurasi Firebase belum lengkap di .env.local. Variabel yang belum diisi: ${missingKeys.join(', ')}.`
    );
  }
}

// Konfigurasi resmi proyek Pakan-Ikan (Project ID: pakan-ikan-4c18e)
const firebaseConfig = {
  apiKey: rawApiKey || 'AIzaSyDO4JXKcHrTcufS9LavNMLGhpwJxYbdUP8',
  authDomain: rawAuthDomain || 'pakan-ikan-4c18e.firebaseapp.com',
  projectId: rawProjectId || 'pakan-ikan-4c18e',
  storageBucket: rawStorageBucket || 'pakan-ikan-4c18e.firebasestorage.app',
  messagingSenderId: rawMessagingSenderId || '995038198723',
  appId: rawAppId || '1:995038198723:web:dfe5d757b5a1988eb51b76',
  measurementId: rawMeasurementId || 'G-3J6XKTQNJP',
  databaseURL: rawDatabaseUrl || undefined,
};

// Inisialisasi Firebase App singleton (mencegah inisialisasi ganda)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Firebase Authentication
export const auth = getAuth(app);

// Inisialisasi Realtime Database (hanya jika konfigurasi URL database tersedia)
export const database = firebaseConfig.databaseURL ? getDatabase(app) : null;

// Inisialisasi Firebase Analytics secara kondisional & aman
export let analytics = null;

if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[Pakan Ikan] Firebase Analytics tidak tersedia pada browser ini:', err);
      }
    });
}

export default app;
