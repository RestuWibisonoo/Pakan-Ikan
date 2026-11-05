# Laporan Tugas 03: Integrasi dan Sinkronisasi Firmware IoT (.ino) dengan Web API

## A. Task Information
- **Nomor Tugas:** 03
- **Judul Tugas:** Integrasi Menyeluruh dan Sinkronisasi Firmware IoT ESP32 (`.ino`) dengan REST API Web Pakan Ikan
- **Tanggal Selesai:** 2026-11-05
- **Cakupan:** Firmware Mikrokontroler (`kode-ino/`), Lapisan API Backend IoT (`server/`), Pembersihan Dummy Data, Pengerasan Keamanan Header, dan Dokumentasi End-to-End.
- **Objektif:** Menghubungkan perangkat keras ESP32 dan Arduino Nano secara dua arah dengan Web API Pakan Ikan (`https://pakan-ikan.my.id`), memastikan telemetri sensor pH tersimpan ke database, mengeksekusi kontrol pakan/pompa dari web, serta membersihkan seluruh data dummy di frontend dan backend.

---

## B. Ringkasan Arsitektur Sebelum dan Sesudah Integrasi

### 1. Kondisi Awal Sebelum Integrasi
- **Firmware ESP32 (`esp32capstone.ino`):**
  - Menggunakan endpoint placeholder lama yang belum terdaftar: `/api/device/data` dan `/api/device/commands`.
  - Header otentikasi hanya mengirim `Authorization: Bearer <token>` generik.
  - Payload JSON sensor menggunakan kunci lokal: `status_pompa`, `status_pakan`, `waktu` yang diabaikan oleh backend.
  - Polling perintah mencari field `command_id` dan `command` (`PAKAN` / `AIR`), sedangkan backend menghasilkan `id` dan `type` (`feed` / `pump`).
  - Tidak ada pelaporan hasil eksekusi (`result`), menyebabkan antrean perintah menggantung (status *pending* di dashboard hingga timeout 3 menit).
  - Flag `ENABLE_API` diset `false` (hanya pengujian serial lokal).
  - Kredensial WiFi, server, dan kunci rahasia tercampur di badan kode utama tanpa file konfigurasi modular.
- **Aplikasi Web & Backend:**
  - Backend Express API v1 sudah memiliki rute `/api/v1/device/*`, namun repository data `fish-feeder-001` masih berisi mock data statis (pH 7.2, log aksi contoh).
  - Frontend Dashboard menampilkan nilai fallback 7.0 dan badge 'Aman' meskipun alat fisik belum pernah terhubung.

