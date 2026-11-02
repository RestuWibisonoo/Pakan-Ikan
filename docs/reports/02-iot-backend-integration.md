# Laporan Tugas 02: Integrasi Modul Backend IoT (API v1)

## A. Task Information
- **Nomor Tugas:** 02
- **Judul Tugas:** Integrasi Modul Backend IoT dan Kontrol Perangkat Pakan Ikan
- **Tanggal Eksekusi:** 2026-11-02
- **Cakupan:** Backend Express (`server/`), lapisan rute `/api/v1/*`, validasi IoT, otentikasi hardware ESP32, service logika bisnis kolam, dan integrasi UI frontend (`src/pages/*`).
- **Objektif:** Menyediakan API backend terstandarisasi untuk monitoring nilai pH air real-time, eksekusi kontrol manual servo pakan dan saklar pompa air, manajemen jadwal pakan, riwayat log aktivitas, serta sinkronisasi perangkat keras ESP32 tanpa merusak atau menduplikasi sistem autentikasi yang sudah ada.

---

## B. Initial Repository Condition
- **Arsitektur Awal:**
  - Backend Express telah memiliki modul autentikasi kustom dan pengiriman email (`/api/auth/*`).
  - Halaman Dashboard, Jadwal, Riwayat, dan Pengaturan pada frontend masih menggunakan data *mock* (simulasi statis/interval acak di memori browser).
  - Belum ada rute backend untuk menerima telemetri dari mikrokontroler ESP32 maupun menerima perintah aksi aktuator.
- **Berkas Relevan Sebelum Modifikasi:**
  - `server/server.js`
  - `server/config/appConfig.js`
  - `src/pages/Dashboard.jsx`, `Schedules.jsx`, `History.jsx`, `Settings.jsx`
- **Fungsi Eksisting yang Wajib Dipertahankan:**
  - Seluruh endpoint autentikasi `/api/auth/send-verification`, `/api/auth/resend-verification`, `/api/auth/send-password-reset`.
  - Endpoint kesehatan server `/api/health`.
  - Keterpaduan template email kustom dan handler kode aksi `/auth/action`.

---

