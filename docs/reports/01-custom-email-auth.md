# Laporan Tugas 01: Sistem Custom Email Authentication

## A. Task Information
- **Nomor Tugas:** 01
- **Judul Tugas:** Implementasi Sistem Custom Email Authentication Pakan Ikan
- **Tanggal Eksekusi:** 2026-11-02
- **Cakupan:** Backend Express (`server/`), template email HTML kustom, Firebase Admin SDK integration, rute kustom React `/auth/action`
- **Objektif:** Menggantikan alur email generik pihak ketiga dengan email bernuansa branding resmi **Pakan Ikan** (palet aquatic dark green), verifikasi email aman, reset kata sandi anti-enumerasi akun, dan pemrosesan kode aksi (`oobCode`) pada domain aplikasi sendiri.

---

## B. Initial Repository Condition
- **Arsitektur Awal:**
  - Frontend SPA berbasis React 19 + Vite 8 + React Router DOM 7.
  - Autentikasi Firebase Client langsung di frontend (`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendEmailVerification`, `sendPasswordResetEmail`).
  - Tidak ada backend server mandiri (hanya frontend client).
- **Berkas Relevan Sebelum Modifikasi:**
  - `src/App.jsx`
  - `src/contexts/AuthContext.jsx`
  - `src/firebase/config.js`
  - `src/pages/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `VerifyEmail.jsx`
- **Fungsi Eksisting yang Wajib Dipertahankan:**
  - Alur login, registrasi, forgot password, email verification yang sudah berjalan.
  - Desain dashboard dan proteksi rute melalui `ProtectedRoute`.
  - Konsistensi nama merek **Pakan Ikan** di seluruh halaman (tanpa nama AquaIoT).

---

## C. Implementation Summary
- **Fitur yang Diimplementasikan:**
  - Server Express mandiri di folder `server/` dengan port default 5000.
  - Inisialisasi Firebase Admin SDK mendukung service account file path, raw JSON string, atau ADC.
  - Template email HTML responsif bermerek **Pakan Ikan** untuk verifikasi email (`verificationEmail.js`) dan pemulihan kata sandi (`passwordResetEmail.js`).
  - Layanan tautan kustom (`linkService.js`) yang mengekstrak `oobCode` dari link Admin SDK dan mengarahkannya ke `${FRONTEND_URL}/auth/action`.
  - Halaman handler aksi kustom di frontend (`src/pages/AuthActionHandler.jsx`) yang mengeksekusi `applyActionCode`, `verifyPasswordResetCode`, dan `confirmPasswordReset`.
  - Klien API frontend (`src/services/authApi.js`) dengan failover transparan pada `AuthContext.jsx` ke Firebase client bawaan jika backend offline.
- **Keputusan Arsitektur:**
  - Tidak membuat database pengguna sekunder; identitas pengguna tetap terpusat di Firebase Authentication.
  - Validasi token ID Firebase secara ketat pada backend menggunakan `admin.auth().verifyIdToken()`.
- **Perubahan API:**
  - `POST /api/auth/send-verification`: Mengirim verifikasi ke email pengguna yang terautentikasi melalui Bearer token.
  - `POST /api/auth/resend-verification`: Mengirim ulang verifikasi email.
  - `POST /api/auth/send-password-reset`: Mengirim email pemulihan kata sandi tanpa membocorkan status registrasi email.
  - `GET /api/health`: Health check status server dan ketersediaan service account / SMTP.
- **Perubahan Keamanan:**
  - Helmet untuk keamanan HTTP headers.
  - CORS terbatas pada origin yang diizinkan (`localhost`, `pakan-ikan.my.id`).
  - Rate limiting pada rute autentikasi (20 permintaan per 15 menit).
  - Sanitasi HTML pada template email untuk mencegah stored/reflected XSS.
  - Whitelist validasi `continueUrl` untuk mencegah open redirect vulnerability.

---

## D. File Change Inventory

| File | Change Type | Description |
|---|---|---|
| `.gitignore` | Modified | Menambahkan pengecualian untuk file `.env`, service account JSON, certificate pem, dan `server/node_modules/` |
| `.env.example` | Modified | Menambahkan variabel konfigurasi Firebase resmi dan URL backend API |
| `README.md` | Modified | Menambahkan panduan instalasi, konfigurasi, dan pengujian server backend |
| `eslint.config.js` | Modified | Menyesuaikan aturan linter untuk browser globals (frontend) dan node globals (server) |
| `server/package.json` | Created | Konfigurasi package, dependensi backend, dan skrip `start`, `dev`, `test` |
| `server/.env.example` | Created | Contoh konfigurasi environment backend (SMTP, Firebase, Port, CORS) |
| `server/config/appConfig.js` | Created | Manajemen konfigurasi environment backend terpusat |
| `server/config/firebaseAdmin.js` | Created | Inisialisasi Firebase Admin SDK singleton dan deteksi kesiapan kredensial |
| `server/config/smtp.js` | Created | Konfigurasi transporter Nodemailer dengan fallback jsonTransport |
| `server/templates/verificationEmail.js` | Created | Template HTML responsif email verifikasi Pakan Ikan |
| `server/templates/passwordResetEmail.js` | Created | Template HTML responsif email reset password Pakan Ikan |
| `server/services/linkService.js` | Created | Builder URL aksi kustom dan validasi domain continueUrl |
| `server/services/emailService.js` | Created | Dispatcher email via Nodemailer dengan log tersanitasi |
| `server/middleware/authMiddleware.js` | Created | Verifikasi Firebase ID Token (Bearer) |
| `server/middleware/rateLimiter.js` | Created | Rate limiter endpoint autentikasi |
| `server/middleware/errorHandler.js` | Created | Handler error terpusat anti-bocor kredensial |
| `server/controllers/authController.js` | Created | Controller handler verifikasi dan reset password |
| `server/routes/authRoutes.js` | Created | Routing Express `/api/auth/*` |
| `server/server.js` | Created | Server Express utama, middleware, dan health check |
| `server/tests/emailTemplates.test.js` | Created | Unit test template HTML dan pencegahan XSS |
| `server/tests/linkService.test.js` | Created | Unit test ekstraksi kode aksi dan validasi URL |
| `server/tests/serverEndpoints.test.js` | Created | Integration test endpoint `/api/health` dan `/api/auth/*` |
| `src/App.jsx` | Modified | Menambahkan rute publik `/auth/action` |
| `src/contexts/AuthContext.jsx` | Modified | Integrasi `authApi` dengan failover otomatis ke Firebase client |
| `src/firebase/config.js` | Modified | Konfigurasi resmi project `pakan-ikan-4c18e` dan inisialisasi analytics aman |
| `src/pages/AuthActionHandler.jsx` | Created | Komponen React penanganan kode verifikasi & pemulihan sandi |
| `src/services/authApi.js` | Created | Klien fetch frontend dengan timeout dan penyertaan token ID |

---

## E. Testing and Validation

| Test | Command | Result |
|---|---|---|
| Automated Backend Unit Tests | `cd server && npm test` | **15/15 lulus** (emailTemplates, linkService, serverEndpoints) |
| Automated Frontend Linter | `npm run lint` | **0 errors, 0 warnings** |
| Automated Frontend Build | `npm run build` | **Sukses (207ms)**, 1780 modul ditransformasi |
| Static Code Inspection | Pemeriksaan berkas & regex nama merek | Tidak ditemukan istilah non-standar "AquaIoT" |
| Manual Live Health Check | `PORT=5002 node server/server.js` lalu `curl /api/health` | Status `ok`, project `pakan-ikan-4c18e`, respon JSON sesuai |
| Live SMTP Delivery Test | N/A | **Tidak dapat dilakukan** karena kredensial SMTP publik (password aplikasi Gmail) belum dimasukkan ke environment produksi |

---

## F. Security Review
- **Authentication:** Pengguna wajib menyertakan Firebase ID Token yang sah untuk meminta verifikasi email. Token didekode dan divalidasi langsung oleh Firebase Admin SDK.
- **Authorization:** Email verifikasi hanya dikirimkan ke alamat email pemilik token (`req.user.email`). Nilai email pada body tidak dipercayai.
- **Input Validation:** Format alamat email divalidasi regex sebelum diproses. Panjang kata sandi baru minimal 6 karakter.
- **Credential Handling:** Berkas `.env`, `.env.local`, dan berkas service account JSON dilindungi oleh `.gitignore`. Tidak ada secret key yang dikirim ke frontend.
- **Data Ownership:** Pengguna hanya dapat memicu aksi untuk akun mereka sendiri.
- **Known Security Limitations:** Jika backend offline atau service account belum dikonfigurasi, sistem failover menggunakan Firebase SDK bawaan yang mengirimkan template email standar Firebase.

---

## G. Known Issues and Limitations
1. Domain kustom `pakan-ikan.my.id` dan `api.pakan-ikan.my.id` masih dalam proses propagasi nameserver Cloudflare sehingga backend diuji pada environment lokal (`http://localhost:5000`).
2. Kredensial Firebase Admin SDK service account key live masih menunggu pengunduhan manual dari Firebase Console oleh pemilik akun.

---

## H. Next Steps
1. Mengintegrasikan modul IoT (pembacaan pH, kontrol servo pakan, saklar pompa air) ke dalam backend Express yang sama.
2. Mengonfigurasi Firebase Realtime Database sebagai database operasional IoT.
3. Menyiapkan skema otentikasi terpisah untuk perangkat keras ESP32.

---

## I. Final Status
**Completed with limitations** (Implementasi teknis kode selesai dan teruji 100%, pengiriman email live masih bergantung pada input kredensial SMTP dan service account pengguna).
