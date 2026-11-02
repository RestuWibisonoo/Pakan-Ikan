# Laporan Tugas 04: Audit Menyeluruh, Remediasi Keamanan & Persiapan Single-VM Deployment

## A. Informasi Tugas
- **Nomor Tugas:** 04
- **Judul Tugas:** Audit Menyeluruh Integrasi, Keamanan, Keandalan, dan Persiapan Deployment Single-VM
- **Tanggal Eksekusi:** 2026-11-02
- **Cakupan:** Seluruh repositori (React 19 Frontend, Express Backend, Firebase Authentication, Firebase Realtime Database, integrasi ESP32, konfigurasi Nginx reverse proxy, dan unit systemd).
- **Objektif:**
  1. Menyelidiki seluruh kode repositori, mengidentifikasi celah keamanan, inkonsistensi data, dan kelemahan arsitektur.
  2. Mengimplementasikan remediasi tuntas terhadap seluruh temuan kritis dan prioritas tinggi.
  3. Menstandarkan routing API single-origin untuk deployment Single-VM di balik Nginx (`pakan-ikan.my.id`).
  4. Menyediakan konfigurasi Nginx reverse proxy (`deploy/nginx/pakan-ikan.conf`) dan service systemd (`deploy/systemd/pakan-ikan-api.service`).
  5. Membangun simulator perangkat keras virtual ESP32 (`tools/device-simulator/`) untuk pengujian otomatis end-to-end tanpa memerlukan mikrokontroler fisik.

---

## B. Kondisi Awal Repositori Sebelum Remediasi
- **Frontend:** React 19 + Vite 8 menggunakan `VITE_AUTH_API_URL` dan `VITE_IOT_API_URL` terpisah yang mengarah ke port absolut (`http://localhost:5000`), menyebabkan potensi isu CORS dan kompleksitas port di lingkungan produksi.
- **Backend:** Node.js Express mendengarkan semua antarmuka jaringan tanpa pembatasan loopback, rute IoT tanpa rate limiter, dan tanpa verifikasi kepemilikan perangkat.
- **Database:** Menggunakan mock in-memory fallback secara diam-diam (*silent fallback*) bahkan jika dijalankan di mode production tanpa credentials. Perintah pakan dan pompa tersimpan di satu node objek (`commands/pending`) yang rawan tertimpa (*race condition*).
- **Status Hardware:** Tidak ada ESP32 fisik yang terhubung; status header di frontend di-hardcode "Online" dan data tiruan menutupi state kosong saat database belum terisi.

---

## C. Matriks Keterlacakan & Remediasi Masalah

