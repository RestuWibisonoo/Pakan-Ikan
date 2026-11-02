import rateLimit from 'express-rate-limit';
import config from '../config/appConfig.js';

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMinutes * 60 * 1000,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `Terlalu banyak permintaan dari perangkat Anda. Silakan coba kembali setelah ${config.rateLimit.windowMinutes} menit.`,
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maksimal 5 permintaan reset per 15 menit per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak permintaan reset kata sandi. Silakan tunggu 15 menit sebelum mencoba kembali.',
  },
});

// Pembatasan laju untuk perintah manual aktuator (servo pakan & pompa air)
export const actuatorRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 10, // Maksimal 10 perintah per menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak perintah manual dalam waktu singkat. Harap tunggu beberapa saat demi keselamatan perangkat dan ikan.',
  },
});

// Pembatasan laju pengiriman telemetri sensor ESP32
export const telemetryRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 120, // Maksimal 120 data per menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    error: 'Frekuensi pengiriman telemetri melebihi batas aman.',
  },
});

export default {
  authRateLimiter,
  passwordResetRateLimiter,
  actuatorRateLimiter,
  telemetryRateLimiter,
};

