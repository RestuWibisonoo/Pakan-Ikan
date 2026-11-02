/**
 * Service API IoT v1 - Pakan Ikan
 *
 * Menghubungkan antarmuka frontend (Dashboard, Jadwal, Riwayat, Pengaturan)
 * ke backend Express API v1 menggunakan Firebase ID Token pengguna.
 */

import { auth } from '../firebase/config';

const API_BASE_URL = (
  import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 6000;

async function fetchWithAuth(endpoint, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const currentUser = auth.currentUser;
  let token = null;

  if (currentUser) {
    try {
      token = await currentUser.getIdToken();
    } catch {
      // Abaikan jika token gagal dimuat
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data.error || `HTTP error ${response.status}`);
      err.status = response.status;
      err.code = data.code;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mengambil status lengkap telemetri pH, pompa, dan servo
 */
export async function getSystemStatus() {
  return fetchWithAuth('/status');
}

/**
 * Mengirim perintah beri pakan manual ke servo
 */
export async function triggerFeed(duration_ms) {
  return fetchWithAuth('/commands/feed', {
    method: 'POST',
    body: JSON.stringify({ duration_ms }),
  });
}

/**
 * Mengatur status aktif/nonaktif pompa air
 */
export async function setPumpState(state) {
  return fetchWithAuth('/commands/pump', {
    method: 'POST',
    body: JSON.stringify({ state }),
  });
}

/**
 * Mengambil daftar jadwal pakan
 */
export async function getSchedules() {
  return fetchWithAuth('/schedules');
}

/**
 * Menambah jadwal pakan baru
 */
export async function createSchedule(schedule) {
  return fetchWithAuth('/schedules', {
    method: 'POST',
    body: JSON.stringify(schedule),
  });
}

/**
 * Memperbarui jadwal pakan
 */
export async function updateSchedule(id, schedule) {
  return fetchWithAuth(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(schedule),
  });
}

/**
 * Menghapus jadwal pakan
 */
export async function deleteSchedule(id) {
  return fetchWithAuth(`/schedules/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Mengambil pengaturan sistem
 */
export async function getSettings() {
  return fetchWithAuth('/settings');
}

/**
 * Memperbarui pengaturan sistem
 */
export async function updateSettings(settings) {
  return fetchWithAuth('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

/**
 * Mengambil riwayat nilai pH
 */
export async function getPhLogs(limit = 20) {
  return fetchWithAuth(`/logs/ph?limit=${limit}`);
}

/**
 * Mengambil riwayat log aksi pemberian pakan dan pompa
 */
export async function getActionLogs(limit = 20) {
  return fetchWithAuth(`/logs/actions?limit=${limit}`);
}

export default {
  getSystemStatus,
  triggerFeed,
  setPumpState,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSettings,
  updateSettings,
  getPhLogs,
  getActionLogs,
};

