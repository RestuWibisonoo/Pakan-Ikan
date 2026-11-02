import crypto from 'crypto';
import config from '../config/appConfig.js';
import deviceRepository from '../repositories/deviceRepository.js';

/**
 * Perbandingan waktu-konstan aman terhadap timing attacks dan length leakage.
 * Kedua input di-hash dengan SHA-256 (32 byte konstan) sebelum dibandingkan dengan timingSafeEqual.
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Middleware Autentikasi Khusus Perangkat ESP32
 *
 * Memvalidasi kredensial perangkat keras ESP32 melalui header khusus:
 * - X-Device-Key atau X-API-Key atau Authorization: Device <key>
 * - X-Device-Id (opsional, default: fish-feeder-001)
 *
 * Mendukung:
 * 1. Kunci rahasia unik per-perangkat (jika didaftarkan di meta/device_key).
 * 2. Fallback ke kunci sistem DEVICE_API_KEY yang dikonfigurasi.
 * 3. Penolakan aman 503 jika server belum mengonfigurasi rahasia apa pun.
 * 4. Kredensial tidak pernah dicatat dalam log atau respons.
 */
export async function requireDeviceAuth(req, res, next) {
  try {
    const headerKey =
      req.headers['x-device-key'] ||
      req.headers['x-api-key'] ||
      (req.headers.authorization && req.headers.authorization.startsWith('Device ')
        ? req.headers.authorization.split('Device ')[1].trim()
        : null);

    const deviceId =
      req.headers['x-device-id'] ||
      req.body?.deviceId ||
      req.query?.deviceId ||
      config.device.defaultDeviceId;

    const cleanDeviceId = String(deviceId).trim();

    // 1. Cek secret unik per perangkat jika terdaftar di repository
    let expectedKey = null;
    try {
      expectedKey = await deviceRepository.getDeviceSecret(cleanDeviceId);
    } catch {
      // Abaikan error pembacaan database, fallback ke kunci sistem
    }

    if (!expectedKey) {
      expectedKey = config.device.apiKey;
    }

    // Keamanan: Jika server tidak memiliki kunci yang dikonfigurasi sama sekali
    if (!expectedKey || typeof expectedKey !== 'string' || expectedKey.trim() === '') {
      return res.status(503).json({
        success: false,
        code: 'DEVICE_AUTH_NOT_CONFIGURED',
        error: 'Sistem autentikasi perangkat belum dikonfigurasi pada server.',
      });
    }

    if (!headerKey || !safeCompare(headerKey, expectedKey)) {
      return res.status(401).json({
        success: false,
        code: 'DEVICE_UNAUTHORIZED',
        error: 'Akses ditolak: Kredensial perangkat ESP32 tidak valid atau tidak disediakan.',
      });
    }

    req.device = {
      id: cleanDeviceId,
      authenticated: true,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export default requireDeviceAuth;