### 2. Arsitektur Setelah Integrasi
```
┌─────────────────────────────────────────────────────────────┐
│                 PERANGKAT KERAS (KOLAM)                     │
│                                                             │
│   [ Sensor Probe pH ]      [ Relay Pompa ]    [ Servo Pakan ]
│            │                      ▲                  ▲      │
│            ▼                      │                  │      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 Arduino Nano (Atmega328P)           │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │ UART2 (Serial2 9600 baud)    │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 ESP32 NodeMCU / DevKit              │   │
│   │  (kode-ino/config.h & kode-ino/esp32capstone.ino)   │   │
│   └──────────────────────────┬──────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────┘
                               │ HTTPS / JSON (Non-blocking)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 SERVER VM (192.168.1.115)                   │
│                                                             │
│   Cloudflare Tunnel Connector -> Nginx Reverse Proxy (Port 80)
│                               │                             │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │              Node.js Express Backend (Port 5000)    │   │
│   │  - deviceAuthMiddleware (X-Device-Id, X-Device-Key) │   │
│   │  - iotValidator (Rentang numerik pH 0-14, format)   │   │
│   │  - iotService & deviceRepository                    │   │
│   └───────────────┬───────────────────────────┬─────────┘   │
│                   │                           │             │
│   ┌───────────────▼───────────┐   ┌───────────▼─────────┐   │
│   │ Firebase Realtime Database│   │ React SPA Frontend  │   │
│   │  - devices/{id}/status    │   │  - Dashboard (Live) │   │
│   │  - devices/{id}/logs      │   │  - Perangkat (/dev) │   │
│   │  - devices/{id}/commands  │   │  - Jadwal & Riwayat │   │
│   └───────────────────────────┘   └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## C. Pemetaan Kompatibilitas Firmware dan Web API

| Komponen / Fungsi | Firmware (.ino) Awal | Penyesuaian Firmware Baru | Kontrak Web API Backend | Status |
|---|---|---|---|---|
| **ID Perangkat** | Tidak ada | `DEVICE_ID` (`fish-feeder-001`) | Header `X-Device-Id` | ✅ Sinkron |
| **Kunci Otentikasi** | `Bearer ISI_TOKEN_API` | `DEVICE_KEY` | Header `X-Device-Key` | ✅ Sinkron |
| **Endpoint Telemetri** | `/api/device/data` | `/api/v1/device/telemetry` | `POST /api/v1/device/telemetry` | ✅ Sinkron |
| **Nilai Sensor pH** | `nilaiPH` (Float) | `"ph": float` | `ph: number` (0.00 – 14.00) | ✅ Sinkron |
| **Status Pompa Air** | `"status_pompa": "NORMAL"` | `"pump_status": "on"/"off"` | `pump_status: 'on' \| 'off'` | ✅ Sinkron |
| **Status Servo Pakan** | `"status_pakan": "STANDBY"` | `"servo_status": "running"/"idle"` | `servo_status: 'running' \| 'idle'` | ✅ Sinkron |
| **Timestamp RTC** | `"waktu": "00:00"` | `"waktu": "00:00"` | Disimpan di telemetri & `last_seen` server | ✅ Sinkron |
| **Endpoint Polling Perintah** | `/api/device/commands` | `/api/v1/device/commands/pending` | `GET /api/v1/device/commands/pending` | ✅ Sinkron |
| **Parser ID Perintah** | `command_id` | `id` | `command.id` | ✅ Sinkron |
| **Parser Aksi Perintah** | `command` (`PAKAN` / `AIR`) | `type` (`feed` / `pump`) | `command.type` (`feed` / `pump`) | ✅ Sinkron |
| **Aksi Kontrol Pakan** | `kirimPerintahNano("CMD:PAKAN")` | `kirimPerintahNano("CMD:PAKAN")` | Memicu servo pakan kolam | ✅ Sinkron |
| **Aksi Kontrol Pompa** | `kirimPerintahNano("CMD:AIR")` | `kirimPerintahNano("CMD:AIR")` | Memicu relay pompa air | ✅ Sinkron |
| **Pelaporan Hasil Eksekusi** | Belum ada (menggantung) | `laporHasilPerintah(id, "completed")` | `POST /api/v1/device/commands/:id/result` | ✅ Sinkron |
| **Mode Operasi** | `ENABLE_API = false` | `ENABLE_API = true` (konfigurabel) | Server siap menerima telemetri | ✅ Aktif |

---

## D. Daftar Endpoint API yang Digunakan

### 1. Endpoint Perangkat Keras (ESP32)
* **`POST /api/v1/device/telemetry`**
  * **Header:** `Content-Type: application/json`, `X-Device-Id: <id>`, `X-Device-Key: <key>`
  * **Fungsi:** Mengirimkan data telemetri kualitas air pH dan status aktuator.
  * **Respons Sukses:** HTTP 200 `{ "success": true, "message": "Telemetri berhasil dicatat.", "status": { ... } }`
* **`GET /api/v1/device/commands/pending`**
  * **Header:** `X-Device-Id: <id>`, `X-Device-Key: <key>`
  * **Fungsi:** Mengambil antrean perintah FIFO yang belum dieksekusi oleh mikrokontroler.
  * **Respons Sukses:** HTTP 200 `{ "success": true, "command": { "id": "cmd_...", "type": "feed", "params": { ... } } }` (atau `command: null` jika antrean kosong).
* **`POST /api/v1/device/commands/:id/result`**
  * **Header:** `Content-Type: application/json`, `X-Device-Id: <id>`, `X-Device-Key: <key>`
  * **Payload:** `{ "status": "completed" }` (atau `"failed"`)
  * **Fungsi:** Mengonfirmasi bahwa ESP32 telah sukses mengirimkan trigger sinyal ke aktuator fisik/Nano.
* **`GET /api/v1/device/sync`**
  * **Header:** `X-Device-Id: <id>`, `X-Device-Key: <key>`
  * **Fungsi:** Sinkronisasi konfigurasi batas pH, jadwal pakan aktif, dan waktu server (`serverTime`).

### 2. Endpoint Pengguna & Frontend (Firebase ID Token)
* `GET /api/v1/status`: Menampilkan status sistem pH live, online/offline, dan saklar pompa.
* `POST /api/v1/commands/feed`: Memicu pakan manual dari web.
* `POST /api/v1/commands/pump`: Memicu saklar pompa air (ON/OFF).
* `GET /api/v1/logs/ph`: Riwayat grafik nilai pH air.
* `GET /api/v1/logs/actions`: Riwayat aktivitas pakan dan pompa.
* `GET /api/v1/devices` & `POST /api/v1/devices`: Manajemen pendaftaran modul IoT ke akun.

---

## E. Contoh Request dan Response Aktual

### 1. Kirim Telemetri Sensor
**Request:**
```http
POST /api/v1/device/telemetry HTTP/1.1
Host: pakan-ikan.my.id
Content-Type: application/json
X-Device-Id: fish-feeder-001
X-Device-Key: pakan-ikan-secret-2026

