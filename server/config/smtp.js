import nodemailer from 'nodemailer';
import config from './appConfig.js';

let transporterInstance = null;
let isConfigured = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

export function getTransporter() {
  if (transporterInstance) {
    return transporterInstance;
  }

  if (isConfigured) {
    transporterInstance = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
    console.log(`[SMTP] Transporter dikonfigurasi untuk host: ${config.smtp.host}`);
  } else {
    // Mode testing / fallback development: gunakan stream / json transport agar tidak melempar error saat belum ada SMTP
    transporterInstance = nodemailer.createTransport({
      jsonTransport: true,
    });
    console.warn(
      '[SMTP] Kredensial SMTP belum diisi di server/.env. Menggunakan jsonTransport untuk pengujian lokal (email tidak terkirim ke inbox sungguhan).'
    );
  }

  return transporterInstance;
}

export const isSmtpConfigured = () => isConfigured;

export async function verifySmtpConnection() {
  if (!isConfigured) {
    return {
      success: false,
      message: 'SMTP belum dikonfigurasi di environment variables.',
    };
  }

  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: 'Koneksi server SMTP berhasil diverifikasi.' };
  } catch (err) {
    return { success: false, message: `Gagal terhubung ke SMTP: ${err.message}` };
  }
}

export default getTransporter;

