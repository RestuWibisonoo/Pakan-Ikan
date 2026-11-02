import { getTransporter, isSmtpConfigured } from '../config/smtp.js';
import config from '../config/appConfig.js';
import { renderVerificationEmail } from '../templates/verificationEmail.js';
import { renderPasswordResetEmail } from '../templates/passwordResetEmail.js';

/**
 * Kirim email verifikasi akun
 */
export async function sendVerificationEmail(toEmail, verificationUrl, displayName = '') {
  const transporter = getTransporter();
  const htmlContent = renderVerificationEmail({
    name: displayName,
    verificationUrl,
    supportEmail: config.smtp.fromEmail,
  });

  const mailOptions = {
    from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
    to: toEmail,
    subject: 'Verifikasi Alamat Email Anda - Pakan Ikan',
    html: htmlContent,
    text: `Halo ${displayName || ''}! Silakan verifikasi akun Pakan Ikan Anda melalui tautan berikut: ${verificationUrl}`,
  };

  const info = await transporter.sendMail(mailOptions);

  // Logging aman (tidak mencatat token/link penuh atau kredensial)
  if (isSmtpConfigured()) {
    console.log(`[Email] Email verifikasi berhasil dikirim ke: ${toEmail} (MessageId: ${info.messageId})`);
  } else {
    console.log(`[Email - Mock] Email verifikasi diproses untuk: ${toEmail}`);
  }

  return { success: true, messageId: info.messageId };
}

/**
 * Kirim email pemulihan / atur ulang kata sandi
 */
export async function sendPasswordResetEmail(toEmail, resetUrl, displayName = '') {
  const transporter = getTransporter();
  const htmlContent = renderPasswordResetEmail({
    name: displayName,
    resetUrl,
    supportEmail: config.smtp.fromEmail,
  });

  const mailOptions = {
    from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
    to: toEmail,
    subject: 'Atur Ulang Kata Sandi Akun - Pakan Ikan',
    html: htmlContent,
    text: `Halo ${displayName || ''}! Kami menerima permintaan atur ulang kata sandi Pakan Ikan Anda. Kunjungi tautan berikut: ${resetUrl}`,
  };

  const info = await transporter.sendMail(mailOptions);

  if (isSmtpConfigured()) {
    console.log(`[Email] Email reset password berhasil dikirim ke: ${toEmail} (MessageId: ${info.messageId})`);
  } else {
    console.log(`[Email - Mock] Email reset password diproses untuk: ${toEmail}`);
  }

  return { success: true, messageId: info.messageId };
}

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
};

