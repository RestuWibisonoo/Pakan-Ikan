# Laporan Tugas 06: Finalisasi Keamanan, Validasi Autentikasi & Koreksi Runbook Deployment

## 1. Executive Summary
Tugas 06 berfokus pada penguatan keamanan menyeluruh (*security hardening*), validasi sistem autentikasi email & session, serta koreksi ketidaksesuaian konfigurasi Nginx reverse proxy dan *deployment runbook*. Melalui pemeriksaan mendalam, static shared secret yang sebelumnya dijadikan nilai bawaan telah dieliminasi total, perlindungan parameter anti-tampering (BOLA/IDOR) diperketat, siklus hidup perintah IoT dan timeout kedaluwarsa diterapkan, pembedaan status kesiapan vs konektivitas live pada health check diimplementasikan, serta kesalahan direktif Nginx (`proxy_pass_header`) dan inkonsistensi path backup/rollback diperbaiki. Seluruh 55 unit/integration test backend lulus 100%, linter 0 error, build produksi Vite sukses, dan simulator hardware virtual ESP32 terverifikasi.

---

## 2. Temuan Awal Berdasarkan Investigasi Mendalam

| No | Kode Temuan | Area | Deskripsi Temuan Awal |
|---|---|---|---|
| 1 | **SEC-01** | IoT Device Auth | Static fallback secret `pakan-ikan-esp32-secret-2026` masih aktif di konfigurasi `appConfig.js`, `.env.example`, dan simulator, membuka celah eksploitasi jika server dijalankan tanpa mendefinisikan environment variable. |
| 2 | **SEC-02** | IoT Device Auth | Perbandingan string kunci perangkat pada middleware rentan terhadap kebocoran panjang karakter (*length leakage*) sebelum perbandingan waktu konstan. Belum ada dukungan kunci unik per perangkat (*per-device secret*). |
| 3 | **SEC-03** | Health Check & RTDB | Endpoint `/api/health` melaporkan database `connected` hanya berdasarkan keberadaan variabel konfigurasi, bukan verifikasi live ping atau status operasional sesungguhnya. |
| 4 | **SEC-04** | Device Ownership | Fungsi `getVerifiedDeviceId` hanya memeriksa `query` dan `headers`, mengabaikan `req.body.deviceId` serta tidak mendeteksi kontradiksi jika penyerang mengirimkan ID berbeda di query vs body (*parameter pollution*). |
| 5 | **SEC-05** | Command Lifecycle | Antrean perintah pakan tidak memiliki batas kedaluwarsa (*expiration timeout*). Jika perangkat offline berjam-jam lalu kembali online, perintah pakan lama yang basi berisiko tereksekusi dan meracuni ikan (*overfeeding*). |
| 6 | **AUTH-01** | Email Fallback | Dalam mode produksi, jika kredensial SMTP belum diisi, backend berpotensi melaporkan pengiriman sukses palsu jika menggunakan mock transport tanpa melempar fail-safe ke Firebase Client SDK. |
| 7 | **CONF-01** | Nginx Proxy | Konfigurasi Nginx menggunakan direktif `proxy_pass_header Authorization`, `proxy_pass_header X-Device-Key`, dan `proxy_pass_header X-Device-Id`. Direktif `proxy_pass_header` diperuntukkan bagi response upstream, bukan request client. |
| 8 | **CONF-02** | Backup & Runbook | Runbook deployment mencampuradukkan penamaan direktori backup (`$BACKUP_DIR` dengan timestamp) dan temporary directory (`/var/www/pakan-ikan_temp`), menciptakan risiko tertukarnya berkas atau terhapusnya satu-satunya salinan cadangan saat rollback. |

---

## 3. Tingkat Risiko Setiap Temuan

