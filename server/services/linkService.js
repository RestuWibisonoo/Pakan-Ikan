import { adminAuth, hasAdminCredentials } from '../config/firebaseAdmin.js';
import config from '../config/appConfig.js';

/**
 * Validasi apakah continueUrl yang diberikan berasal dari domain yang diizinkan
 */
export function isAllowedContinueUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    // Izinkan localhost pada port frontend dev
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }
    // Izinkan domain resmi pakan-ikan.my.id dan subdomainnya
    if (parsed.hostname === 'pakan-ikan.my.id' || parsed.hostname.endsWith('.pakan-ikan.my.id')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Ekstraksi parameter oobCode dari link bawaan Firebase Admin SDK
 * dan bangun URL handler khusus di frontend React (/auth/action)
 */
export function extractAndBuildCustomActionUrl(rawFirebaseLink, customContinueUrl = null) {
  if (!rawFirebaseLink) {
    throw new Error('Link Firebase tidak valid atau kosong.');
  }

  const parsedFirebaseUrl = new URL(rawFirebaseLink);
  const oobCode = parsedFirebaseUrl.searchParams.get('oobCode');
  const mode = parsedFirebaseUrl.searchParams.get('mode');
  const apiKey = parsedFirebaseUrl.searchParams.get('apiKey');
  const existingContinueUrl = parsedFirebaseUrl.searchParams.get('continueUrl');

  if (!oobCode || !mode) {
    throw new Error('Parameter oobCode atau mode tidak ditemukan pada link Firebase.');
  }

  // Tentukan continueUrl yang aman
  const selectedContinue = customContinueUrl && isAllowedContinueUrl(customContinueUrl)
    ? customContinueUrl
    : existingContinueUrl && isAllowedContinueUrl(existingContinueUrl)
      ? existingContinueUrl
      : `${config.frontendUrl}/login`;

  // Bangun URL menuju React Action Handler (/auth/action)
  const customUrl = new URL('/auth/action', config.frontendUrl);
  customUrl.searchParams.set('mode', mode);
  customUrl.searchParams.set('oobCode', oobCode);
  if (apiKey) {
    customUrl.searchParams.set('apiKey', apiKey);
  }
  if (selectedContinue) {
    customUrl.searchParams.set('continueUrl', selectedContinue);
  }

  return customUrl.toString();
}

/**
 * Buat link verifikasi email kustom
 */
export async function createEmailVerificationLink(email, continueUrl = null) {
  if (!hasAdminCredentials()) {
    throw new Error('Firebase Admin SDK Service Account credentials belum dikonfigurasi di server.');
  }

  const targetContinueUrl = continueUrl && isAllowedContinueUrl(continueUrl)
    ? continueUrl
    : `${config.frontendUrl}/login`;

  const actionCodeSettings = {
    url: targetContinueUrl,
    handleCodeInApp: true,
  };

  const rawLink = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);
  return extractAndBuildCustomActionUrl(rawLink, targetContinueUrl);
}

/**
 * Buat link reset password kustom
 */
export async function createPasswordResetLink(email, continueUrl = null) {
  if (!hasAdminCredentials()) {
    throw new Error('Firebase Admin SDK Service Account credentials belum dikonfigurasi di server.');
  }

  const targetContinueUrl = continueUrl && isAllowedContinueUrl(continueUrl)
    ? continueUrl
    : `${config.frontendUrl}/login`;

  const actionCodeSettings = {
    url: targetContinueUrl,
    handleCodeInApp: true,
  };

  const rawLink = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
  return extractAndBuildCustomActionUrl(rawLink, targetContinueUrl);
}

export default {
  isAllowedContinueUrl,
  extractAndBuildCustomActionUrl,
  createEmailVerificationLink,
  createPasswordResetLink,
};

