import crypto from 'crypto';
import config from '../config/appConfig.js';

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware Autentikasi Khusus Perangkat ESP32
 *
 * Memvalidasi kredensial perangkat keras ESP32 melalui header khusus:
 * - X-Device-Key atau X-API-Key atau Authorization: Device <key>
 * - X-Device-Id (opsional, default: fish-feeder-001)
 *
 * ESP32 TIDAK diperlakukan sebagai pengguna email/password Firebase.
 */
export function requireDeviceAuth(req, res, next) {
  const headerKey =
    req.headers['x-device-key'] ||
    req.headers['x-api-key'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Device ')
      ? req.headers.authorization.split('Device ')[1].trim()
      : null);

  const configuredKey = config.device.apiKey;

  if (!headerKey || !safeCompare(headerKey, configuredKey)) {
    return res.status(401).json({
      success: false,
      code: 'DEVICE_UNAUTHORIZED',
      error: 'Akses ditolak: Kredensial perangkat ESP32 tidak valid atau tidak disediakan.',
    });
  }

  const deviceId =
    req.headers['x-device-id'] ||
    req.body?.deviceId ||
    config.device.defaultDeviceId;

  req.device = {
    id: String(deviceId).trim(),
    authenticated: true,
  };

  next();
}

export default requireDeviceAuth;