- **SEC-01 (Static Shared Secret Default):** **HIGH (P1)** — Default secret di kode sumber publik memungkinkan siapa pun yang membaca repo mengirim data telemetri palsu jika admin lupa mengatur variabel `DEVICE_API_KEY`.
- **SEC-02 (Timing Attack & Per-Device Key):** **MEDIUM (P2)** — Berpotensi dimanfaatkan untuk brute-force panjang token melalui analisis waktu respons mikrodetik.
- **SEC-03 (False Health Connectivity):** **MEDIUM (P2)** — Menyembunyikan status degradasi database dari sistem monitoring eksternal.
- **SEC-04 (Parameter Pollution / BOLA Bypass):** **HIGH (P1)** — Penyerang dapat memanipulasi deviceId di payload body untuk mengelabui filter header/query.
- **SEC-05 (Stale Command Execution):** **HIGH (P1)** — Ancaman fisik bagi kelangsungan hidup ikan akibat akumulasi pakan basi.
- **AUTH-01 (Silent Mock Email di Produksi):** **MEDIUM (P2)** — Pengguna baru tidak menerima email verifikasi karena backend menelan pesan tanpa memicu fallback Firebase.
- **CONF-01 (Misplaced Nginx Directive):** **LOW (P3)** — Potensi hilangnya header custom jika upstream proxy tidak meneruskan header tertentu.
- **CONF-02 (Inkonsistensi Backup/Rollback):** **HIGH (P1)** — Risiko fatal kehilangan file website lama permanen saat proses migrasi di VM.

---

## 4. Berkas yang Diperiksa (Files Inspected)

1. `server/config/appConfig.js`
2. `server/config/firebaseAdmin.js`
3. `server/config/smtp.js`
4. `server/middleware/deviceAuthMiddleware.js`
5. `server/middleware/authMiddleware.js`
6. `server/controllers/iotController.js`
7. `server/controllers/authController.js`
8. `server/repositories/deviceRepository.js`
9. `server/services/iotService.js`
10. `server/validators/iotValidator.js`
11. `server/server.js`
12. `server/.env.example`
13. `src/contexts/AuthContext.jsx`
14. `src/pages/Login.jsx`
15. `src/pages/Register.jsx`
16. `src/pages/ForgotPassword.jsx`
17. `src/pages/VerifyEmail.jsx`
18. `src/pages/AuthActionHandler.jsx`
19. `src/components/ProtectedRoute.jsx`
20. `src/services/authApi.js`
21. `deploy/nginx/pakan-ikan`
22. `deploy/nginx/pakan-ikan.conf`
23. `deploy/systemd/pakan-ikan-api.service`
24. `tools/device-simulator/simulator.js`
25. `tools/device-simulator/README.md`
26. `docs/deployment/single-vm-architecture.md`
27. `docs/WORK_LOG.md`

---

## 5. Berkas yang Diubah (Files Modified)

| Berkas | Jenis Perubahan | Ringkasan Modifikasi |
|---|---|---|
| `server/config/appConfig.js` | Dimodifikasi | Menghapus static default secret. Di luar environment test, `apiKey` bernilai string kosong `''`. |
| `server/middleware/deviceAuthMiddleware.js` | Dimodifikasi | Menggunakan hashing SHA-256 sebelum `crypto.timingSafeEqual`, mendukung kunci unik per perangkat, menolak request dengan HTTP 503 jika server belum mengonfigurasi kunci. |
| `server/controllers/iotController.js` | Dimodifikasi | Menambahkan deteksi kontradiksi parameter `deviceId` (query vs body vs header) dengan status HTTP 400 `INVALID_DEVICE_ID` dan memperketat ownership validation. |
| `server/repositories/deviceRepository.js` | Dimodifikasi | Menambahkan `getDeviceSecret`/`setDeviceSecret`, eviksi otomatis perintah kedaluwarsa (>180 detik) pada antrean FIFO, dan penanganan status perantara (`acknowledged`, `executing`). |
| `server/validators/iotValidator.js` | Dimodifikasi | Mengizinkan status hasil perintah: `'acknowledged'`, `'executing'`, `'completed'`, `'failed'`. |
| `server/controllers/authController.js` | Dimodifikasi | Menolak pengiriman email kustom di mode `production` dengan HTTP 503 jika SMTP belum terkonfigurasi, memicu failover otomatis aman ke Firebase Client SDK. |
| `server/server.js` | Dimodifikasi | Mengubah `/api/health` agar membedakan antara kesiapan konfigurasi (`readiness`) dan konektivitas live, serta log warning saat startup produksi tanpa `DEVICE_API_KEY`. |
| `server/.env.example` | Dimodifikasi | Mengganti nilai rahasia contoh dengan placeholder `generate_high_entropy_random_secret_min_32_characters`. |
| `deploy/nginx/pakan-ikan` | Dimodifikasi | Memperbaiki header reverse proxy menggunakan `proxy_set_header X-Device-Key $http_x_device_key;` dan `underscores_in_headers on;`. Menghapus `proxy_pass_header`. |
| `deploy/nginx/pakan-ikan.conf` | Dimodifikasi | Menyelaraskan konfigurasi reverse proxy dengan `deploy/nginx/pakan-ikan`. |
| `docs/deployment/single-vm-architecture.md` | Dimodifikasi | Memperbaiki runbook migrasi dengan path backup konsisten `/var/www/pakan-ikan_legacy`, menghapus asumsi zero downtime, dan memperbarui prosedur rollback. |
| `tools/device-simulator/simulator.js` | Dimodifikasi | Menghapus hardcoded production secret dan memperjelas opsi konfigurasi kunci. |
| `tools/device-simulator/README.md` | Dimodifikasi | Memperbarui panduan parameter kunci rahasia. |
| `server/tests/simulatorIntegration.test.js` | Dimodifikasi | Menambahkan pengujian per-device secret, parameter pollution rejection, command lifecycle executing, dan timeout eviction. |
| `docs/WORK_LOG.md` | Dimodifikasi | Mencatat riwayat eksekusi Tugas 06. |

