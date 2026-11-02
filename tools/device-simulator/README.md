# Pakan Ikan — ESP32 Virtual Hardware Simulator

Simulator perangkat keras virtual mandiri berbasis Node.js untuk merepresentasikan mikrokontroler ESP32 pada sistem otomasi akuakultur **Pakan Ikan**.

Simulator ini digunakan untuk pengujian fungsionalitas end-to-end tanpa memerlukan ESP32 fisik secara langsung.

---

## 1. Kemampuan & Fitur Simulator

1. **Boot Sync (`GET /api/v1/device/sync`)**: Mengambil konfigurasi awal, jadwal pakan aktif, dan ambang batas sensor pH dari backend saat startup.
2. **Pengiriman Telemetri Sensor (`POST /api/v1/device/telemetry`)**:
   - Menghasilkan nilai pH air dengan fluktuasi alami (rentang aman 6.8 - 7.6).
   - Menghasilkan data suhu air (~28°C), persentase sisa pakan, status relay pompa, dan uptime perangkat.
3. **Polling Antrean Perintah (`GET /api/v1/device/commands/pending`)**:
   - Memeriksa antrean perintah FIFO pakan manual (`feed`) atau kontrol pompa aerasi (`pump`).
4. **Simulasi Aktuator Fisik**:
   - Mensimulasikan delay rotasi motor servo pakan dan pengurangan pakan.
   - Mensimulasikan perpindahan relay pompa sirkulasi/aerator.
5. **Pelaporan Eksekusi (`POST /api/v1/device/commands/:id/result`)**:
   - Melaporkan kembali status penyelesaian (`completed` / `failed`) dengan pesan detail operasional.
6. **Simulasi Kondisi Kegagalan**:
   - Mode autentikasi gagal (penolakan kunci salah).
   - Mode payload korup (validasi nilai pH di luar rentang).
   - Mode offline (simulasi pemadaman listrik / jaringan terputus untuk memvalidasi heartbeat timeout backend 45 detik).

---

## 2. Persyaratan

- Node.js versi 18 atau lebih baru.
- Backend Pakan Ikan berjalan (misal: `http://127.0.0.1:5000` atau melalui Nginx reverse proxy `http://127.0.0.1:80`).

---

## 3. Cara Penggunaan

### A. Menjalankan Mode Normal (Continuous Loop)

```bash
# Menghubungkan ke backend lokal default (127.0.0.1:5000)
node tools/device-simulator/simulator.js

# Mengubah interval pengiriman telemetri (misal: setiap 5 detik)
node tools/device-simulator/simulator.js --interval=5

# Menghubungkan ke URL reverse proxy Nginx
node tools/device-simulator/simulator.js --url=http://127.0.0.1/api/v1
```

### B. Menjalankan Satu Siklus Pengujian (Mode Once — CI/Testing)

Sangat berguna untuk skrip verifikasi otomatis atau integrasi backend:

```bash
node tools/device-simulator/simulator.js --mode=once
```

### C. Menjalankan Pengujian Penolakan Autentikasi

Memastikan backend menolak request jika kunci rahasia perangkat tidak cocok (HTTP 401):

```bash
node tools/device-simulator/simulator.js --mode=unauthorized
```

### D. Menjalankan Pengujian Validasi Data

Memastikan validator backend menolak data telemetri yang di luar batas fisik (HTTP 400):

```bash
node tools/device-simulator/simulator.js --mode=invalid-payload
```

### E. Menjalankan Simulasi Deteksi Perangkat Mati (Offline Timeout)

Mengirim satu telemetri kemudian mematikan proses, untuk menguji deteksi otomatis status `Offline` pada dashboard web setelah 45 detik tidak ada sinyal:

```bash
node tools/device-simulator/simulator.js --mode=offline
```

---

## 4. Parameter Konfigurasi Lengkap

| Parameter CLI | Variabel Environment | Default | Keterangan |
|---|---|---|---|
| `--url` | `API_URL` | `http://127.0.0.1:5000/api/v1` | URL basis endpoint IoT backend |
| `--key` | `DEVICE_KEY` | `(wajib ditentukan di produksi)` | Kunci rahasia shared secret ESP32 (minimal 32 karakter acak) |
| `--device-id` | `DEVICE_ID` | `fish-feeder-001` | Identifier perangkat keras |
| `--interval` | `INTERVAL_SEC` | `10` | Jeda antar telemetri dalam detik |
| `--mode` | `SIMULATOR_MODE` | `loop` | `loop`, `once`, `unauthorized`, `invalid-payload`, `offline` |

---

## 5. Hubungan dengan Firmware ESP32 Asli

Struktur payload, header HTTP (`X-Device-Key`, `X-Device-Id`), dan urutan siklus request pada simulator ini 100% identik dengan alur kerja firmware C++/Arduino pada ESP32 fisik. Simulator ini menjadi rujukan kontrak komunikasi antarmuka (API contract) bagi pengembangan firmware mikrokontroler.
