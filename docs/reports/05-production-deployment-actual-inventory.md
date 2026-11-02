# Laporan Tugas 05: Penyesuaian Arsitektur & Runbook Deployment Berdasarkan Inventaris Server Aktual

## A. Informasi Tugas
- **Nomor Tugas:** 05
- **Judul Tugas:** Adaptasi Arsitektur, Keamanan Jaringan, dan Runbook Deployment Berdasarkan Inventaris Server Aktual
- **Tanggal Eksekusi:** 2026-11-02
- **Cakupan:** Infrastruktur produksi VM (`192.168.1.115`), konfigurasi Nginx reverse proxy, service manager systemd, migrasi berkas website lama, integrasi Cloudflare Tunnel eksternal, dan prosedur rollback.
- **Objektif:** Menyelaraskan seluruh spesifikasi teknis dan panduan deployment dengan kondisi server riil Ubuntu 22.04.5 LTS (KVM), Node.js 22.22.3, Nginx 1.18.0, memori 2 GB RAM, website lama di `/var/www/pakan-ikan`, serta konektor Cloudflare yang berjalan pada VM lain di LAN.

---

## B. Kondisi Awal Server Aktual (Server Inventory)

Berdasarkan audit kondisi server yang telah diautentikasi oleh tim sistem:

| Komponen | Status & Nilai Aktual | Implikasi Teknis |
|---|---|---|
| **OS & Kernel** | Ubuntu Server 22.04.5 LTS, Kernel 5.15.0-202-generic | Sistem stabil LTS, didukung penuh oleh Node.js dan systemd. |
| **Virtualisasi** | KVM, Hostname: `pakan-ikan` | Virtual machine mandiri di dalam klaster hypervisor. |
| **Alamat IP** | `192.168.1.115` | Terhubung ke LAN internal; target dari Cloudflare connector. |
| **RAM & Swap** | 2 GB RAM + 2 GB Swap | Total memori 4 GB virtual. Memerlukan optimasi instalasi (`npm install --omit=dev` pada backend). |
| **Storage / Disk** | Virtual disk 32 GB, Root `/` 15 GB (tersedia ~6.8 GB), LVM unallocated ~15 GB | Kapasitas disk sangat mencukupi untuk menyimpan build, backup, dan log. |
| **Node.js & npm** | Node.js v22.22.3, npm v10.9.8 | Sudah terpasang. **Tidak perlu instalasi ulang Node.js.** |
| **Web Server** | Nginx v1.18.0 | Berjalan aktif pada port 80 dan lolos uji sintaks `nginx -t`. |
| **Git** | Git v2.34.1 | Sudah terpasang untuk proses pull/clone repository. |
| **Situs Eksisting** | Berkas website lama berada di `/var/www/pakan-ikan` (`index.html`, `favicon.svg`, `icons.svg`, `assets/`) | **Wajib di-backup** sebelum diganti, dan tidak boleh dihapus sampai pengujian tuntas. |
| **Konfigurasi Nginx Eksisting** | `/etc/nginx/sites-available/pakan-ikan` disymlink ke `/etc/nginx/sites-enabled/pakan-ikan` | Menggunakan penamaan file situs tanpa ekstensi `.conf`. Root lama mengarah langsung ke `/var/www/pakan-ikan`. |
| **Cloudflare Tunnel** | Berjalan pada VM terpisah di jaringan LAN, meneruskan traffic ke `http://192.168.1.115:80` | **Dilarang memasang `cloudflared`** di VM ini. Tidak boleh mengubah tunnel atau target origin. |
| **Firewall (UFW)** | `inactive` (Nonaktif) | **Pertahankan nonaktif** untuk mencegah pemutusan koneksi SSH dan Cloudflare connector VM. |

---

## C. Keputusan Desain & Arsitektur Deployment

1. **Pencegahan Kehilangan Data (Zero Data Loss Migration):**
   - Direktori website lama `/var/www/pakan-ikan` dicadangkan secara menyeluruh ke `/var/www/pakan-ikan_legacy_<timestamp>` sebelum dilakukan perubahan apa pun.
   - Direktori cadangan dipertahankan secara permanen sebagai target failback instan.
2. **Penyelarasan Nginx Reverse Proxy Port 80:**
   - Berkas konfigurasi Nginx diperbarui di `/etc/nginx/sites-available/pakan-ikan` (sesuai nama eksisting server).
   - Root direktori frontend dialihkan ke subdirektori `/var/www/pakan-ikan/dist` untuk melayani build React SPA.
   - Endpoint `/api/*` diteruskan secara internal ke Express pada `http://127.0.0.1:5000`.