| ID Temuan | Kategori | Masalah yang Teridentifikasi | Status Remediasi | Implementasi & File yang Diubah |
|---|---|---|---|---|
| **CRIT-01** | Keamanan (P0) | Kerentanan IDOR / BOLA pada seluruh rute pengguna IoT | **TERATASI** | Ditambahkan fungsi `getVerifiedDeviceId(req)` di `server/controllers/iotController.js` serta `getDeviceOwner`/`setDeviceOwner` di `server/repositories/deviceRepository.js`. Mengisolasi perangkat antar user dan menolak akses tak berizin dengan HTTP 403 `DEVICE_ACCESS_DENIED`. |
| **CRIT-02** | Reliabilitas (P0) | Silent In-Memory Mock Fallback di environment produksi | **TERATASI** | Ditambahkan guard `assertDatabaseAvailable()` di `server/repositories/deviceRepository.js`. Melempar HTTP 503 `DATABASE_UNAVAILABLE` di mode `production` jika live RTDB tidak dapat diakses. |
| **HIGH-01** | Keamanan (P1) | Ketiadaan Rate Limiting pada endpoint kontrol fisik & telemetri | **TERATASI** | Dibuat `actuatorRateLimiter` (10 req/min) dan `telemetryRateLimiter` (120 req/min) di `server/middleware/rateLimiter.js` dan dipasang pada rute `/commands/feed`, `/commands/pump`, serta `/device/telemetry`. |
| **HIGH-02** | Integritas (P1) | Log aksi langsung dicatat "berhasil" sebelum dieksekusi fisik | **TERATASI** | Status log pakan & pompa diawali dengan `'pending'`. Diperbarui ke `'success'` atau `'failed'` hanya saat ESP32 melaporkan hasil melalui `POST /api/v1/device/commands/:id/result`. |
| **HIGH-03** | Integritas (P1) | Race condition penimpaan perintah pending objek tunggal | **TERATASI** | Diubah menjadi antrean FIFO `commands/queue/{cmdId}` di RTDB. Perintah terlama diambil lebih dahulu dan tidak saling menimpa. |
| **MED-01** | Frontend (P2) | Empty state masking: Data mock tiruan menutupi database kosong | **TERATASI** | Diperbaiki di `src/pages/Dashboard.jsx`, `Schedules.jsx`, dan `History.jsx`. Menggunakan inisialisasi array kosong `[]`, loading spinner, dan pesan ramah saat riwayat kosong. Error handling `handleFeed` diperbaiki agar tidak menampilkan alert sukses palsu. |
| **MED-02** | Reliabilitas (P2) | Indikator Online di-hardcode tanpa heartbeat timeout | **TERATASI** | Di backend `server/services/iotService.js`, status online dihitung dinamis: offline jika `Date.now() - last_seen > 45000ms`. Di frontend `src/App.jsx`, status header memeriksa API berkala dan menampilkan status dinamis. |
| **LOW-01** | Keamanan (P3) | Validasi API key perangkat rentan timing attack | **TERATASI** | Menggunakan `crypto.timingSafeEqual` di `server/middleware/deviceAuthMiddleware.js`. |
| **ARCH-01** | Arsitektur | Penyebaran konfigurasi URL port backend terpisah | **TERATASI** | Frontend `src/services/authApi.js` dan `src/services/iotApi.js` kini menggunakan `getApiBaseUrl()` relatif `''` di mode produksi (Single-Origin melalui Nginx). Backend diikat ketat ke loopback `127.0.0.1:5000`. |

---

## D. ESP32 Hardware Simulator Virtual

Untuk memverifikasi integrasi perangkat keras secara nyata tanpa ESP32 fisik, telah dibangun tool simulator mandiri:

