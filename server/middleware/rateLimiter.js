import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit (dilonggarkan untuk testing)
  max: 1000, // Batas ditinggikan agar pengujian login/verifikasi tidak terkunci
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit.',
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit (dilonggarkan untuk testing)
  max: 1000, // Batas ditinggikan untuk testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak permintaan reset kata sandi. Silakan tunggu 1 menit.',
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

