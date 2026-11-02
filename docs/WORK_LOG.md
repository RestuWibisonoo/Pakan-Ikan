# Development Work Log — Pakan Ikan

Dokumen ini merupakan catatan riwayat pengembangan terpusat (*central development history*) untuk repositori **Pakan Ikan**. Setiap pembaruan atau tugas pengembangan yang dieksekusi didokumentasikan di sini secara permanen dan terhubung dengan laporan detailnya masing-masing.

---

## Log Riwayat Tugas Pengembangan

### [Tugas 01] Sistem Custom Email Authentication
- **Tanggal:** 2026-11-02
- **Objektif:** Mengembangkan backend Express dan sistem otentikasi email kustom bernuansa aquatic Pakan Ikan menggunakan Firebase Admin SDK dan Nodemailer, menggantikan alur email generik pihak ketiga.
- **Status Implementasi:** Completed with limitations (Kredensial live menunggu input pengguna)
- **Berkas Utama:**
  - `server/server.js`, `server/config/firebaseAdmin.js`, `server/config/smtp.js`
  - `server/templates/verificationEmail.js`, `server/templates/passwordResetEmail.js`
  - `src/pages/AuthActionHandler.jsx`, `src/services/authApi.js`, `src/contexts/AuthContext.jsx`
- **Pengujian & Hasil:**
  - `npm test` di `server/`: 15/15 tes lulus.
  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run build`: Sukses (207ms).
- **Isu Diketahui (*Known Issues*):** Nameserver domain kustom `pakan-ikan.my.id` masih dalam proses propagasi Cloudflare.
- **Pekerjaan Tersisa (*Remaining Work*):** Input service account privat dan kredensial SMTP aplikasi Gmail pada environment produksi.
- **Laporan Detail:** [01-custom-email-auth.md](./reports/01-custom-email-auth.md)

---

### [Tugas 02] Integrasi Modul Backend IoT (API v1)
- **Tanggal:** 2026-11-02
- **Objektif:** Mengintegrasikan modul IoT (monitoring telemetri pH, kontrol manual pakan servo, kontrol pompa air, jadwal pakan, riwayat aksi) ke dalam backend Express yang sama dengan skema versioning `/api/v1/` dan otentikasi khusus hardware ESP32.
- **Status Implementasi:** Completed
- **Berkas Utama:**
  - `server/controllers/iotController.js`, `server/routes/iotRoutes.js`
  - `server/services/iotService.js`, `server/validators/iotValidator.js`
  - `server/middleware/deviceAuthMiddleware.js`
  - `src/services/iotApi.js`, `src/pages/Dashboard.jsx`, `src/pages/Schedules.jsx`, `src/pages/History.jsx`, `src/pages/Settings.jsx`
- **Pengujian & Hasil:**
  - `npm test` di `server/`: 43/43 tes lulus (mencakup validator, service, dan endpoints).
  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run build`: Sukses (222ms).
  - Regresi endpoint `/api/auth/*`: Tetap berjalan dan lulus pengujian.
- **Isu Diketahui (*Known Issues*):** Pengujian perangkat keras fisik dilakukan via simulasi request HTTP klien.
- **Pekerjaan Tersisa (*Remaining Work*):** Pengujian koneksi fisik langsung dengan board mikrokontroler ESP32.
- **Laporan Detail:** [02-iot-backend-integration.md](./reports/02-iot-backend-integration.md)

---

### [Tugas 03] Arsitektur Database Firebase Realtime Database IoT
- **Tanggal:** 2026-11-02
- **Objektif:** Menjadikan Firebase Realtime Database (Project ID: `pakan-ikan-4c18e`) sebagai basis data operasional utama sistem Pakan Ikan, memanfaatkan inisialisasi singleton Firebase Admin SDK tepercaya di backend, dengan lapisan repository dan in-memory fallback.
- **Status Implementasi:** Completed
- **Berkas Utama:**
  - `server/config/firebaseAdmin.js` (penambahan `databaseURL` dan `getAdminDatabase`)
  - `server/config/appConfig.js` (konfigurasi RTDB URL)
  - `server/repositories/deviceRepository.js` (CRUD RTDB node `/devices/{deviceId}/*` dan mock store fallback)
  - `server/.env.example` (dokumentasi `FIREBASE_DATABASE_URL`)
- **Pengujian & Hasil:**
  - `npm test` di `server/`: 43/43 tes lulus 100%.
  - Health check diagnostic (`GET /api/health`): Menampilkan status kesiapan database.
- **Isu Diketahui (*Known Issues*):** Kredensial privat service account `serviceAccountKey.json` belum diletakkan di server lokal (beroperasi menggunakan fallback aman yang tervalidasi).
- **Pekerjaan Tersisa (*Remaining Work*):** Pengunggahan `serviceAccountKey.json` ke server produksi saat domain dan hosting siap.
- **Laporan Detail:** [03-iot-database-architecture.md](./reports/03-iot-database-architecture.md)

---

### [Tugas 04] Audit Menyeluruh Integrasi, Keamanan, dan Keandalan
- **Tanggal:** 2026-11-02
- **Objektif:** Menjalankan audit sistem secara menyeluruh dari frontend, backend, Firebase Auth, Realtime Database, hingga integrasi hardware ESP32 sebelum implementasi fitur baru atau uji fisik.
- **Status Implementasi:** Completed
- **Temuan Utama:**
  - 10 temuan teridentifikasi: 2 Critical (IDOR kepemilikan perangkat & silent mock fallback di production), 3 High (tanpa rate limiting di rute IoT, log aksi sukses prematur, dan penimpaan pending command), 3 Medium (frontend mock masking pada empty state, tanpa deteksi timeout offline, dan pertumbuhan log tanpa batas), 2 Low (shared device secret & bundle size).
- **Berkas Utama:**
  - `docs/reports/04-integration-security-reliability-audit.md`
- **Pengujian & Hasil:**
  - `npm test` di `server/`: 43/43 tes lulus 100%.
  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run build`: Sukses (204ms).
- **Pekerjaan Tersisa (*Remaining Work*):** Melakukan eksekusi perbaikan bertahap sesuai prioritas P0 (CRITICAL) hingga P3 (LOW) yang telah dirumuskan.
- **Laporan Detail:** [04-integration-security-reliability-audit.md](./reports/04-integration-security-reliability-audit.md)

