import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './appConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initializedApp = null;
let hasServiceAccount = false;

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    initializedApp = admin.app();
    return initializedApp;
  }

  let credential = null;

  // 1. Cek string JSON dari environment variable
  if (config.firebase.serviceAccountKey) {
    try {
      const parsedKey = JSON.parse(config.firebase.serviceAccountKey);
      credential = admin.credential.cert(parsedKey);
      hasServiceAccount = true;
    } catch (err) {
      console.error('[Firebase Admin] Gagal mem-parse FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
    }
  }

  // 2. Cek file JSON dari path
  if (!credential && config.firebase.serviceAccountPath) {
    const resolvedPath = path.isAbsolute(config.firebase.serviceAccountPath)
      ? config.firebase.serviceAccountPath
      : path.resolve(__dirname, '..', config.firebase.serviceAccountPath);

    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const parsedKey = JSON.parse(fileContent);
        credential = admin.credential.cert(parsedKey);
        hasServiceAccount = true;
      } catch (err) {
        console.error(`[Firebase Admin] Gagal membaca service account dari ${resolvedPath}:`, err.message);
      }
    }
  }

  // 3. Cek Application Default Credentials (ADC)
  if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      credential = admin.credential.applicationDefault();
      hasServiceAccount = true;
    } catch (err) {
      console.warn('[Firebase Admin] Gagal memuat Application Default Credentials:', err.message);
    }
  }

  // 4. Inisialisasi app
  if (credential) {
    initializedApp = admin.initializeApp({
      credential,
      projectId: config.firebase.projectId,
      databaseURL: config.firebase.databaseUrl,
    });
    console.log(`[Firebase Admin] Terinisialisasi dengan Service Account untuk project: ${config.firebase.projectId}`);
  } else {
    // Inisialisasi dasar tanpa service account (server tetap dapat start)
    initializedApp = admin.initializeApp({
      projectId: config.firebase.projectId,
      databaseURL: config.firebase.databaseUrl,
    });
    console.warn(
      `[Firebase Admin] Berjalan tanpa Service Account credentials untuk project '${config.firebase.projectId}'. ` +
      'Fitur generate link Admin SDK memerlukan file serviceAccountKey.json atau FIREBASE_SERVICE_ACCOUNT_KEY.'
    );
  }

  return initializedApp;
}

export const adminApp = initializeFirebaseAdmin();
export const adminAuth = admin.auth(adminApp);
export const getAdminDatabase = () => {
  try {
    return admin.database(adminApp);
  } catch {
    return null;
  }
};
export const hasAdminCredentials = () => hasServiceAccount;
export const hasDatabaseAccess = () => hasServiceAccount && Boolean(config.firebase.databaseUrl);

let rtdbConnected = false;
let rtdbListenerStarted = false;

export function initRealtimeDatabaseListener() {
  if (rtdbListenerStarted) return;
  if (!hasDatabaseAccess()) return;
  const db = getAdminDatabase();
  if (db) {
    rtdbListenerStarted = true;
    try {
      db.ref('.info/connected').on('value', (snap) => {
        const val = Boolean(snap && snap.val() === true);
        if (val !== rtdbConnected) {
          rtdbConnected = val;
          console.log(`[Firebase RTDB] Status koneksi live berubah: ${rtdbConnected ? 'TERHUBUNG' : 'TERPUTUS'}`);
        }
      });
    } catch (err) {
      console.warn('[Firebase RTDB] Gagal memasang listener .info/connected:', err.message);
    }
  }
}

export function isRealtimeDatabaseLive() {
  return rtdbConnected;
}

// Inisialisasi listener RTDB jika database terkonfigurasi
initRealtimeDatabaseListener();

/**
 * Memeriksa konektivitas live ke Firebase Realtime Database secara read-only.
 * Menggunakan path metadata sistem '.info/connected' dengan batas waktu (timeout).
 * Fungsi ini membedakan secara jujur antara 'konfigurasi siap' dan 'koneksi aktif terverifikasi'.
 *
 * @param {number} timeoutMs Batas waktu pengecekan dalam milidetik (default 2500ms)
 * @returns {Promise<{ configured: boolean, connected: boolean, latencyMs: number|null, status: string, message: string }>}
 */
export async function checkRealtimeDatabaseConnectivity(timeoutMs = 2500) {
  if (!hasDatabaseAccess()) {
    return {
      configured: false,
      connected: false,
      latencyMs: null,
      status: 'unconfigured',
      message: 'Kredensial Firebase Service Account atau Database URL belum terkonfigurasi.',
    };
  }

  const db = getAdminDatabase();
  if (!db) {
    return {
      configured: true,
      connected: false,
      latencyMs: null,
      status: 'unavailable',
      message: 'Objek Firebase Realtime Database tidak dapat diinisialisasi.',
    };
  }

  const startTime = Date.now();
  try {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const timeoutErr = new Error(`Koneksi RTDB melebihi batas waktu ${timeoutMs}ms.`);
        timeoutErr.code = 'TIMEOUT';
        reject(timeoutErr);
      }, timeoutMs);
    });

    const checkPromise = db.ref('.info/connected').once('value');
    const snapshot = await Promise.race([checkPromise, timeoutPromise]);
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    const isConnected = Boolean(snapshot && snapshot.val() === true);

    return {
      configured: true,
      connected: isConnected,
      latencyMs,
      status: isConnected ? 'connected' : 'disconnected',
      message: isConnected
        ? 'Terhubung dengan Firebase Realtime Database.'
        : 'Socket RTDB aktif namun status koneksi live bernilai false.',
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = err.code === 'TIMEOUT' || err.message.includes('timeout');
    return {
      configured: true,
      connected: false,
      latencyMs,
      status: isTimeout ? 'timeout' : 'unreachable',
      message: `Pemeriksaan konektivitas RTDB gagal: ${err.message}`,
    };
  }
}

export default admin;