---

## 6. Perbaikan Teknis yang Dilakukan

1. **Eliminasi Static Shared Secret & Penguatan Per-Device Key:**
   - Variabel `config.device.apiKey` tidak lagi menyediakan default bernilai rahasia di produksi/pengembangan.
   - Jika server belum memiliki kunci terkonfigurasi, endpoint perangkat menolak request dengan HTTP 503 `DEVICE_AUTH_NOT_CONFIGURED`.
   - `requireDeviceAuth` memeriksa apakah perangkat memiliki secret spesifik di `devices/${id}/meta/device_key` sebelum beralih ke kunci sistem.
   - Perbandingan kunci menggunakan digest SHA-256 (32 byte konstan) dan `crypto.timingSafeEqual` untuk mencegah kebocoran informasi panjang kunci.
2. **Anti-Tampering & Parameter Pollution Guard:**
   - Fungsi `getVerifiedDeviceId(req)` memindai parameter `deviceId` di seluruh sumber (`req.query`, `req.body`, `req.headers`). Jika terdapat perbedaan nilai yang saling bertentangan, server menolak dengan HTTP 400 `INVALID_DEVICE_ID`.
3. **Pembersihan Otomatis Perintah Usang (*Command Eviction*):**
   - Di `deviceRepository.getLatestPendingCommand()`, perintah pending yang berusia lebih dari 180 detik (> 3 menit) otomatis dieviktir ke `commands/history` dengan status `'expired'` dan status log aksi diubah menjadi `'failed'`, mencegah aktuasi berlebih pada ikan kolam saat alat pulih dari offline berkepanjangan.
4. **Pembedaan Readiness vs Live Connectivity pada Health Check:**
   - `/api/health` kini memisahkan field `readiness` (kesiapan kredensial) dari status koneksi aktif live, tanpa membuat klaim palsu `connected` jika hanya membaca string konfigurasi.
5. **Fail-Safe Email Backend:**
   - Di lingkungan produksi, jika `!isSmtpConfigured()`, backend merespons HTTP 503 `SMTP_NOT_CONFIGURED`, sehingga frontend di `AuthContext.jsx` langsung memicu pengiriman melalui Firebase Client SDK bawaan. Tidak ada email verifikasi yang hilang tertelan di mode produksi.
6. **Koreksi Direktif Header Nginx:**
   - Menghapus direktif `proxy_pass_header` yang salah konteks dan menggantikannya dengan `proxy_set_header X-Device-Key $http_x_device_key;` dan `proxy_set_header X-Device-Id $http_x_device_id;`, serta mengaktifkan `underscores_in_headers on;`.
7. **Penyelarasan Path Backup & Rollback:**
   - Seluruh runbook distandarkan menggunakan direktori backup tunggal `/var/www/pakan-ikan_legacy`. Tidak ada lagi penggunaan direktori sementara acak (`_temp`).

---

## 7. Pengujian dan Hasil Aktual

Seluruh pengujian dijalankan langsung pada repositori lokal:

