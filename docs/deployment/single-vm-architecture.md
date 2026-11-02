# Panduan Arsitektur & Deployment Single-VM — Pakan Ikan (Server Inventory Aktual)

Dokumen ini adalah spesifikasi teknis dan panduan operasional (*deployment runbook*) resmi untuk implementasi sistem otomasi akuakultur **Pakan Ikan** pada server produksi aktual.

---

## 1. Inventaris Server & Infrastruktur Aktual

Berdasarkan hasil audit lingkungan server fisik/virtual per 2026-11-02:

| Parameter | Spesifikasi Aktual | Keterangan Operasional |
|---|---|---|
| **Sistem Operasi** | Ubuntu Server 22.04.5 LTS | 64-bit Linux Server |
| **Kernel** | 5.15.0-202-generic | Kernel standar Ubuntu LTS |
| **Virtualisasi** | KVM (Kernel-based Virtual Machine) | Hypervisor level-1 |
| **Hostname** | `pakan-ikan` | Nama host VM aplikasi |
| **Alamat IP Internal** | `192.168.1.115` | Terhubung ke LAN internal |
| **Domain Publik** | `pakan-ikan.my.id` | Dikelola via Cloudflare DNS & Tunnel |
| **RAM & Swap** | 2 GB RAM + 2 GB Swap | Total memori virtual 4 GB (cukup untuk build & runtime) |
| **Penyimpanan Virtual** | 32 GB Virtual Disk | LVM Partitioning |
| **Root Filesystem (`/`)** | 15 GB (tersedia ~6.8 GB) | Ruang kosong sangat mencukupi untuk Node & build |
| **LVM Volume Group** | ~15 GB Ruang Bebas (*unallocated*) | Dapat diperluas sewaktu-waktu jika diperlukan |
| **Node.js** | **v22.22.3** (Sudah terpasang) | **JANGAN diinstal ulang / ditimpa** |
| **npm** | **v10.9.8** (Sudah terpasang) | Paket manajer resmi bawaan Node 22 |
| **Web Server** | **Nginx v1.18.0** (Aktif & Berjalan) | Reverse proxy port 80 |
| **Version Control** | **Git v2.34.1** (Sudah terpasang) | Penarik kode dari repository GitHub |
| **Firewall (UFW)** | `inactive` (Nonaktif) | **Pertahankan nonaktif** untuk menjaga akses konektor |

---

## 2. Topologi Jaringan & Cloudflare Tunnel

```
Pengguna Internet & ESP32
          │
          │ HTTPS (https://pakan-ikan.my.id)
          ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                    Cloudflare Global Edge                   │
   │           - Enkripsi SSL/TLS publik gratis                  │
   │           - Perlindungan DDoS & Web Application Firewall    │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  │ Encrypted Inbound Tunnel
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │           Cloudflare Connector VM (VM Lain di LAN)          │
   │           - Menjalankan daemon 'cloudflared'                │
   │           - Published Application: http://192.168.1.115:80  │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  │ HTTP LAN Inbound (Port 80)
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │       Application VM: 'pakan-ikan' (IP: 192.168.1.115)       │
   │                                                             │
   │  Nginx Reverse Proxy (:80)                                  │
   │  ├── /                ─► Static React SPA Build             │
   │  │                       (/var/www/pakan-ikan/dist)         │
   │  │                                                          │
   │  └── /api/*           ─► Proxy Internal ke Loopback         │
   │      ├── /api/health                                        │
   │      ├── /api/auth/*                                        │
   │      └── /api/v1/*                                          │
   │                                  │                          │
   │                                  ▼ (127.0.0.1:5000)         │
   │                    Node.js Express Backend Daemon           │
   │                    Systemd: pakan-ikan-api.service          │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  │ REST / Admin SDK
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                   Firebase Cloud Services                   │
   │  ├── Firebase Authentication (ID Token & User Lifecycle)    │
   │  └── Firebase Realtime Database (asia-southeast1)           │
   └─────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Aturan Mutlak Cloudflare Tunnel:**
> 1. Connector Cloudflare Tunnel **TIDAK** berjalan di Application VM ini (berada pada VM lain di subnet LAN).
> 2. **JANGAN menginstal `cloudflared`** di VM `192.168.1.115`.
> 3. **JANGAN membuat tunnel baru** atau mengubah konfigurasi Published Application di Cloudflare Zero Trust.
> 4. Pastikan port 80 pada Application VM selalu menerima koneksi HTTP dari IP VM konektor Cloudflare.

> [!WARNING]
> **Kebijakan Port & Firewall:**
> - UFW saat ini berstatus `inactive`. **JANGAN mengaktifkan UFW** sebelum IP lokal VM konektor Cloudflare dan jalur SSH (`port 22`) didaftarkan ke allowlist, agar tidak memutus jalur akses publik dan administratif.
> - Port 5000 Express backend **hanya** mendengarkan interface internal loopback `127.0.0.1` (`HOST=127.0.0.1`). Port 5000 **tidak boleh** diekspos ke jaringan LAN maupun publik.

---

## 3. Kondisi Deployment Eksisting & Strategi Migrasi Aman

Di server saat ini:
- Direktori aplikasi: `/var/www/pakan-ikan` berisi file build website lama (`index.html`, `favicon.svg`, `icons.svg`, `assets/`).
- Konfigurasi Nginx: `/etc/nginx/sites-available/pakan-ikan` (disymlink ke `/etc/nginx/sites-enabled/pakan-ikan`).
- Direktori root Nginx lama: `/var/www/pakan-ikan`.

### Strategi Migrasi Tanpa Downtime & Nol Risiko Kehilangan Data:
1. **Pencadangan Total (*Full Backup*):** Sebelum menyentuh berkas apa pun, seluruh isi `/var/www/pakan-ikan` dicadangkan ke `/var/www/pakan-ikan_legacy_<timestamp>`.
2. **Pertahankan Backup:** Direktori backup lama **tidak boleh dihapus** sampai migrasi terbukti 100% berjalan normal.
3. **Penyajian dari Subdirektori `dist`:** Nginx diperbarui agar melayani file statis dari `/var/www/pakan-ikan/dist`, sementara Node.js Express backend berjalan dari `/var/www/pakan-ikan/server`.

---

## 4. Panduan Eksekusi Deployment di VM (Runbook Langkah-demi-Langkah)

Jalankan perintah berikut melalui sesi SSH pada server `192.168.1.115`:

### Langkah 1: Backup Website Eksisting
```bash
# 1. Catat timestamp dan buat salinan lengkap website lama
BACKUP_DIR="/var/www/pakan-ikan_legacy_$(date +%Y%m%d_%H%M%S)"
sudo cp -a /var/www/pakan-ikan "$BACKUP_DIR"

