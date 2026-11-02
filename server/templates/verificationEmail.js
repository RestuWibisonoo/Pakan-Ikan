/**
 * Template Email Verifikasi Akun Pakan Ikan
 * Desain: Modern, Responsif, Palet Aquatic / Deep Emerald Green
 */
export function renderVerificationEmail({ name, verificationUrl, supportEmail = 'katasandi.pakanikan@gmail.com' }) {
  const greeting = name ? `Halo, <strong>${escapeHtml(name)}</strong>!` : 'Halo!';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Alamat Email Anda - Pakan Ikan</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b1320;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b1320;
      padding: 40px 10px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: #111e30;
      border: 1px solid rgba(20, 184, 166, 0.25);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #064e3b 0%, #0f766e 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .brand-title {
      color: #ffffff;
      font-size: 26px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      color: #a7f3d0;
      font-size: 13px;
      margin-top: 6px;
      margin-bottom: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 36px 32px;
      line-height: 1.65;
      font-size: 15px;
      color: #e2e8f0;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 16px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn-verify {
      display: inline-block;
      background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);
    }
    .info-box {
      background: rgba(15, 118, 110, 0.12);
      border-left: 4px solid #14b8a6;
      border-radius: 6px;
      padding: 14px 16px;
      margin: 24px 0;
      font-size: 13.5px;
      color: #cbd5e1;
    }
    .security-notice {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      margin-top: 28px;
      font-size: 12.5px;
      color: #94a3b8;
    }
    .footer {
      background: #09111c;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .fallback-url {
      word-break: break-all;
      color: #14b8a6;
      font-size: 12px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1 class="brand-title">Pakan Ikan</h1>
        <p class="brand-subtitle">Smart Fish Feeder & Water Quality System</p>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="greeting">${greeting}</div>
        <p>
          Terima kasih telah mendaftar di <strong>Pakan Ikan</strong>. Untuk memastikan keamanan akun dan mengaktifkan akses penuh ke sistem monitoring pakan serta kualitas air kolam Anda, silakan verifikasi alamat email Anda.
        </p>

        <!-- CTA Button -->
        <div class="button-container">
          <a href="${verificationUrl}" class="btn-verify" target="_blank" rel="noopener noreferrer">
            Verifikasi Email Saya
          </a>
        </div>

        <!-- Info Box -->
        <div class="info-box">
          <strong>Perhatian:</strong> Tautan verifikasi ini bersifat sekali pakai (one-time use) dan akan kedaluwarsa demi keamanan akun Anda.
        </div>

        <p style="font-size: 13.5px; color: #94a3b8;">
          Jika tombol di atas tidak dapat diklik, salin dan tempel tautan berikut ke peramban Anda:
          <br>
          <a href="${verificationUrl}" class="fallback-url" target="_blank">${verificationUrl}</a>
        </p>

        <!-- Security Notice -->
        <div class="security-notice">
          <strong>Pemberitahuan Keamanan:</strong> Jika Anda tidak pernah merasa mendaftar di sistem Pakan Ikan, Anda dapat mengabaikan email ini dengan aman. Tidak ada akun yang akan diaktifkan tanpa konfirmasi dari Anda.
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin: 0 0 6px 0;"><strong>Pakan Ikan</strong> — Sistem Pemberian Pakan Otomatis & Monitoring pH Air Real-Time</p>
        <p style="margin: 0;">Butuh bantuan? Hubungi kami di <a href="mailto:${supportEmail}" style="color: #14b8a6; text-decoration: none;">${supportEmail}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default renderVerificationEmail;