## C. Implementation Summary
- **Fitur yang Diimplementasikan:**
  - Pemisahan lapisan kontroler (`iotController.js`), layanan (`iotService.js`), repositori (`deviceRepository.js`), dan validator (`iotValidator.js`).
  - Rute versi 1 (`/api/v1/*`) terpisah dari rute autentikasi (`/api/auth/*`).
  - Validasi telemetri (rentang pH 0–14, status pompa, servo).
  - Validasi perintah pakan (durasi 100–30.000 ms) dan perintah pompa (`state: true/false` atau `'on'/'off'`).
  - Logika otomatis penentuan status pH kolam (`aman`, `asam`, `basa`) berdasarkan batas pengaturan pengguna.
  - Pembuatan antrean perintah tertunda (*pending commands*) untuk dieksekusi aktuator ESP32.
  - Pencatatan otomatis ke dalam riwayat log pH (`ph_logs`) dan log aksi (`action_logs`).
  - Integrasi antarmuka frontend melalui service client [`iotApi.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/src/services/iotApi.js) pada Dashboard, Jadwal, Riwayat, dan Pengaturan.
- **Keputusan Arsitektur:**
  - Menerapkan strategi versioning `/api/v1/` untuk seluruh endpoint IoT.
  - Menggunakan isolasi otentikasi: pengguna memakai Firebase ID Token (Bearer), sedangkan mikrokontroler ESP32 memakai header khusus `X-Device-Key`.
- **Perubahan API:**
  - `GET /api/v1/status`: Mengambil status pH terkini, status pompa, servo, dan pengaturan.
  - `POST /api/v1/commands/feed`: Memicu perintah pemberian pakan manual.
  - `POST /api/v1/commands/pump`: Mengatur status saklar pompa air (`on` / `off`).
  - `GET /api/v1/schedules`: Mengambil seluruh jadwal pakan.
  - `POST /api/v1/schedules`: Menambahkan jadwal pakan baru.
  - `PUT /api/v1/schedules/:id`: Memperbarui waktu/status aktif jadwal pakan.
  - `DELETE /api/v1/schedules/:id`: Menghapus jadwal pakan.
  - `GET /api/v1/settings` & `PUT /api/v1/settings`: Membaca dan memperbarui ambang batas pH serta durasi aktuator.
  - `GET /api/v1/logs/ph` & `GET /api/v1/logs/actions`: Mengambil riwayat telemetri dan riwayat aksi.
  - `POST /api/v1/device/telemetry`: Endpoint penerimaan telemetri dari ESP32.
  - `GET /api/v1/device/commands/pending`: Endpoint polling perintah tertunda oleh ESP32.
  - `POST /api/v1/device/commands/:id/result`: Pelaporan status eksekusi oleh ESP32.
  - `GET /api/v1/device/sync`: Sinkronisasi jadwal aktif dan konfigurasi untuk ESP32.

---

## D. File Change Inventory

| File | Change Type | Description |
|---|---|---|
| `server/config/appConfig.js` | Modified | Menambahkan konfigurasi `device.apiKey` dan `device.defaultDeviceId` |
| `server/server.js` | Modified | Mendaftarkan middleware router `app.use('/api/v1', iotRoutes)` |
| `server/middleware/deviceAuthMiddleware.js` | Created | Middleware validasi header `X-Device-Key` untuk mikrokontroler ESP32 |
| `server/validators/iotValidator.js` | Created | Skema validasi numerik sensor, durasi pakan, format waktu jadwal HH:mm |
| `server/services/iotService.js` | Created | Logika evaluasi status air kolam, pembuatan command, dan paket sync |
| `server/controllers/iotController.js` | Created | Controller penanganan request user dan ESP32 hardware |
| `server/routes/iotRoutes.js` | Created | Definisi rute Express `/api/v1/*` |
| `server/tests/iotValidator.test.js` | Created | Unit test validasi input telemetri, perintah, jadwal, dan pengaturan (14 tes) |
| `server/tests/iotService.test.js` | Created | Unit test kalkulasi pH dan antrean perintah (5 tes) |
| `server/tests/iotEndpoints.test.js` | Created | Integration test hak akses pengguna, hak akses ESP32, dan regresi (9 tes) |
| `src/services/iotApi.js` | Created | Modul klien fetch frontend ke endpoint `/api/v1` dengan Firebase ID token |
| `src/pages/Dashboard.jsx` | Modified | Menghubungkan telemetri pH real-time, kontrol pakan, dan pompa air ke `iotApi` |
| `src/pages/Schedules.jsx` | Modified | Menghubungkan penambahan, pengubahan, dan penghapusan jadwal ke `iotApi` |
| `src/pages/History.jsx` | Modified | Menampilkan data riwayat pH dan log aksi dinamis dari `iotApi` |
| `src/pages/Settings.jsx` | Modified | Menyimpan dan memuat konfigurasi ambang batas pH kolam ke `iotApi` |

---

## E. Testing and Validation

| Test | Command | Result |
|---|---|---|
| Automated Backend Tests (Total) | `cd server && npm test` | **43/43 lulus 100%** (Validator, Service, Endpoints, Auth, Templates, Link) |
| Automated Frontend Linter | `npm run lint` | **0 errors, 0 warnings** |
| Automated Frontend Build | `npm run build` | **Sukses (222ms)**, 1781 modul diproses |
| Regression Test Autentikasi | Pengujian endpoint `/api/auth/*` | Semua rute autentikasi lama tetap berjalan dan menolak token kosong |
| Manual Endpoint Test via Curl | `curl /api/v1/status` (tanpa token) | Mengembalikan status 401 `AUTH_TOKEN_MISSING` sesuai standar |
| Manual Hardware Test via Curl | `curl /api/v1/device/sync` (dengan key) | Mengembalikan status 200 dan paket konfigurasi sinkronisasi |

---

## F. Security Review
- **Authentication:** Pengguna wajib login Firebase Authentication dan menyertakan Bearer ID Token untuk seluruh endpoint `/api/v1/*` (kecuali endpoint khusus device).
- **Device Authentication:** ESP32 menggunakan kunci rahasia statis hardware `DEVICE_API_KEY` pada header `X-Device-Key`. ESP32 tidak menggunakan kredensial email/password pengguna agar kredensial pengguna tidak disimpan pada flash memory perangkat.
- **Authorization:** Setiap aksi kontrol manual dicatat bersama identitas email pengirim pada log audit server.
- **Input Validation:** Seluruh input numerik diperiksa agar tidak terjadi injeksi angka negatif atau di luar ambang batas fisik (pH 0–14, durasi milidetik wajar).
- **Credential Handling:** Kunci rahasia perangkat disimpan di environment variable `DEVICE_API_KEY` dan terdokumentasi pada `.env.example`.

---

## G. Known Issues and Limitations
1. Perangkat keras fisik ESP32 belum terhubung secara langsung pada sesi lokal ini, pengujian perangkat diuji menggunakan request simulasi HTTP headers yang identik dengan library HTTPClient Arduino/ESP-IDF.

---

## H. Next Steps
1. Mendokumentasikan arsitektur Firebase Realtime Database dan aturan hak akses keamanan database (*Security Rules*).
2. Menyiapkan sketsa firmware Arduino / PlatformIO ESP32 yang terhubung ke endpoint `/api/v1/device/*`.

---

## I. Final Status
**Completed** (Seluruh fungsionalitas backend IoT, kontrol aktuator, jadwal, validasi, dan integrasi frontend telah selesai dan teruji secara otomatis).
