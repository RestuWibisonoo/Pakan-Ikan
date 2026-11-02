# Panduan Arsitektur & Deployment Single-VM — Pakan Ikan

Dokumen ini mendokumentasikan spesifikasi teknis arsitektur single-VM (Virtual Machine tunggal) untuk menjalankan aplikasi web otomasi akuakultur **Pakan Ikan** di lingkungan produksi menggunakan Nginx dan Node.js Express.

---

## 1. Parameter Infrastruktur & Jaringan

| Parameter | Nilai / Konfigurasi | Keterangan |
|---|---|---|
| **Domain Publik** | `pakan-ikan.my.id` | Dikelola melalui Cloudflare DNS & Tunnel |
| **IP Internal VM** | `192.168.1.115` | Alamat IP lokal server di jaringan internal |
| **Ingress Cloudflare Tunnel** | `http://192.168.1.115:80` | Forwarding traffic publik HTTPS langsung ke port 80 VM |
| **Web Server / Reverse Proxy** | Nginx (Port 80) | Menyajikan aset statis SPA & reverse proxy API |
| **Backend API Service** | Node.js Express (Port 5000) | Terikat ketat pada interface loopback `127.0.0.1:5000` |
| **Frontend Static Files** | `/var/www/pakan-ikan/dist` | Hasil build produksi Vite React (`npm run build`) |
| **Backend Directory** | `/var/www/pakan-ikan/server` | Node.js Express backend |
| **Service Manager** | Systemd (`pakan-ikan-api.service`) | Daemon lifecycle, auto-restart, sandbox isolasi |
| **Identity Provider** | Firebase Authentication | Proyek `pakan-ikan-4c18e` (Email/Password) |
| **Database Operasional** | Firebase Realtime Database | `https://pakan-ikan-4c18e-default-rtdb.asia-southeast1.firebasedatabase.app` |

---

## 2. Diagram Alur Arsitektur

```
Internet (Pengguna & ESP32)
         │
         │  HTTPS: https://pakan-ikan.my.id
         ▼
  ┌────────────────────────────────────────────────────────┐
  │                   Cloudflare Edge                      │
  │     - Enkripsi SSL/TLS publik                          │
  │     - Perlindungan DDoS & WAF                          │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             │ Cloudflare Tunnel (Inbound)
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │            Host Virtual Machine (192.168.1.115)        │
  │                                                        │
  │  Nginx Reverse Proxy (:80)                             │
  │  ├── GET /                ─► Static Build SPA React    │
  │  │                           (/var/www/pakan-ikan/dist)│
  │  │                                                     │
  │  └── /api/*               ─► Reverse Proxy Loopback    │
  │      ├── /api/health                                   │
  │      ├── /api/auth/*                                   │
  │      └── /api/v1/*                                     │
  │                                    │                   │
  │                                    ▼ (Internal Only)   │
  │                      Node.js Express Backend           │
  │                      (127.0.0.1:5000)                  │
  │                      Kelolaan Systemd: pakan-ikan-api  │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             │ Firebase Admin SDK / REST
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Firebase Cloud Services                │
  │  ├── Firebase Authentication (Validasi ID Token)       │
  │  └── Firebase Realtime Database (asia-southeast1)      │
  └────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Prinsip Keamanan Port 5000:** Port 5000 Express **tidak boleh dibuka** ke firewall publik atau subnet eksternal. Node.js hanya mendengarkan loopback interface `127.0.0.1` (`HOST=127.0.0.1`), sehingga semua lalu lintas dari internet wajib melewati Nginx untuk verifikasi header, sanitasi, dan mitigasi DoS.

---

## 3. Konfigurasi Nginx (`deploy/nginx/pakan-ikan.conf`)

Konfigurasi Nginx terletak di [`deploy/nginx/pakan-ikan.conf`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/deploy/nginx/pakan-ikan.conf).

### Fitur Utama:
1. **Single-Origin Routing**: Seluruh request frontend dan backend berjalan di bawah origin yang sama (`https://pakan-ikan.my.id`). Frontend memanggil endpoint API secara relatif (`/api/...`), meniadakan masalah CORS (Cross-Origin Resource Sharing).
2. **SPA Fallback Routing**: Direktif `try_files $uri $uri/ /index.html;` memungkinkan routing client-side React Router (v7) bekerja mulus saat refresh halaman tanpa error 404.
3. **Penyaluran Header Aman**: Menyertakan `X-Real-IP`, `X-Forwarded-For`, `Authorization`, `X-Device-Key`, dan `X-Device-Id`.
4. **Caching Aset Statis**: File statis JavaScript, CSS, dan gambar yang di-hash diberi cache browser selama 1 tahun (`Cache-Control: public, immutable`).
5. **Kompresi Gzip**: Mengurangi ukuran transfer payload untuk koneksi internet berkecepatan rendah.

---

## 4. Konfigurasi Systemd (`deploy/systemd/pakan-ikan-api.service`)

Konfigurasi service terletak di [`deploy/systemd/pakan-ikan-api.service`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/deploy/systemd/pakan-ikan-api.service).

### Fitur Hardening & Ketahanan:
1. **Auto-Restart**: `Restart=always` dengan jeda `RestartSec=5` memastikan backend langsung pulih otomatis jika terjadi crash atau restart OS VM.
2. **Isolasi Keamanan (Sandbox)**:
   - `NoNewPrivileges=true`: Mencegah eskalasi hak akses.
   - `ProtectSystem=full`: Menjadikan direktori sistem (`/usr`, `/boot`, `/etc`) read-only bagi proses backend.
   - `ProtectHome=true`: Mengunci akses proses backend ke direktori `/home`.
   - `PrivateTmp=true`: Mengisolasi direktori `/tmp` proses dari pengguna lain.
