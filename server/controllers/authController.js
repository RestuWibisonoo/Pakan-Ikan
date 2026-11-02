import { adminAuth, hasAdminCredentials } from '../config/firebaseAdmin.js';
import { isSmtpConfigured } from '../config/smtp.js';
import config from '../config/appConfig.js';
import linkService from '../services/linkService.js';
import emailService from '../services/emailService.js';

// Validasi format email dasar
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Controller: Kirim Email Verifikasi
 * Wajib terautentikasi melalui Firebase ID Token
 */
export async function sendVerification(req, res) {
  try {
    // Keamanan: HANYA gunakan email dari token ID Firebase yang sudah divalidasi
    const authenticatedEmail = req.user?.email;
    const authenticatedName = req.user?.name || '';
    const isEmailVerified = req.user?.email_verified;

    if (!authenticatedEmail) {
      return res.status(400).json({
        success: false,
        error: 'Akun Anda tidak memiliki alamat email yang valid.',
      });
    }

    if (isEmailVerified) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Alamat email Anda sudah terverifikasi.',
      });
    }

    // Fail-safe di production: jika SMTP belum dikonfigurasi, kembalikan 503 agar frontend failover ke Firebase Client
    if (config.nodeEnv === 'production' && !isSmtpConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        error: 'Layanan email kustom belum terkonfigurasi pada server.',
      });
    }

    const { continueUrl } = req.body || {};

    const verificationUrl = await linkService.createEmailVerificationLink(
      authenticatedEmail,
      continueUrl
    );

    await emailService.sendVerificationEmail(
      authenticatedEmail,
      verificationUrl,
      authenticatedName
    );

    return res.status(200).json({
      success: true,
      message: 'Email verifikasi berhasil dikirim. Silakan periksa kotak masuk atau spam email Anda.',
    });
  } catch (err) {
    if (!hasAdminCredentials()) {
      return res.status(503).json({
        success: false,
        error: 'Layanan email backend belum siap: Firebase Admin Service Account belum dikonfigurasi.',
      });
    }

    if (config.nodeEnv === 'production' && !isSmtpConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        error: 'Layanan email kustom belum terkonfigurasi pada server.',
      });
    }
    console.error('[AuthController] Error sendVerification:', err.message);
    return res.status(500).json({
      success: false,
      code: 'EMAIL_SEND_FAILED',
      error: `Gagal mengirim email verifikasi: ${err.message}`,
    });
  }
}

/**
 * Controller: Kirim Ulang Email Verifikasi
 * Wajib terautentikasi melalui Firebase ID Token
 */
export async function resendVerification(req, res) {
  try {
    const authenticatedEmail = req.user?.email;
    const authenticatedName = req.user?.name || '';
    const isEmailVerified = req.user?.email_verified;

    if (!authenticatedEmail) {
      return res.status(400).json({
        success: false,
        error: 'Akun Anda tidak memiliki alamat email yang valid.',
      });
    }

    if (isEmailVerified) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Alamat email Anda sudah terverifikasi.',
      });
    }

    // Fail-safe di production: jika SMTP belum dikonfigurasi, kembalikan 503 agar frontend failover ke Firebase Client
    if (config.nodeEnv === 'production' && !isSmtpConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        error: 'Layanan email kustom belum terkonfigurasi pada server.',
      });
    }

    const { continueUrl } = req.body || {};

    const verificationUrl = await linkService.createEmailVerificationLink(
      authenticatedEmail,
      continueUrl
    );

    await emailService.sendVerificationEmail(
      authenticatedEmail,
      verificationUrl,
      authenticatedName
    );

    return res.status(200).json({
      success: true,
      message: 'Tautan verifikasi baru berhasil dikirim ke alamat email Anda.',
    });
  } catch (err) {
    if (!hasAdminCredentials()) {
      return res.status(503).json({
        success: false,
        error: 'Layanan email backend belum siap: Firebase Admin Service Account belum dikonfigurasi.',
      });
    }

    if (config.nodeEnv === 'production' && !isSmtpConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        error: 'Layanan email kustom belum terkonfigurasi pada server.',
      });
    }
    console.error('[AuthController] Error resendVerification:', err.message);
    return res.status(500).json({
      success: false,
      code: 'EMAIL_SEND_FAILED',
      error: `Gagal mengirim ulang email verifikasi: ${err.message}`,
    });
  }
}

/**
 * Controller: Kirim Email Reset Kata Sandi
 * Endpoint publik - Aman dari email enumeration
 */
export async function sendPasswordReset(req, res, next) {
  try {
    const { email, continueUrl } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Silakan masukkan alamat email Anda.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Format alamat email tidak valid.',
      });
    }

    // Pesan respons aman yang seragam untuk mencegah enumerasi akun
    const safeResponse = {
      success: true,
      message: 'Jika alamat email terdaftar pada sistem Pakan Ikan, instruksi pemulihan kata sandi telah dikirimkan ke email Anda.',
    };

    if (!hasAdminCredentials()) {
      return res.status(503).json({
        success: false,
        error: 'Layanan email backend belum siap: Firebase Admin Service Account belum dikonfigurasi.',
      });
    }

    if (config.nodeEnv === 'production' && !isSmtpConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        error: 'Layanan email kustom belum terkonfigurasi pada server.',
      });
    }

    try {
      // Periksa apakah pengguna terdaftar di Firebase
      const userRecord = await adminAuth.getUserByEmail(cleanEmail);

      const resetUrl = await linkService.createPasswordResetLink(
        cleanEmail,
        continueUrl
      );

      await emailService.sendPasswordResetEmail(
        cleanEmail,
        resetUrl,
        userRecord.displayName || ''
      );
    } catch (err) {
      // Jika user tidak ditemukan, jangan lempar error ke frontend demi keamanan privasi
      if (err.code === 'auth/user-not-found') {
        return res.status(200).json(safeResponse);
      }
      // Error lain (misal koneksi SMTP atau Firebase API) dicatat dan ditangani
      throw err;
    }

    return res.status(200).json(safeResponse);
  } catch (err) {
    next(err);
  }
}

export default {
  sendVerification,
  resendVerification,
  sendPasswordReset,
};

