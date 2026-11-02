# Laporan Tugas 04: Audit Menyeluruh Integrasi, Keamanan, dan Keandalan (Full Integration, Security & Reliability Audit)

## A. Informasi Audit
- **Nomor Tugas:** 04
- **Judul Tugas:** Audit Menyeluruh Integrasi, Keamanan, dan Keandalan Sistem Pakan Ikan
- **Tanggal Eksekusi:** 2026-11-02
- **Cakupan:** Seluruh repositori (React Frontend, Express Backend, Firebase Authentication, Firebase Realtime Database, dan integrasi ESP32).
- **Objektif:** Mengidentifikasi secara objektif celah keamanan, inkonsistensi data, kelemahan arsitektur, dan ketidaksesuaian antara dokumentasi dan kode nyata sebelum implementasi fitur baru atau pengujian perangkat fisik.

---

## B. Kondisi Awal Repositori & Cakupan Audit
- **Frontend:** React 19 + Vite 8 (`src/pages/*`, `src/contexts/*`, `src/services/*`).
- **Backend:** Node.js Express (`server/*`).
- **Autentikasi:** Firebase Authentication (User) & Shared Key Header (ESP32).
- **Database:** Firebase Realtime Database (Project ID: `pakan-ikan-4c18e`).
- **Dokumentasi yang Ditinjau:** `docs/WORK_LOG.md`, `docs/reports/01-custom-email-auth.md`, `docs/reports/02-iot-backend-integration.md`, `docs/reports/03-iot-database-architecture.md`, `design.md`.

---

## C. Matriks Keterlacakan (Traceability Matrix)

| Komponen / Fitur | Rujukan Dokumentasi | Berkas Implementasi Aktual | Status Uji Otomatis | Status Audit & Keterlacakan |
|---|---|---|---|---|
| **Custom Email Auth** | `docs/reports/01-custom-email-auth.md` | `server/controllers/authController.js`, `src/pages/AuthActionHandler.jsx` | 15/15 Lulus | **Terlacak**: Berfungsi sesuai spesifikasi, failover transparan teruji. |
| **API IoT v1 (User)** | `docs/reports/02-iot-backend-integration.md` | `server/controllers/iotController.js`, `server/routes/iotRoutes.js` | 9/9 Lulus | **Ada Celah**: Tidak ada otorisasi kepemilikan perangkat (IDOR) & tanpa rate limiter. |
| **API IoT v1 (ESP32)** | `docs/reports/02-iot-backend-integration.md` | `server/middleware/deviceAuthMiddleware.js` | 5/5 Lulus | **Ada Celah**: Shared static key tunggal, tanpa deteksi timeout offline. |
| **Realtime Database** | `docs/reports/03-iot-database-architecture.md` | `server/repositories/deviceRepository.js` | Terintegrasi | **Ada Celah**: Silent mock fallback aktif di production, pending command tertimpa. |
| **Antarmuka Frontend** | `design.md` | `src/pages/Dashboard.jsx`, `Schedules.jsx`, `History.jsx`, `Settings.jsx` | Build Sukses | **Ada Celah**: Mock statis ditampilkan saat database kosong, header online di-hardcode. |

---

## D. Daftar Temuan Audit Berdasarkan Prioritas

### 1. Kategori: CRITICAL