3. **Resource Limits**: `LimitNOFILE=65535` untuk menangani banyak koneksi konkurensi dari sensor IoT ESP32.

---

## 5. Panduan Instalasi & Deployment di VM

### Langkah 1: Persiapan Direktori & Clone Repository
```bash
# Buat direktori aplikasi
sudo mkdir -p /var/www/pakan-ikan
sudo chown -R $USER:$USER /var/www/pakan-ikan

# Masuk ke direktori
cd /var/www/pakan-ikan

# Clone atau pull pembaruan kode
git clone https://github.com/RestuWibisonoo/Pakan-Ikan.git .
```

### Langkah 2: Build Static Frontend
```bash
# Install dependencies frontend
npm install

# Buat build produksi
npm run build

# Verifikasi folder dist berhasil terbentuk
ls -la /var/www/pakan-ikan/dist
```

### Langkah 3: Setup Backend Node.js
```bash
cd /var/www/pakan-ikan/server

# Install dependencies backend
npm install --omit=dev

# Buat file konfigurasi environment produksi
cp .env.example .env
nano .env
```

Pastikan variabel environment backend terisi dengan benar:
```env
NODE_ENV=production
HOST=127.0.0.1
PORT=5000
FRONTEND_URL=https://pakan-ikan.my.id
CORS_ORIGIN=https://pakan-ikan.my.id

# Firebase Production
FIREBASE_PROJECT_ID=pakan-ikan-4c18e
FIREBASE_API_KEY=AIzaSyDO4JXKcHrTcufS9LavNMLGhpwJxYbdUP8
FIREBASE_DATABASE_URL=https://pakan-ikan-4c18e-default-rtdb.asia-southeast1.firebasedatabase.app
FIREBASE_SERVICE_ACCOUNT_PATH=/var/www/pakan-ikan/server/serviceAccountKey.json

# ESP32 Shared Key
DEVICE_API_KEY=pakan-ikan-esp32-secret-2026
DEFAULT_DEVICE_ID=fish-feeder-001

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=katasandi.pakanikan@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM_NAME=Pakan Ikan
SMTP_FROM_EMAIL=katasandi.pakanikan@gmail.com
```

### Langkah 4: Pasang Konfigurasi Systemd
```bash
# Salin service unit ke systemd
sudo cp /var/www/pakan-ikan/deploy/systemd/pakan-ikan-api.service /etc/systemd/system/

# Berikan hak kepemilikan folder server ke user service (misal www-data)
sudo chown -R www-data:www-data /var/www/pakan-ikan/server

# Muat ulang systemd daemon
sudo systemctl daemon-reload

# Aktifkan dan jalankan service backend
sudo systemctl enable --now pakan-ikan-api

# Periksa status service
sudo systemctl status pakan-ikan-api
```

### Langkah 5: Pasang Konfigurasi Nginx
```bash
# Berikan hak baca pada folder dist
sudo chmod -R 755 /var/www/pakan-ikan/dist

# Salin konfigurasi Nginx
sudo cp /var/www/pakan-ikan/deploy/nginx/pakan-ikan.conf /etc/nginx/sites-available/pakan-ikan.conf

# Aktifkan situs (buat symlink)
sudo ln -sf /etc/nginx/sites-available/pakan-ikan.conf /etc/nginx/sites-enabled/

# Hapus default jika ada
sudo rm -f /etc/nginx/sites-enabled/default

# Uji sintaks Nginx
sudo nginx -t

# Muat ulang Nginx
sudo systemctl reload nginx
```

---

## 6. Prosedur Verifikasi & Health Check

Setelah deployment selesai, jalankan pengujian berikut dari terminal VM:

1. **Uji Loopback Backend Express:**
   ```bash
   curl -i http://127.0.0.1:5000/api/health
   # Diharapkan: HTTP 200 OK dengan {"status":"ok","app":"Pakan Ikan"}
   ```

2. **Uji Nginx Reverse Proxy ke Backend:**
   ```bash
   curl -i http://127.0.0.1/api/health
   # Diharapkan: HTTP 200 OK diteruskan oleh Nginx
   ```

3. **Uji Penyajian Frontend SPA oleh Nginx:**
   ```bash
   curl -i http://127.0.0.1/
   # Diharapkan: HTTP 200 OK menyajikan file index.html
   ```

4. **Uji Single-Cycle ESP32 Simulator Melalui Reverse Proxy:**
   ```bash
   node /var/www/pakan-ikan/tools/device-simulator/simulator.js --url=http://127.0.0.1/api/v1 --mode=once
   # Diharapkan: Siklus boot, telemetri, dan command polling berhasil
   ```

5. **Uji Domain Publik dari Eksternal:**
   ```bash
   curl -i https://pakan-ikan.my.id/api/health
   # Diharapkan: HTTP 200 OK melewati Cloudflare Tunnel dan Nginx
   ```

---

## 7. Pemantauan & Logging Operasional

- **Log Backend Express (Systemd Journal):**
  ```bash
  sudo journalctl -u pakan-ikan-api -f
  ```
- **Log Akses & Error Nginx:**
  ```bash
  sudo tail -f /var/log/nginx/access.log
  sudo tail -f /var/log/nginx/error.log
  ```

---

## 8. Prosedur Rollback Cepat

Jika pembaruan kode menyebabkan kegagalan kritis di produksi:

```bash
cd /var/www/pakan-ikan

# 1. Revert commit ke commit stabil sebelumnya
git reset --hard HEAD~1

# 2. Re-build frontend
npm run build

# 3. Restart backend service
sudo systemctl restart pakan-ikan-api

# 4. Verifikasi status
sudo systemctl status pakan-ikan-api
curl -i http://127.0.0.1/api/health
```
