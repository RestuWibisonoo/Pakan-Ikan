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

### [Tugas 04] Audit Menyeluruh, Remediasi Keamanan & Persiapan Single-VM Deployment
- **Tanggal:** 2026-11-02
- **Objektif:** Menjalankan audit sistem secara menyeluruh dari frontend, backend, Firebase Auth, Realtime Database, hingga integrasi hardware ESP32; melakukan perbaikan celah keamanan/keandalan; menyelaraskan single-origin API routing; menyediakan simulator virtual ESP32; dan mempersiapkan konfigurasi deployment Single-VM di balik Nginx (`pakan-ikan.my.id`).
- **Status Implementasi:** Completed
- **Remediasi & Fitur Utama:**
  - **Pencegahan BOLA/IDOR (CRIT-01):** Validasi kepemilikan perangkat di `server/controllers/iotController.js` dan `deviceRepository.js` dengan HTTP 403 `DEVICE_ACCESS_DENIED`.
  - **Production Mock Guard (CRIT-02):** Menolak silent fallback di mode `production` dengan HTTP 503 `DATABASE_UNAVAILABLE` saat live RTDB offline.
  - **IoT Rate Limiting (HIGH-01):** Perlindungan aktuator servo/pompa (10 req/min) dan telemetri ESP32 (120 req/min) di `server/middleware/rateLimiter.js`.
  - **Two-Phase Action Log (HIGH-02):** Status log diawali `'pending'` dan baru diperbarui ke `'success'`/`'failed'` setelah konfirmasi eksekusi ESP32.
  - **FIFO Command Queue (HIGH-03):** Antrean perintah FIFO di node `commands/queue/{cmdId}` mencegah penimpaan perintah.
  - **Single-Origin Routing:** Standarisasi API base URL relatif pada frontend `src/services/authApi.js` dan `iotApi.js` untuk reverse proxy Nginx.
  - **Loopback Binding:** Backend diikat ke `127.0.0.1:5000` via `HOST=127.0.0.1`.
  - **Nginx Reverse Proxy:** Dibuat `deploy/nginx/pakan-ikan.conf` untuk Cloudflare Tunnel port 80 dan SPA fallback.
  - **Systemd Service:** Dibuat `deploy/systemd/pakan-ikan-api.service` dengan auto-restart dan sandbox hardening.
  - **ESP32 Simulator:** Dibuat `tools/device-simulator/simulator.js` dengan multi-mode uji (`loop`, `once`, `unauthorized`, `invalid-payload`, `offline`).
- **Berkas Utama:**
  - `deploy/nginx/pakan-ikan.conf`
  - `deploy/systemd/pakan-ikan-api.service`
  - `tools/device-simulator/simulator.js` & `README.md`
  - `docs/deployment/single-vm-architecture.md`
  - `docs/reports/04-integration-security-reliability-audit.md`
  - `server/tests/simulatorIntegration.test.js`
- **Pengujian & Hasil:**
  - `npm test` di `server/`: 51/51 tes lulus 100% (durasi ~200ms).
  - ESP32 Simulator CLI: Mode `once`, `unauthorized`, dan `invalid-payload` terverifikasi lulus.
  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run build`: Sukses (210ms), aset `dist/` terbentuk.
- **Isu Diketahui (*Known Issues*):** Pengujian fisik dengan mikrokontroler ESP32 riil dan sensor pH analog dijadwalkan pada pengujian hardware di kolam.
- **Pekerjaan Tersisa (*Remaining Work*):** Pemasangan service account key di VM saat proses deployment server fisik/cloud.
- **Laporan Detail:** [04-integration-security-reliability-audit.md](./reports/04-integration-security-reliability-audit.md)

---

### [Tugas 05] Adaptasi Arsitektur & Runbook Deployment Berdasarkan Inventaris Server Aktual
- **Tanggal:** 2026-11-02
- **Objektif:** Menyesuaikan seluruh dokumentasi arsitektur dan runbook deployment dengan kondisi server riil Ubuntu Server 22.04 LTS (KVM), Node.js 22.22.3, Nginx 1.18.0, 2 GB RAM, pencadangan website eksisting di `/var/www/pakan-ikan`, pembaruan `/etc/nginx/sites-available/pakan-ikan`, serta penanganan Cloudflare Tunnel yang berjalan pada VM eksternal di LAN.
- **Status Implementasi:** Completed
- **Keputusan & Fitur Utama:**
  - **Inventaris Riil:** Disesuaikan dengan OS Ubuntu 22.04 LTS, Node 22.22.3 (tanpa instalasi ulang), 2 GB RAM + 2 GB Swap, dan disk root 15 GB (tersedia ~6.8 GB).
  - **Pencadangan Total Website Lama:** Prosedur backup `/var/www/pakan-ikan` ke direktori terpisah dengan timestamp sebelum migrasi berkas, dan larangan menghapus direktori backup sampai terverifikasi.
  - **Cloudflare Tunnel Eksternal:** Menegaskan aturan bahwa daemon `cloudflared` berjalan pada VM lain di LAN yang mem-forward ke `http://192.168.1.115:80`. Tidak ada instalasi `cloudflared` lokal.
  - **Firewall Policy:** UFW dipertahankan `inactive` untuk menjamin lalu lintas SSH dan akses dari IP Cloudflare connector VM tidak terputus.
  - **Nginx Reverse Proxy:** Disediakan berkas `deploy/nginx/pakan-ikan` sesuai nama situs riil di `/etc/nginx/sites-available/pakan-ikan` yang mengarahkan root ke `/var/www/pakan-ikan/dist` dan mem-proxy `/api/*` ke loopback `127.0.0.1:5000`.
  - **Systemd Service:** Layanan `pakan-ikan-api.service` dikonfigurasi untuk auto-restart dan sandbox keamanan.
  - **Prosedur Rollback:** Prosedur pemulihan cepat ke website lama tanpa downtime dalam <60 detik.
- **Berkas Utama:**
  - `docs/deployment/single-vm-architecture.md` (pembaruan menyeluruh)
  - `deploy/nginx/pakan-ikan` (berkas konfigurasi Nginx target server)
  - `deploy/nginx/pakan-ikan.conf` (pembaruan mirror)
  - `docs/reports/05-production-deployment-actual-inventory.md` (laporan formal)
- **Pengujian & Hasil:**
  - `npm test` di `server/`: 51/51 tes lulus 100%.
  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run build`: Sukses (210ms).
- **Isu Diketahui (*Known Issues*):** Kredensial Firebase service account dan app password SMTP akan dipasang saat eksekusi langsung di server `192.168.1.115`.
- **Pekerjaan Tersisa (*Remaining Work*):** Eksekusi perintah runbook langkah-demi-langkah pada terminal SSH server `192.168.1.115`.
- **Laporan Detail:** [05-production-deployment-actual-inventory.md](./reports/05-production-deployment-actual-inventory.md)