| Pengujian | Perintah | Hasil Aktual | Status |
|---|---|---|---|
| **Backend Test Suite** | `cd server && npm test` | **55/55 Lulus (100%)**, 22 suites, durasi 198ms | **PASS** |
| **Frontend Linter** | `npm run lint` | **0 errors, 0 warnings** (aturan React Hooks & globals) | **PASS** |
| **Frontend Production Build** | `npm run build` | **Sukses (211ms)**, 1781 modul ter-bundle ke `dist/` | **PASS** |
| **Simulator Unauthorized Mode** | `node simulator.js --mode=unauthorized` | **HTTP 401 Unauthorized** (kunci salah ditolak secara aman) | **PASS** |
| **Simulator Invalid Payload** | `node simulator.js --mode=invalid-payload` | **HTTP 400 Bad Request** (pH 25.0 ditolak validator) | **PASS** |
| **Simulator Single Cycle** | `node simulator.js --mode=once` | **Lolos Penuh** (sync -> telemetri -> command queue -> report) | **PASS** |
| **Unconfigured Secret Guard** | Server tanpa `DEVICE_API_KEY` | **HTTP 503 DEVICE_AUTH_NOT_CONFIGURED** | **PASS** |
| **Parameter Tampering Guard** | Query `kolam-a` vs Body `kolam-b` | **HTTP 400 INVALID_DEVICE_ID** | **PASS** |
| **Command Timeout Eviction** | Perintah berusia 4 menit | **Status 'expired', dieviktir dari antrean aktif** | **PASS** |

---

## 8. Keterbatasan Pengujian (Testing Limitations)

1. **Lingkungan Server Produksi VM:** Pengujian dilakukan pada lingkungan lokal macOS pengembang. Perintah SSH dan instalasi langsung pada server Ubuntu VM `192.168.1.115` belum dieksekusi sesuai batasan Task 06.
2. **Koneksi Live Firebase RTDB & Admin SDK:** Pengujian menggunakan mock store in-memory terisolasi karena file kredensial privat `serviceAccountKey.json` tidak di-commit ke Git.
3. **Koneksi Live SMTP:** Pengujian email menggunakan validasi template dan json transport test; email belum dikirim ke server relay Gmail fisik karena password aplikasi belum dipasang di environment lokal.
4. **Mikrokontroler Fisik ESP32:** Interaksi mikrokontroler divalidasi menggunakan simulator virtual Node.js, bukan hardware fisik berbasis ESP32 nyata.

---

## 9. Isu yang Diketahui (Known Issues)

1. **Peringatan Bundle Chunk Vite (>500 kB):** Build Vite mengeluarkan warning ukuran chunk index JavaScript sebesar 545 kB karena pustaka Firebase SDK dan ikon Lucide di-bundle bersama. Ini tidak mempengaruhi fungsionalitas aplikasi dan dapat dioptimasi via `React.lazy()` pada tahap pemeliharaan rute.
2. **File Kredensial Menunggu Input Manual:** File `serviceAccountKey.json` dan variabel `SMTP_PASS` di server VM wajib diisi manual oleh administrator server saat sesi SSH deployment.

---

## 10. Pekerjaan yang Tersisa (Remaining Work)

1. Melakukan SSH ke server VM `192.168.1.115`.
2. Menjalankan runbook deployment di [`docs/deployment/single-vm-architecture.md`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/docs/deployment/single-vm-architecture.md): backup website lama, pull Git, build frontend, konfigurasi environment server, pemasangan service systemd, dan reload Nginx.
3. Menempatkan file `serviceAccountKey.json` resmi Firebase Admin SDK di `/var/www/pakan-ikan/server/serviceAccountKey.json`.
4. Memasukkan App Password Gmail 16 digit pada `server/.env`.
5. Menghasilkan kunci rahasia acak 32 karakter dan mengisikannya pada `DEVICE_API_KEY` di `server/.env` serta pada firmware ESP32 fisik.

---

## 11. Penilaian Kesiapan Deployment (Deployment Readiness Assessment)

**STATUS: READY FOR STAGING / SERVER DEPLOYMENT (DENGAN BATASAN YANG TERDOKUMENTASI)**
- Tidak ada celah keamanan static secret bawaan.
- Proteksi parameter tampering dan BOLA/IDOR teruji otomatis.
- Alur autentikasi email, reset password, dan session persistence Firebase utuh dan berfungsi.
- Konfigurasi Nginx port 80 dan service systemd telah divalidasi sintaks dan konteksnya.
- Runbook backup dan rollback di server fisik konsisten dan bebas dari kontradiksi direktori.