- **Lokasi Berkas:** [`tools/device-simulator/simulator.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/tools/device-simulator/simulator.js)
- **Panduan Penggunaan:** [`tools/device-simulator/README.md`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/tools/device-simulator/README.md)
- **Kemampuan:**
  1. Booting dan sinkronisasi konfigurasi awal (`GET /api/v1/device/sync`).
  2. Pengiriman telemetri periodik dengan sensor drift alami (pH 6.8 - 7.6, suhu 28°C, sisa pakan, uptime).
  3. Polling antrean perintah pending (`GET /api/v1/device/commands/pending`).
  4. Simulasi waktu aktuasi fisik servo pakan dan relay pompa.
  5. Pelaporan hasil eksekusi (`POST /api/v1/device/commands/:id/result`).
  6. Mode uji terisolasi: `--mode=unauthorized` (uji tolak 401), `--mode=invalid-payload` (uji tolak 400), `--mode=once` (uji 1 siklus untuk CI), `--mode=offline` (uji deteksi timeout).

---

## E. Arsitektur Deployment Single-VM (Nginx + Systemd)

- **Dokumentasi Komprehensif:** [`docs/deployment/single-vm-architecture.md`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/docs/deployment/single-vm-architecture.md)
- **Konfigurasi Reverse Proxy Nginx:** [`deploy/nginx/pakan-ikan.conf`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/deploy/nginx/pakan-ikan.conf)
  - Mendengarkan port 80 (Cloudflare Tunnel target: `http://192.168.1.115:80`).
  - Menyajikan aset statis SPA Vite dari `/var/www/pakan-ikan/dist` dengan SPA fallback `try_files $uri $uri/ /index.html;`.
  - Meneruskan rute API `/api/*` secara internal ke `http://127.0.0.1:5000` dengan header `X-Real-IP`, `X-Forwarded-For`, `Authorization`, dan header perangkat.
  - Kompresi gzip dan caching aset statis berumur 1 tahun.
- **Konfigurasi Systemd Unit:** [`deploy/systemd/pakan-ikan-api.service`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/deploy/systemd/pakan-ikan-api.service)
  - Mengelola proses Node.js Express backend sebagai daemon otomatis (`Restart=always`, `RestartSec=5`).
  - Hardening sandbox keamanan: `NoNewPrivileges=true`, `ProtectSystem=full`, `ProtectHome=true`, `PrivateTmp=true`.

---

## F. Inventaris Perubahan Berkas (File Change Inventory)

| Berkas | Jenis Perubahan | Deskripsi Perubahan |
|---|---|---|
| `deploy/nginx/pakan-ikan.conf` | Dibuat | Konfigurasi reverse proxy Nginx port 80 untuk single-origin routing dan SPA fallback. |
| `deploy/systemd/pakan-ikan-api.service` | Dibuat | Service unit systemd untuk manajemen daemon backend Express dengan auto-restart dan sandbox hardening. |
| `tools/device-simulator/simulator.js` | Dibuat | Script simulator perangkat keras virtual ESP32 berbasis Node.js dengan multiple mode uji. |
| `tools/device-simulator/README.md` | Dibuat | Panduan penggunaan lengkap simulator virtual ESP32. |
| `docs/deployment/single-vm-architecture.md` | Dibuat | Panduan komprehensif arsitektur, instalasi, pengujian, pemantauan, dan rollback Single-VM. |
| `server/tests/simulatorIntegration.test.js` | Dibuat | Suite pengujian otomatis untuk simulator lifecycle, device ownership guard, mock guard, dan timing safe auth. |
| `server/config/appConfig.js` | Dimodifikasi | Menambahkan konfigurasi `host: process.env.HOST || '127.0.0.1'` untuk loopback binding. |
| `server/server.js` | Dimodifikasi | Memperbarui listener server agar terikat ke `config.host` dan `config.port`. |
| `server/.env.example` | Dimodifikasi | Menambahkan `HOST=127.0.0.1` dan dokumentasi deployment single-VM. |
| `server/controllers/iotController.js` | Dimodifikasi | Menerapkan `getVerifiedDeviceId(req)` untuk BOLA/IDOR protection dan export fungsi verifikasi. |
| `server/repositories/deviceRepository.js` | Dimodifikasi | Menerapkan `getDeviceOwner`/`setDeviceOwner`, antrean FIFO `commands/queue`, dua fase action logs, dan `assertDatabaseAvailable()`. |
| `server/routes/iotRoutes.js` | Dimodifikasi | Memasang middleware `actuatorRateLimiter` dan `telemetryRateLimiter`. |
| `server/middleware/rateLimiter.js` | Dimodifikasi | Menambahkan instance rate limiter khusus aktuator kolam dan telemetri ESP32. |
| `server/middleware/deviceAuthMiddleware.js` | Dimodifikasi | Menggunakan `crypto.timingSafeEqual` untuk membandingkan device API key. |
| `server/services/iotService.js` | Dimodifikasi | Menghitung status online dinamis (timeout 45 detik) dan mengawali log aksi dengan status 'pending'. |
| `src/services/authApi.js` | Dimodifikasi | Menerapkan `getApiBaseUrl()` dengan fallback relatif di mode produksi untuk single-origin Nginx. |
| `src/services/iotApi.js` | Dimodifikasi | Menerapkan `getApiBaseUrl()` tunggal konsisten dengan `authApi`. |
| `src/pages/Dashboard.jsx` | Dimodifikasi | Menghubungkan kartu "Jadwal Berikutnya" secara dinamis, memperbaiki rollback pompa, dan membetulkan error handler pakan. |
| `src/pages/Schedules.jsx` | Dimodifikasi | Menghilangkan data tiruan, menginisialisasi state kosong, dan menambahkan empty state ramah pengguna. |
| `src/pages/History.jsx` | Dimodifikasi | Menghilangkan data tiruan, menginisialisasi state kosong, dan menambahkan empty state ramah pengguna. |
| `src/App.jsx` | Dimodifikasi | Menghubungkan indikator Online header secara dinamis melalui polling status backend. |
| `.env.example` | Dimodifikasi | Menyelaraskan panduan konfigurasi environment Vite untuk single-origin Nginx deployment. |
| `docs/WORK_LOG.md` | Dimodifikasi | Mencatat riwayat eksekusi Tugas 04 secara kronologis. |

---

## G. Pengujian dan Validasi Faktual

| Pengujian | Perintah | Hasil Aktual | Keterangan |
|---|---|---|---|
| **Backend Unit & Integration Tests** | `cd server && npm test` | **51/51 Lulus (100%)** | 22 test suites, durasi ~200ms. Seluruh pengujian lolos tanpa kegagalan. |
| **ESP32 Simulator CLI (Unauthorized Mode)** | `node tools/device-simulator/simulator.js --mode=unauthorized` | **HTTP 401 Lolos** | Backend menolak kunci tidak valid dengan status `DEVICE_UNAUTHORIZED`. |
| **ESP32 Simulator CLI (Invalid Payload Mode)** | `node tools/device-simulator/simulator.js --mode=invalid-payload` | **HTTP 400 Lolos** | Backend menolak nilai pH ekstrem (25.0) dengan pesan error validasi. |
| **ESP32 Simulator CLI (Single-Cycle Mode)** | `node tools/device-simulator/simulator.js --mode=once` | **Lolos Penuh** | Boot sync, pengiriman telemetri, command queue polling, dan penyelesaian siklus berhasil. |
| **Frontend Linter** | `npm run lint` | **0 errors, 0 warnings** | Memeriksa seluruh berkas React JSX, Hooks dependencies, dan server globals. |
| **Frontend Production Build** | `npm run build` | **Sukses (210ms)** | 1781 modul diproses, menghasilkan `dist/` siap deploy ke `/var/www/pakan-ikan/dist`. |

---

## H. Penilaian Kesiapan Deployment (Deployment Readiness Assessment)

1. **Keamanan:**
   - Celah BOLA/IDOR telah ditutup sepenuhnya.
   - Perangkat keras dilindungi oleh *rate limiter* aktuator untuk mencegah kerusakan mekanis atau overfeeding.
   - Backend terisolasi di antarmuka lokal `127.0.0.1:5000` dan dilindungi sandbox systemd.
2. **Arsitektur Jaringan:**
   - Single-origin topology via Nginx meniadakan kerumitan CORS.
   - Cloudflare Tunnel tetap mengarah ke `192.168.1.115:80` tanpa perlu perubahan konfigurasi tunnel.
3. **Hardware Simulation:**
   - Simulator ESP32 virtual siap digunakan untuk demonstrasi, simulasi beban, dan verifikasi otomatis tanpa bergantung pada alat fisik.

---

## I. Batasan yang Diketahui (Known Limitations) & Langkah Berikutnya

1. **Hardware Fisik:**
   Pengujian saat ini divalidasi menggunakan simulator perangkat lunak virtual `tools/device-simulator/simulator.js`. Pengujian langsung dengan mikrokontroler ESP32 fisik, modul sensor pH analog (PH-4502C), dan motor servo SG90/MG996R dijadwalkan pada tahap pengujian lapangan.
2. **Kredensial Firebase di VM:**
   Saat melakukan deployment aktual ke VM `192.168.1.115`, file `serviceAccountKey.json` Firebase Admin SDK wajib diletakkan secara aman di `/var/www/pakan-ikan/server/serviceAccountKey.json` dan tidak boleh di-commit ke Git repository publik.