# 2. Verifikasi backup berhasil terbentuk
ls -la "$BACKUP_DIR"
```

### Langkah 2: Pengambilan Kode Sumber Repositori Baru
Setelah backup terverifikasi, pindahkan direktori lama ke lokasi cadangan tetap `/var/www/pakan-ikan_legacy`:
```bash
# 1. Pindahkan direktori lama ke lokasi cadangan tetap
sudo mv /var/www/pakan-ikan /var/www/pakan-ikan_legacy

# 2. Clone repositori Pakan-Ikan dari GitHub ke /var/www/pakan-ikan
sudo git clone https://github.com/RestuWibisonoo/Pakan-Ikan.git /var/www/pakan-ikan

# 3. Atur kepemilikan direktori ke pengguna saat ini
sudo chown -R $USER:$USER /var/www/pakan-ikan
```

### Langkah 3: Build Frontend React SPA
```bash
cd /var/www/pakan-ikan

# Install dependensi frontend (Node.js 22 & npm 10 sudah siap)
npm install

# Jalankan build produksi Vite
npm run build

# Verifikasi folder dist berhasil terbentuk dengan index.html dan assets/
ls -la /var/www/pakan-ikan/dist
```

### Langkah 4: Setup Backend Express Node.js & Kredensial
```bash
cd /var/www/pakan-ikan/server

# Install dependensi produksi backend saja (hemat memori dan disk)
npm install --omit=dev

# Buat berkas environment produksi
cp .env.example .env
nano .env
```

Pastikan konfigurasi `.env` pada server berisi:
```env
# ==============================================================================
# Pakan Ikan Server - Environment Produksi VM 192.168.1.115
# ==============================================================================
NODE_ENV=production
HOST=127.0.0.1
PORT=5000
FRONTEND_URL=https://pakan-ikan.my.id
CORS_ORIGIN=https://pakan-ikan.my.id

# Firebase Production (Project pakan-ikan-4c18e)
FIREBASE_PROJECT_ID=pakan-ikan-4c18e
FIREBASE_API_KEY=AIzaSyDO4JXKcHrTcufS9LavNMLGhpwJxYbdUP8
FIREBASE_DATABASE_URL=https://pakan-ikan-4c18e-default-rtdb.asia-southeast1.firebasedatabase.app
FIREBASE_SERVICE_ACCOUNT_PATH=/var/www/pakan-ikan/server/serviceAccountKey.json

# ESP32 Shared Key Header (Wajib string acak entropi tinggi minimal 32 karakter)
DEVICE_API_KEY=ganti_dengan_kunci_acak_min_32_karakter_aman
DEFAULT_DEVICE_ID=fish-feeder-001

# SMTP Email (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=katasandi.pakanikan@gmail.com
SMTP_PASS=ganti-dengan-app-password-16-digit
SMTP_FROM_NAME=Pakan Ikan
SMTP_FROM_EMAIL=katasandi.pakanikan@gmail.com

# Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100
```

> [!IMPORTANT]
> Letakkan file `serviceAccountKey.json` dari Firebase Console secara aman di `/var/www/pakan-ikan/server/serviceAccountKey.json`:
> ```bash
> chmod 600 /var/www/pakan-ikan/server/serviceAccountKey.json
> ```

### Langkah 5: Pemasangan Systemd Service Backend
```bash
# 1. Berikan kepemilikan folder server ke user service www-data
sudo chown -R www-data:www-data /var/www/pakan-ikan/server

# 2. Pasang unit file systemd
sudo cp /var/www/pakan-ikan/deploy/systemd/pakan-ikan-api.service /etc/systemd/system/pakan-ikan-api.service

# 3. Reload daemon dan jalankan service
sudo systemctl daemon-reload
sudo systemctl enable --now pakan-ikan-api

# 4. Periksa status dan pastikan berstatus 'active (running)'
sudo systemctl status pakan-ikan-api
```

### Langkah 6: Pembaruan Konfigurasi Nginx
```bash
# 1. Pastikan izin baca pada file dist
sudo chmod -R 755 /var/www/pakan-ikan/dist

# 2. Salin konfigurasi Nginx baru ke lokasi eksisting
sudo cp /var/www/pakan-ikan/deploy/nginx/pakan-ikan /etc/nginx/sites-available/pakan-ikan

# 3. Pastikan symlink aktif di sites-enabled
sudo ln -sf /etc/nginx/sites-available/pakan-ikan /etc/nginx/sites-enabled/pakan-ikan

# 4. Hapus site default Ubuntu jika masih aktif
sudo rm -f /etc/nginx/sites-enabled/default

# 5. Uji sintaks konfigurasi Nginx
sudo nginx -t

# 6. Jika sintaks lolos, muat ulang Nginx tanpa memutus koneksi aktif
sudo systemctl reload nginx
```

---

## 5. Prosedur Pengujian & Verifikasi Menyeluruh

Lakukan pengujian langsung dari shell server VM `pakan-ikan`:

1. **Uji Internal Loopback Express (Port 5000):**
   ```bash
   curl -i http://127.0.0.1:5000/api/health
   # Diharapkan: HTTP 200 OK dengan {"status":"ok","app":"Pakan Ikan"}
   ```

2. **Uji Reverse Proxy Nginx (Port 80 Lokal):**
   ```bash
   curl -i http://127.0.0.1/api/health
   # Diharapkan: HTTP 200 OK diteruskan oleh Nginx ke port 5000
   ```

3. **Uji Penyajian Frontend SPA React oleh Nginx:**
   ```bash
   curl -i http://127.0.0.1/
   # Diharapkan: HTTP 200 OK dengan isi dokumen HTML React Pakan Ikan
   ```

4. **Uji Siklus Penuh Simulator Virtual ESP32:**
   ```bash
   node /var/www/pakan-ikan/tools/device-simulator/simulator.js --url=http://127.0.0.1/api/v1 --mode=once
   # Diharapkan: Boot sync, telemetri, command queueing, dan pelaporan selesai dengan sukses
   ```

5. **Uji Akses Publik via Cloudflare Tunnel (dari Luar Server):**
   ```bash
   curl -i https://pakan-ikan.my.id/api/health
   # Diharapkan: HTTP 200 OK melalui Cloudflare Tunnel Connector VM
   ```

---

## 6. Prosedur Rollback Cepat & Terverifikasi (< 60 Detik)

Jika dalam pengujian pasca-deployment ditemukan kendala kritis pada sistem baru:

```bash
# 1. Hentikan service backend baru
sudo systemctl stop pakan-ikan-api
sudo systemctl disable pakan-ikan-api

# OPSI A (Terkonfigurasi Instan via Nginx - Tanpa Copy File):
# Kembalikan root Nginx langsung ke direktori backup website lama
sudo sed -i 's|root /var/www/pakan-ikan/dist;|root /var/www/pakan-ikan_legacy;|g' /etc/nginx/sites-available/pakan-ikan
sudo nginx -t && sudo systemctl reload nginx

# OPSI B (Restorasi Penuh Struktur Filesystem):
# Hapus build baru dan salin kembali berkas lama dari /var/www/pakan-ikan_legacy
sudo rm -rf /var/www/pakan-ikan
sudo cp -a /var/www/pakan-ikan_legacy /var/www/pakan-ikan
sudo sed -i 's|root /var/www/pakan-ikan/dist;|root /var/www/pakan-ikan;|g' /etc/nginx/sites-available/pakan-ikan
sudo nginx -t && sudo systemctl reload nginx
```
Website lama akan kembali aktif secara instan dan aman dari salinan `/var/www/pakan-ikan_legacy`.