3. **Isolasi Backend Loopback & Systemd:**
   - Backend Express hanya mengikat antarmuka lokal `127.0.0.1:5000` via `HOST=127.0.0.1`.
   - Dikelola oleh systemd unit `/etc/systemd/system/pakan-ikan-api.service` di bawah pengguna `www-data` dengan perlindungan sandbox `ProtectSystem=full` dan `NoNewPrivileges=true`.
4. **Interkoneksi Cloudflare Tunnel:**
   - Mempertahankan topologi eksisting di mana daemon `cloudflared` pada VM lain meneruskan traffic publik `https://pakan-ikan.my.id` ke port 80 VM `192.168.1.115`.
   - Tidak ada paket `cloudflared` yang dipasang pada VM aplikasi, menjaga kebersihan sistem dan efisiensi memori 2 GB.
5. **Kebijakan Keamanan Port & Firewall:**
   - Port 5000 terisolasi strictly pada `127.0.0.1`.
   - Firewall UFW dipertahankan `inactive` sesuai instruksi, mencegah risiko lockout SSH dan terputusnya akses dari Cloudflare connector VM.

---

## D. Inventaris Perubahan Berkas (File Change Inventory)

| Berkas | Jenis Perubahan | Deskripsi Penyesuaian |
|---|---|---|
| `docs/deployment/single-vm-architecture.md` | Dimodifikasi | Diperbarui menyeluruh mencakup spesifikasi server aktual (Ubuntu 22.04 LTS, Node 22, 2GB RAM), diagram Cloudflare Tunnel eksternal, instruksi backup bertahap, runbook, dan prosedur rollback. |
| `deploy/nginx/pakan-ikan` | Dibuat | Konfigurasi Nginx reverse proxy yang dinamai sesuai konvensi server aktual (`/etc/nginx/sites-available/pakan-ikan`). |
| `deploy/nginx/pakan-ikan.conf` | Dimodifikasi | Konfigurasi reverse proxy diperbarui dengan dokumentasi topologi VM aktual dan direktif `default_server`. |
| `docs/reports/05-production-deployment-actual-inventory.md` | Dibuat | Laporan formal Tugas 05 mendokumentasikan adaptasi sistem terhadap inventaris server aktual. |
| `docs/WORK_LOG.md` | Dimodifikasi | Mencatat riwayat eksekusi Tugas 05 secara kronologis dan permanen. |

---

## E. Pengujian dan Validasi Faktual

| Pengujian | Perintah / Metode | Hasil Aktual | Keterangan |
|---|---|---|---|
| **Backend Unit & Integration Tests** | `cd server && npm test` | **51/51 Lulus (100%)** | Durasi ~200ms. Seluruh pengujian lolos tanpa kegagalan. |
| **Frontend Linter** | `npm run lint` | **0 errors, 0 warnings** | Memeriksa seluruh berkas React JSX, Hooks dependencies, dan server globals. |
| **Frontend Production Build** | `npm run build` | **Sukses (210ms)** | Menghasilkan direktori `dist/` siap deploy. |
| **Nginx Syntax Validation Simulation** | Penelusuran konfigurasi `deploy/nginx/pakan-ikan` | **Valid** | Format upstream, listen 80 default_server, proxy headers, and try_files valid. |
| **Virtual Hardware Simulator** | `tools/device-simulator/simulator.js` | **Lolos Penuh** | Mode `once`, `unauthorized`, dan `invalid-payload` terverifikasi. |

---

## F. Prosedur Rollback Cepat & Penilaian Risiko

Jika pembaruan sistem di server VM `192.168.1.115` mengalami kendala operasional:

1. **Hentikan Daemon Backend:**
   ```bash
   sudo systemctl stop pakan-ikan-api
   ```
2. **Kembalikan Berkas Website Lama:**
   Direktori `/var/www/pakan-ikan_legacy_<timestamp>` dapat dikembalikan atau disalin kembali ke `/var/www/pakan-ikan`.
3. **Kembalikan Konfigurasi Nginx:**
   Arahkan kembali direktif `root` pada `/etc/nginx/sites-available/pakan-ikan` ke direktori website lama dan jalankan `sudo systemctl reload nginx`.

Seluruh proses rollback dapat diselesaikan dalam waktu kurang dari 60 detik tanpa risiko kehilangan data historis.
