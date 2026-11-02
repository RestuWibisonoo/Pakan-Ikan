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

export default admin;