#### [CRIT-01] Kerentanan IDOR / Broken Object-Level Authorization (BOLA) pada Seluruh Endpoint IoT Pengguna
- **Berkas & Lokasi:** [`server/controllers/iotController.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/controllers/iotController.js#L13-L21) (fungsi `getDeviceId`)
- **Penjelasan Masalah:**
  Fungsi penentu ID perangkat mengambil `deviceId` dari query string (`req.query.deviceId`) atau header (`x-device-id`), lalu melakukan fallback ke default:
  ```javascript
  function getDeviceId(req) {
    return (
      req.device?.id ||
      req.query?.deviceId ||
      req.headers['x-device-id'] ||
      config.device.defaultDeviceId
    );
  }
  ```
  Tidak ada verifikasi apakah `req.user.uid` pemilik sah dari `deviceId` tersebut.
- **Dampak Teknis:**
  Pengguna A yang berhasil login ke akun miliknya dapat mengontrol pakan, menyalakan/mematikan pompa air, mengubah ambang batas pH, atau menghapus jadwal pakan milik Pengguna B dengan mengirimkan `?deviceId=<id_pengguna_lain>`.
- **Bukti / Kondisi:**
  Pada rute `POST /api/v1/commands/feed`, token valid pengguna mana pun dapat memicu servo kolam siapa pun.
- **Rekomendasi Perbaikan:**
  Buat relasi kepemilikan perangkat di database (misal: node `/user_devices/{uid}/{deviceId}` atau field `owner_uid` pada `/devices/{deviceId}/meta`) dan buat middleware otorisasi `requireDeviceOwnership` yang memverifikasi kepemilikan sebelum memproses aksi.
- **Prioritas:** **CRITICAL (P0)**

---

#### [CRIT-02] Silent In-Memory Mock Fallback di Production Menyembunyikan Kegagalan Database
- **Berkas & Lokasi:** [`server/repositories/deviceRepository.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/repositories/deviceRepository.js#L78-L100) & [`server/config/firebaseAdmin.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/config/firebaseAdmin.js#L68-L76)
- **Penjelasan Masalah:**
  Jika environment variable `FIREBASE_SERVICE_ACCOUNT_KEY` belum dipasang, atau jika koneksi Firebase Realtime Database terputus di production:
  `deviceRepository` secara diam-diam (*silent fallback*) beralih membaca dan menulis ke `mockStore` di memori RAM server tanpa mengembalikan status error HTTP (misal 503 Service Unavailable) ke klien.
- **Dampak Teknis:**
  1. Pengguna akan melihat data telemetri statis (`pH 7.2 Aman`) dan mengira kolam dalam kondisi normal, padahal sensor fisik kolam sedang mati atau mengalami keasaman berbahaya (`pH 4.0`).
  2. Perintah pakan atau jadwal baru yang disimpan pengguna hanya tersimpan di RAM proses Node.js lokal dan akan lenyap seketika saat server cloud/container melakukan restart.
- **Bukti / Kondisi:**
  Saat server dijalankan tanpa service account key, seluruh endpoint `/api/v1/status`, `/api/v1/schedules`, dsb. tetap merespons status `200 OK` menggunakan data memori lokal.
- **Rekomendasi Perbaikan:**
  Pisahkan mock repository hanya untuk lingkungan `NODE_ENV === 'test'` atau `NODE_ENV === 'development'`. Di lingkungan `NODE_ENV === 'production'`, jika `!hasDatabaseAccess()`, server wajib merespons `503 Service Unavailable` dengan pesan diagnostik yang jelas.
- **Prioritas:** **CRITICAL (P0)**

---

### 2. Kategori: HIGH

#### [HIGH-01] Ketiadaan Rate Limiting pada Seluruh Rute IoT (`/api/v1/*`)
- **Berkas & Lokasi:** [`server/routes/iotRoutes.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/routes/iotRoutes.js#L29-L63)
- **Penjelasan Masalah:**
  Seluruh endpoint kontrol dan telemetri (`/api/v1/commands/feed`, `/api/v1/commands/pump`, `/api/v1/device/telemetry`) tidak dipasangi middleware *rate limiting*.
- **Dampak Teknis:**
  1. *Actuator Abuse / Hardware Damage:* Penyerang atau script loop dapat memanggil `POST /api/v1/commands/feed` puluhan kali dalam hitungan detik, menyebabkan wadah pakan tumpah habis ke kolam dan meracuni ikan (amonia tinggi).
  2. *Database Exhaustion:* ESP32 atau penyerang dapat membanjiri `POST /api/v1/device/telemetry` sehingga kuota penulisan Firebase RTDB habis seketika.
- **Bukti / Kondisi:**
  Pengujian endpoint `/api/v1/commands/feed` dapat dieksekusi ratusan kali berturut-turut tanpa batas waktu jeda (*cooldown*).
- **Rekomendasi Perbaikan:**
  Terapkan `express-rate-limit` khusus IoT:
  - Perintah manual pakan: maksimal 1 request per 30 detik per perangkat (*cooldown* mekanis servo).
  - Perintah pompa: maksimal 5 request per menit.
  - Telemetri ESP32: maksimal 1 request per 3 detik per perangkat.
- **Prioritas:** **HIGH (P1)**

---

#### [HIGH-02] Pencatatan Log Aksi "Berhasil" Sebelum Eksekusi Fisik Aktuator
- **Berkas & Lokasi:** [`server/services/iotService.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/services/iotService.js#L85-L91)
- **Penjelasan Masalah:**
  Pada fungsi `triggerFeedCommand` dan `triggerPumpCommand`, aksi langsung dicatat ke `action_logs` dengan status `'success'` saat perintah baru dimasukkan ke antrean (*pending*):
  ```javascript
  await deviceRepository.addActionLog(deviceId, {
    type: 'feed',
    action: source === 'manual' ? 'Manual Feed' : 'Auto Feed',
    status: 'success', // <--- Dinyatakan sukses sebelum ESP32 mengeksekusi
    timestamp: new Date().toISOString(),
  });
  ```
  Jika ESP32 offline, atau mengalami servo macet lalu melaporkan `failed` melalui `/device/commands/:id/result`, log aksi tidak pernah diperbarui.
- **Dampak Teknis:**
  Riwayat aksi di antarmuka web menampilkan "Berhasil", padahal pakan tidak pernah keluar atau pompa tidak pernah menyala.
- **Rekomendasi Perbaikan:**
  Catat log aksi awal dengan status `'queued'` atau `'pending'`. Perbarui status log menjadi `'success'` atau `'failed'` hanya setelah ESP32 mengirim laporan eksekusi melalui endpoint `POST /api/v1/device/commands/:id/result`.
- **Prioritas:** **HIGH (P1)**

---

#### [HIGH-03] Penimpaan Perintah Pending (*Command Queue Overwrite / Race Condition*)
- **Berkas & Lokasi:** [`server/repositories/deviceRepository.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/repositories/deviceRepository.js#L173-L199) (metode `createCommand`)
- **Penjelasan Masalah:**
  Perintah tertunda disimpan pada satu node objek tunggal: `devices/${id}/commands/pending`.
  Jika pengguna menekan tombol "Beri Pakan" lalu dalam 1 detik menekan tombol "Pompa Air", perintah pompa akan menimpa perintah pakan.
- **Dampak Teknis:**
  Perintah pakan pertama terhapus dari antrean tanpa sempat dibaca atau dieksekusi oleh mikrokontroler ESP32.
- **Rekomendasi Perbaikan:**
  Ubah skema perintah menjadi antrean FIFO berbasis daftar/push ID: `/devices/{deviceId}/commands/queue/{commandId}`. ESP32 mengambil perintah terlama yang belum selesai (*status: 'pending'*).
- **Prioritas:** **HIGH (P1)**

---

### 3. Kategori: MEDIUM

#### [MED-01] Frontend Menampilkan Data Mock Tiruan Saat Database Kosong (*Empty State Masking*)
- **Berkas & Lokasi:**
  - [`src/pages/Schedules.jsx`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/src/pages/Schedules.jsx#L6-L23)
  - [`src/pages/History.jsx`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/src/pages/History.jsx#L8-L44)
  - [`src/pages/Dashboard.jsx`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/src/pages/Dashboard.jsx#L130-L140)
- **Penjelasan Masalah:**
  1. Di `Schedules.jsx` dan `History.jsx`, `useState` diinisialisasi dengan data tiruan bawaan (misal jadwal 07:00 Pagi dan log pH palsu). Blok `then()` mengecek:
     `if (res?.data && Array.isArray(res.data) && res.data.length > 0)`
     Jika database memiliki 0 jadwal atau 0 riwayat (pengguna baru atau seluruh jadwal dihapus), state **tidak pernah diperbarui ke array kosong**. Akibatnya, pengguna tetap disuguhi jadwal dan riwayat tiruan.
  2. Di `Dashboard.jsx`, kartu "Jadwal Berikutnya" di-hardcode teks `"17:00 Sore Hari Aktif"` tanpa menghubungkannya dengan jadwal aktual yang ada di database.
  3. Di `Dashboard.jsx`, pada blok `catch` fungsi `handleFeed`:
     ```javascript
     catch {
       alert('Perintah pakan berhasil dikirim.'); // <--- Alert salah saat request gagal
     }
     ```
- **Dampak Teknis:**
  Pengguna tertipu melihat data tiruan dan mengira pakan berhasil diberikan saat jaringan sedang error.
- **Rekomendasi Perbaikan:**
  Inisialisasi state dengan array kosong `[]`, tampilkan *Skeleton Loading* saat memuat data, tampilkan *Empty State* yang ramah jika data berjumlah 0, dan perbaiki penanganan error agar menampilkan alert kegagalan yang sebenarnya.
- **Prioritas:** **MEDIUM (P2)**

---

#### [MED-02] Ketiadaan Mekanisme Timeout Status Online (*Heartbeat Disconnect Detection*)
- **Berkas & Lokasi:** [`server/services/iotService.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/services/iotService.js#L26-L45) & [`src/App.jsx`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/src/App.jsx#L67-L70)
- **Penjelasan Masalah:**
  1. Di backend, status `online: true` hanya diperbarui saat ESP32 mengirim telemetri. Tidak ada pengecekan selisih waktu (`Date.now() - Date.parse(last_seen) > 30000ms`). Jika perangkat mati listrik atau Wi-Fi terputus, field `status.online` di database tetap bernilai `true`.
  2. Di frontend [`App.jsx`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/src/App.jsx), indikator status perangkat di header atas di-hardcode secara statis:
     ```jsx
     <div className="device-status">
       <span className="status-indicator online"></span>
       <span>Online</span>
     </div>
     ```
- **Dampak Teknis:**
  Sistem selalu mengklaim alat sedang "Online" meskipun mikrokontroler kolam mati berhari-hari.
- **Rekomendasi Perbaikan:**
  Di backend, hitung status online secara dinamis: jika `Date.now() - new Date(last_seen).getTime() > 45000` (45 detik), kembalikan `online: false`. Di frontend, hubungkan status header dengan nilai `online` dinamis dari API.
- **Prioritas:** **MEDIUM (P2)**

---

#### [MED-03] Pertumbuhan Data Riwayat Realtime Database Tanpa Batas (*Unbounded Storage Growth*)
- **Berkas & Lokasi:** [`server/repositories/deviceRepository.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/repositories/deviceRepository.js#L237-L255) (metode `addPhLog`)
- **Penjelasan Masalah:**
  Setiap telemetri sensor pH yang masuk disimpan sebagai node baru di Firebase RTDB (`devices/${id}/logs/ph_logs/${logId}`). Dengan interval pengiriman ESP32 setiap 10 detik, sistem menghasilkan 8.640 entri per hari (lebih dari 250.000 entri per bulan).
- **Dampak Teknis:**
  Konsumsi bandwidth Firebase meningkat pesat, waktu baca (*query latency*) melambat, dan kuota penyimpanan gratis Firebase akan cepat habis.
- **Rekomendasi Perbaikan:**
  Implementasikan retensi data:
  1. Simpan riwayat detail per 10 detik hanya untuk 24 jam terakhir.
  2. Lakukan pemangkasan (*pruning*) otomatis pada entri yang lebih tua dari batas retensi.
- **Prioritas:** **MEDIUM (P2)**

---

### 4. Kategori: LOW

#### [LOW-01] Shared Static Global Device API Key Tanpa Rotasi / Per-Device Secret
- **Berkas & Lokasi:** [`server/middleware/deviceAuthMiddleware.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/middleware/deviceAuthMiddleware.js#L14-L24)
- **Penjelasan Masalah:**
  Semua perangkat menggunakan satu kunci statis `DEVICE_API_KEY`. Validasi string menggunakan operator `!==` standar tanpa perbandingan waktu konstan (*timing-safe equal*).
- **Dampak Teknis:**
  Jika satu unit ESP32 terbongkar atau dicuri kunci kodenya, penyerang dapat memanipulasi telemetri unit lain.
- **Rekomendasi Perbaikan:**
  Gunakan `crypto.timingSafeEqual` untuk mencegah *timing attacks*, dan rencanakan pembuatan token per-device di masa mendatang.
- **Prioritas:** **LOW (P3)**

---

#### [LOW-02] Ukuran Bundle Frontend Melebihi 500 kB Tanpa Code-Splitting
- **Berkas & Lokasi:** [`vite.config.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/vite.config.js) & [`src/App.jsx`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/src/App.jsx)
- **Penjelasan Masalah:**
  Proses build menghasilkan bundle JavaScript tunggal sebesar 543.43 kB.
- **Dampak Teknis:**
  Waktu muat awal pada smartphone dengan koneksi internet seluler yang kurang stabil menjadi sedikit lebih lambat.
- **Rekomendasi Perbaikan:**
  Terapkan `React.lazy()` dan `Suspense` untuk rute-rute halaman utama (`Dashboard`, `Schedules`, `History`, `Settings`, `AuthActionHandler`).
- **Prioritas:** **LOW (P3)**

---

## E. Pengujian dan Validasi Aktual

Semua pengujian dijalankan langsung pada repositori saat audit:

| Pengujian | Perintah | Hasil Aktual | Keterangan |
|---|---|---|---|
| **Unit & Integration Tests** | `cd server && npm test` | **43/43 Lulus (100%)** | Durasi 248ms (Menguji validator, service, dan handler mock) |
| **Frontend Linter** | `npm run lint` | **0 errors, 0 warnings** | Memeriksa kepatuhan sintaks dan React Hooks |
| **Frontend Production Build** | `npm run build` | **Sukses (204ms)** | 1781 modul diproses, menghasilkan `dist/` |
| **Static Code Audit** | Penelusuran baris per baris | **10 Temuan Teridentifikasi** | 2 Critical, 3 High, 3 Medium, 2 Low |
| **ESP32 Hardware Physical Test** | N/A | **Belum Dilakukan** | Hardware fisik belum dihubungkan ke server |
| **Live Firebase RTDB Test** | N/A | **Belum Dilakukan** | Kredensial privat service account belum ditaruh di server lokal |

---

## F. Rekomendasi Urutan Perbaikan (Remediation Plan)

Berdasarkan tingkat risiko dan dampak arsitektur, urutan perbaikan yang disarankan adalah:

```
[Fase 1: Keamanan & Integritas Kritis]
1. Perbaiki CRIT-01: Pasang relasi kepemilikan perangkat (User Ownership) untuk mencegah BOLA/IDOR.
2. Perbaiki CRIT-02: Batasi in-memory mock fallback hanya untuk environment test/dev; kembalikan HTTP 503 di production saat RTDB putus.

[Fase 2: Keandalan Kontrol & Hardware]
3. Perbaiki HIGH-01: Pasang rate limiting ketat pada perintah pakan dan pompa untuk mencegah kerusakan fisik aktuator.
4. Perbaiki HIGH-02: Ubah status log aksi awal menjadi 'pending' dan mutakhirkan ke 'success' hanya saat ESP32 mengonfirmasi eksekusi.
5. Perbaiki HIGH-03: Ubah node `commands/pending` menjadi struktur antrean FIFO agar perintah tidak saling menimpa.

[Fase 3: Pengalaman Pengguna & Telemetri]
6. Perbaiki MED-01: Perbaiki inisialisasi state frontend, tampilkan empty state yang benar, dan hubungkan kartu "Jadwal Berikutnya" dengan data database.
7. Perbaiki MED-02: Buat kalkulasi status online dinamis berbasis ambang batas waktu (heartbeat timeout).
8. Perbaiki MED-03: Buat mekanisme retensi/pembersihan log telemetri berkala di Realtime Database.

[Fase 4: Optimasi & Pemeliharaan]
9. Perbaiki LOW-01: Gunakan `crypto.timingSafeEqual` untuk otentikasi kunci perangkat.
10. Perbaiki LOW-02: Terapkan code-splitting (`React.lazy`) pada router frontend.
```

---

## G. Status Akhir Audit
**Completed** (Audit komprehensif selesai, seluruh berkas sumber telah diperiksa, 10 temuan telah diklasifikasikan dengan bukti kode dan rekomendasi perbaikan, serta seluruh unit test dan build saat ini telah tercatat secara faktual).