{
  "deviceId": "fish-feeder-001",
  "ph": 7.35,
  "pump_status": "off",
  "servo_status": "idle",
  "waktu": "14:30",
  "online": true
}
```
**Response:**
```json
{
  "success": true,
  "message": "Telemetri berhasil dicatat.",
  "status": {
    "online": true,
    "last_seen": "2026-11-05T15:20:00.000Z",
    "ph": 7.35,
    "ph_status": "aman",
    "pump_status": "off",
    "servo_status": "idle"
  }
}
```

### 2. Polling Perintah Tertunda
**Request:**
```http
GET /api/v1/device/commands/pending HTTP/1.1
Host: pakan-ikan.my.id
X-Device-Id: fish-feeder-001
X-Device-Key: pakan-ikan-secret-2026
```
**Response:**
```json
{
  "success": true,
  "command": {
    "id": "cmd_1730823901_abcde",
    "type": "feed",
    "params": {
      "duration_ms": 1000,
      "requested_by": "user@pakan-ikan.my.id"
    },
    "status": "pending",
    "created_at": "2026-11-05T15:20:05.000Z"
  }
}
```

### 3. Konfirmasi Hasil Eksekusi Perintah
**Request:**
```http
POST /api/v1/device/commands/cmd_1730823901_abcde/result HTTP/1.1
Host: pakan-ikan.my.id
Content-Type: application/json
X-Device-Id: fish-feeder-001
X-Device-Key: pakan-ikan-secret-2026

