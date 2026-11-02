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

export default {
  authRateLimiter,
  passwordResetRateLimiter,
};

