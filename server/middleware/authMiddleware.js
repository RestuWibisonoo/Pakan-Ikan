import { adminAuth } from '../config/firebaseAdmin.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_MISSING',
      error: 'Token autentikasi tidak ditemukan. Harap sertakan Authorization: Bearer <idToken>.',
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_INVALID',
      error: 'Format token autentikasi tidak valid.',
    });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    // Simpan informasi pengguna terverifikasi pada request
    req.user = decodedToken;
    next();
  } catch {
    // Jangan mencatat detail internal token di log publik
    return res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_EXPIRED',
      error: 'Sesi autentikasi tidak valid atau telah kedaluwarsa. Silakan masuk kembali.',
    });
  }
}

export default requireAuth;