{
  "status": "completed"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Laporan hasil eksekusi perintah berhasil disimpan.",
  "result": {
    "command_id": "cmd_1730823901_abcde",
    "status": "completed",
    "finished_at": "2026-11-05T15:20:07.000Z"
  }
}
```

---

## F. Daftar File yang Diubah dan Dibuat

1. **`kode-ino/config.h` (Dibuat):**
   File konfigurasi modular berisi SSID, password WiFi, `SERVER_URL`, `DEVICE_ID`, `DEVICE_KEY`, interval timer, dan pin UART2.
2. **`kode-ino/config.example.h` (Dibuat):**
   Template konfigurasi contoh tanpa kredensial sensitif.
3. **`kode-ino/esp32capstone.ino` (Diperbarui):**
   - Mengimpor `config.h`.
   - Menggunakan pendekatan non-blocking millis untuk timer telemetri, timer polling perintah, dan timer rekoneksi WiFi.
   - Mengirimkan header `X-Device-Id` dan `X-Device-Key`.
   - Menangani pembacaan serial UART2 (Nano) secara kontinu tanpa terblokir oleh request HTTP.
   - Menerapkan fungsi `laporHasilPerintah()` setelah perintah `CMD:PAKAN` atau `CMD:AIR` dikirim ke Nano.
   - Serial monitor logging komprehensif tanpa membocorkan rahasia kredensial.
4. **`server/repositories/deviceRepository.js` (Diperbarui):**
   - Membersihkan data dummy pada state awal perangkat `fish-feeder-001` (`online: false`, `ph: null`, `ph_logs: []`, `action_logs: []`, `schedules: {}`).
5. **`src/pages/Dashboard.jsx` (Diperbarui):**
   - Nilai pH menampilkan `'--'` saat sensor belum mengirim telemetri.
   - Status badge menampilkan *"Menunggu Alat"* dan teks status panduan.
6. **`src/pages/Devices.jsx` (Diperbarui):**
   - Pembersihan import variabel yang tidak digunakan.
7. **`src/pages/AuthActionHandler.jsx` & `VerifyEmail.jsx` (Diperbarui):**
   - Penghapusan unused variables demi kebersihan linter.
8. **`.gitignore` (Diperbarui):**
   - Mengabaikan file build compiler Arduino (`*.bin`, `*.hex`, `*.elf`), Android build lokal, dan file temporary OS/editor.

---

## G. Mekanisme Komunikasi Dua Arah & Keamanan

### 1. Komunikasi Dua Arah (Duplex Flow)
* **Arah Telemetri (Alat $\rightarrow$ Web):**
  Sensor pH membaca air $\rightarrow$ Arduino Nano mengirim `DATA:7.2,OFF,IDLE,12:00` via Serial2 $\rightarrow$ ESP32 menyusun JSON $\rightarrow$ ESP32 mengirim `POST /api/v1/device/telemetry` $\rightarrow$ Backend memvalidasi (0–14) $\rightarrow$ Backend menyimpan ke database $\rightarrow$ Dashboard web ter-update otomatis dalam interval 8 detik.
* **Arah Kontrol (Web $\rightarrow$ Alat):**
  Pengguna menekan tombol "Beri Pakan" di Dashboard $\rightarrow$ Web mengirim `POST /api/v1/commands/feed` $\rightarrow$ Backend membuat objek perintah pending di antrean FIFO $\rightarrow$ ESP32 polling `GET /api/v1/device/commands/pending` setiap 2 detik $\rightarrow$ ESP32 mendeteksi perintah pakan $\rightarrow$ ESP32 mengirim `CMD:PAKAN` ke Arduino Nano $\rightarrow$ ESP32 mengirim konfirmasi `POST .../result` dengan status `completed` $\rightarrow$ Backend mengubah status aksi menjadi sukses dan membersihkan antrean.

### 2. Standar Keamanan Komunikasi
- **Pemisahan Kredensial:** Seluruh konfigurasi sensitif dipusatkan di `config.h`.
- **Timing-Safe Key Comparison:** Server membandingkan kunci hardware menggunakan perbandingan SHA-256 konstan (`crypto.timingSafeEqual`) untuk menangkal timing attack.
- **Rate Limiting:** Endpoint telemetri dibatasi maksimal 120 req/menit, dan actuator manual feed/pump dibatasi maksimal 10 req/menit untuk mencegah keausan servo fisik.
- **Validasi Ketat:** Nilai pH non-numerik atau di luar 0–14 ditolak otomatis dengan HTTP 400.

---

## H. Hasil Pengujian yang Telah Dilakukan

| Komponen Pengujian | Metode Pengujian | Target / Objek | Hasil |
|---|---|---|---|
| **Unit Test Backend** | `npm test` di `server/` | 63 tes (Validator, Service, Endpoints, Auth, Security) | **63/63 LULUS (100%)** |
| **Siklus Lengkap Simulator IoT** | `simulatorIntegration.test.js` | Sync, Telemetri, Pending Command, Pelaporan Result | **LULUS (100%)** |
| **Keamanan Kunci Salah / Kosong** | `iotEndpoints.test.js` | Tembak endpoint tanpa header `X-Device-Key` | **Ditolak HTTP 401 (Lulus)** |
| **Pembersihan Data Dummy** | Verifikasi state repositori | Inisialisasi awal `fish-feeder-001` | **State bersih (pH: null, logs: [])** |
| **Build Frontend Produksi** | `npm run build` | Vite compiler & bundling React SPA | **Sukses (138ms, 0 error)** |
| **Linter Frontend** | `npm run lint` | ESLint JavaScript & React Hooks | **0 error, clean** |
| **Sinkronisasi Git** | `git push origin main` | Commit `4f1efec` dan `bb54f7c` ke GitHub | **Tersinkronisasi 100%** |

---

## I. Panduan Konfigurasi & Pengujian Perangkat Fisik

1. **Persiapan Firmware di Laptop:**
   - Buka Arduino IDE.
   - Buka berkas [`kode-ino/esp32capstone.ino`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/kode-ino/esp32capstone.ino).
   - Pastikan tab [`config.h`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/kode-ino/config.h) terbuka di sebelahnya.
   - Sesuaikan `WIFI_SSID` dan `WIFI_PASSWORD` dengan hotspot yang Anda gunakan.
   - Pastikan `DEVICE_ID` (`fish-feeder-001`) dan `DEVICE_KEY` (`pakan-ikan-secret-2026`) sudah sesuai.
2. **Unggah ke ESP32:**
   - Hubungkan kabel USB dari laptop ke board ESP32.
   - Pilih Board: *ESP32 Dev Module* (atau sesuai model ESP32 Anda).
   - Pilih Port COM/Serial yang sesuai.
   - Klik tombol **Upload**.
3. **Pengujian Operasional:**
   - Buka **Serial Monitor** pada kecepatan baud `115200`.
   - Amati log:
     - `[WiFi] SUKSES! Terhubung dengan jaringan.`
     - `[Nano TX] Kirim Perintah -> ...`
     - `[API Telemetri] Mengirim data pH ... -> Status: BERHASIL (HTTP 200)`
4. **Verifikasi pada Web / Aplikasi HP:**
   - Buka web browser atau aplikasi Android Pakan Ikan: `https://pakan-ikan.my.id`.
   - Login ke akun Anda.
   - Amati kartu Kualitas Air (pH): angka pH akan langsung berganti dari `--` ke nilai asli dari sensor kolam, dan status berubah menjadi hijau (Aman).
   - Tekan tombol **Beri Pakan**: servo pada alat kolam akan bergerak, dan di web akan muncul notifikasi sukses!
