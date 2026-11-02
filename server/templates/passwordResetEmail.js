/**
 * Template Email Reset Kata Sandi Pakan Ikan
 * Desain: Modern, Responsif, Palet Aquatic / Deep Emerald Green
 */
export function renderPasswordResetEmail({ name, resetUrl, supportEmail = 'katasandi.pakanikan@gmail.com' }) {
  const greeting = name ? `Halo, <strong>${escapeHtml(name)}</strong>!` : 'Halo!';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atur Ulang Kata Sandi - Pakan Ikan</title>
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
    .btn-reset {
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
    .warning-box {
      background: rgba(245, 158, 11, 0.1);
      border-left: 4px solid #f59e0b;
      border-radius: 6px;
      padding: 14px 16px;
      margin: 24px 0;
      font-size: 13.5px;
      color: #fde68a;
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
          Kami menerima permintaan untuk mengatur ulang kata sandi akun <strong>Pakan Ikan</strong> Anda. Silakan klik tombol di bawah ini untuk membuat kata sandi baru yang aman:
        </p>

        <!-- CTA Button -->
        <div class="button-container">
          <a href="${resetUrl}" class="btn-reset" target="_blank" rel="noopener noreferrer">
            Atur Ulang Kata Sandi
          </a>
        </div>

        <!-- Warning Box -->
        <div class="warning-box">
          <strong>Penting:</strong> Tautan pemulihan kata sandi ini hanya berlaku untuk satu kali penggunaan dan memiliki batas waktu kedaluwarsa.
        </div>

        <p style="font-size: 13.5px; color: #94a3b8;">
          Jika tombol di atas tidak berfungsi, salin dan tempel tautan berikut ke peramban Anda:
          <br>
          <a href="${resetUrl}" class="fallback-url" target="_blank">${resetUrl}</a>
        </p>

        <!-- Security Warning -->
        <div class="security-notice">
          <strong>Peringatan Keamanan:</strong> Jika Anda <em>tidak pernah</em> meminta pemulihan kata sandi ini, abaikan email ini. Akun Anda tetap aman dan kata sandi Anda saat ini tidak akan berubah tanpa tindakan dari tautan di atas.
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

export default renderPasswordResetEmail;

