/**
 * Service API Otentikasi Email Kustom - Pakan Ikan
 *
 * Menghubungkan frontend ke backend Express untuk pengiriman email bermerek Pakan Ikan
 * menggunakan Firebase Admin SDK + Nodemailer.
 * Menyediakan failover otomatis ke Firebase client bawaan jika backend offline atau tidak terkonfigurasi.
 */

import { auth } from '../firebase/config';

const API_BASE_URL = (
  import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 6000;

/**
 * Helper fetch dengan timeout untuk mencegah UI menggantung jika backend tidak merespons
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Periksa ketersediaan backend dan status kredensial Firebase Admin SDK
 */
export async function checkBackendHealth() {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/health`, {
      method: 'GET',
    }, 3000);
    if (!res.ok) return { online: false, ready: false };
    const data = await res.json();
    return {
      online: true,
      ready: Boolean(data?.services?.firebaseAdminReady),
      data,
    };
  } catch {
    return { online: false, ready: false };
  }
}

/**
 * Kirim email verifikasi kustom melalui backend Express
 * @param {import('firebase/auth').User} user
 * @param {string} [continueUrl]
 */
export async function sendCustomVerificationEmail(user, continueUrl) {
  const targetUser = user || auth.currentUser;
  if (!targetUser) {
    throw new Error('Pengguna belum terautentikasi.');
  }

  const idToken = await targetUser.getIdToken(true);
  const fallbackUrl = continueUrl || `${window.location.origin}/login`;

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/send-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ continueUrl: fallbackUrl }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(result.error || 'Gagal mengirim email verifikasi dari server backend.');
    err.status = response.status;
    err.code = result.code;
    throw err;
  }

  return result;
}

/**
 * Kirim ulang email verifikasi kustom melalui backend Express
 * @param {import('firebase/auth').User} user
 * @param {string} [continueUrl]
 */
export async function resendCustomVerificationEmail(user, continueUrl) {
  const targetUser = user || auth.currentUser;
  if (!targetUser) {
    throw new Error('Pengguna belum terautentikasi.');
  }

  const idToken = await targetUser.getIdToken(true);
  const fallbackUrl = continueUrl || `${window.location.origin}/login`;

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ continueUrl: fallbackUrl }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(result.error || 'Gagal mengirim ulang email verifikasi dari server backend.');
    err.status = response.status;
    err.code = result.code;
    throw err;
  }

  return result;
}

/**
 * Kirim email atur ulang kata sandi kustom melalui backend Express
 * @param {string} email
 * @param {string} [continueUrl]
 */
export async function sendCustomPasswordResetEmail(email, continueUrl) {
  if (!email) {
    throw new Error('Alamat email wajib diisi.');
  }

  const fallbackUrl = continueUrl || `${window.location.origin}/login`;

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/send-password-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      continueUrl: fallbackUrl,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(result.error || 'Gagal mengirim email pemulihan kata sandi dari server backend.');
    err.status = response.status;
    err.code = result.code;
    throw err;
  }

  return result;
}

export default {
  checkBackendHealth,
  sendCustomVerificationEmail,
  resendCustomVerificationEmail,
  sendCustomPasswordResetEmail,
};

