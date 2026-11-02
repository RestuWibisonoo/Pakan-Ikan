import { Router } from 'express';
import { sendVerification, resendVerification, sendPasswordReset } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Kirim email verifikasi (wajib terautentikasi ID token Firebase)
router.post('/send-verification', authRateLimiter, requireAuth, sendVerification);

// Kirim ulang email verifikasi (wajib terautentikasi ID token Firebase)
router.post('/resend-verification', authRateLimiter, requireAuth, resendVerification);

// Kirim email reset kata sandi (publik dengan proteksi rate limiter & anti-enumeration)
router.post('/send-password-reset', passwordResetRateLimiter, sendPasswordReset);

export default router;

