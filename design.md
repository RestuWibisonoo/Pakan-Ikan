# design.md
# Desain Sistem Web Mobile untuk Prototype Pakan Ikan Otomatis dan Monitoring pH

## 1. Ringkasan Sistem
Sistem yang akan dibuat adalah web mobile untuk mengontrol dan memantau prototype pemberian pakan ikan otomatis berbasis IoT. Web ini menggantikan rencana aplikasi Android native/APK agar pengembangan lebih sederhana, mudah diuji, dan tetap dapat digunakan melalui smartphone.

Fungsi utama sistem:

1. Menampilkan nilai pH air secara real-time.
2. Menampilkan status perangkat, seperti koneksi ESP32, status pompa, status servo, dan waktu pembaruan data terakhir.
3. Mengatur jadwal pemberian pakan otomatis.
4. Menjalankan kontrol manual untuk memberi pakan.
5. Menjalankan kontrol manual untuk mengaktifkan pompa penggantian air.
6. Menyimpan riwayat data pH dan riwayat aksi sistem.
7. Memberikan indikator kondisi pH, misalnya aman, terlalu asam, atau terlalu basa.

Sistem tetap mengikuti konsep awal proyek, yaitu integrasi antara ESP32, sensor pH, motor servo, pompa air, relay, dan antarmuka pengguna berbasis smartphone. Perbedaannya hanya pada antarmuka pengguna: dari APK menjadi web mobile/PWA.

## 2. Alasan Menggunakan Web Mobile
Penggunaan web mobile dipilih karena lebih sederhana dibandingkan pengembangan APK. Web dapat diakses langsung melalui browser smartphone tanpa instalasi aplikasi khusus. Selain itu, tampilan web dapat dibuat responsif sehingga tetap nyaman digunakan pada layar kecil.

Keuntungan web mobile:

- Tidak perlu build APK.
- Tidak perlu konfigurasi Android Studio.
- Mudah diuji di laptop dan smartphone.
- Dapat di-hosting secara online.
- Dapat dikembangkan menjadi PWA agar tampil seperti aplikasi.
- Cocok untuk dashboard monitoring dan kontrol IoT.

Batasan web mobile:

- Membutuhkan koneksi internet jika sistem menggunakan cloud.
- Fitur hardware smartphone tidak sedalam APK native.
- Perlu memperhatikan keamanan akses karena web dapat dibuka dari browser.

## 3. Aktor Sistem
### 3.1 Pengguna
Pengguna adalah pemilik ikan, penghobi ikan, atau pembudidaya kecil yang ingin memantau pH air dan mengontrol pemberian pakan melalui smartphone.

Hak akses pengguna:

- Melihat data pH terbaru.
- Melihat status alat.
- Mengatur jadwal pakan.
- Menekan tombol beri pakan manual.
- Menekan tombol aktifkan pompa manual.
- Melihat riwayat data dan aktivitas.

### 3.2 Perangkat ESP32
ESP32 bertindak sebagai pengendali utama hardware.

Tugas ESP32:

- Membaca nilai sensor pH.
- Mengirim nilai pH ke server/cloud.
- Membaca perintah dari server/cloud.
- Menggerakkan motor servo untuk pemberian pakan.
- Mengaktifkan relay untuk pompa air.
- Mengirim status perangkat setelah perintah dijalankan.

### 3.3 Admin/Developer
Admin atau developer bertugas mengelola konfigurasi sistem, melakukan debugging, dan memantau apakah data dari ESP32 masuk dengan benar.

## 4. Ruang Lingkup Sistem
### 4.1 Termasuk dalam Sistem
- Dashboard web mobile.
- Monitoring pH real-time.
- Indikator kondisi pH.
- Kontrol manual pakan.
- Kontrol manual pompa.
- Pengaturan jadwal pakan.
- Riwayat pembacaan pH.
- Riwayat aksi kontrol.
- Integrasi data ESP32 dengan server/cloud.

### 4.2 Tidak Termasuk dalam Sistem Tahap Awal
- Aplikasi Android native/APK.
- Sistem multi-kolam yang kompleks.
- Pembayaran atau fitur bisnis.
- Machine learning untuk prediksi kualitas air.
- Kontrol otomatis penuh untuk penetralan pH menggunakan bahan kimia.
- Kamera monitoring ikan.

## 5. Arsitektur Sistem
Arsitektur sistem menggunakan konsep IoT berbasis cloud. Web mobile digunakan oleh pengguna untuk membaca data dan mengirim perintah. ESP32 membaca sensor dan menjalankan perintah berdasarkan data yang tersedia di server/cloud.

```text
[Sensor pH] ---> [ESP32] ---> [Cloud/Database/API] ---> [Web Mobile]
                   |                    ^                  |
                   |                    |                  |
                   +----> [Servo]       +---- [Command] <--+
                   +----> [Relay]
                   +----> [Pompa Air]
```

Alur monitoring:

1. Sensor pH membaca kondisi air.
2. ESP32 memproses nilai pH.
3. ESP32 mengirim data pH ke cloud/server.
4. Web mobile mengambil data terbaru.
5. Pengguna melihat nilai pH, status, dan riwayat.

Alur kontrol manual:

1. Pengguna menekan tombol beri pakan atau aktifkan pompa di web.
2. Web mengirim command ke cloud/server.
3. ESP32 membaca command terbaru.
4. ESP32 menjalankan servo atau relay.
5. ESP32 mengirim status eksekusi.
6. Web menampilkan hasil perintah kepada pengguna.

## 6. Rekomendasi Teknologi
### 6.1 Frontend Web Mobile
Rekomendasi:

- HTML, CSS, JavaScript untuk versi paling sederhana.
- React + Vite jika ingin struktur lebih rapi dan modern.
- Tailwind CSS jika ingin styling cepat.
- PWA optional agar web bisa ditambahkan ke home screen smartphone.

### 6.2 Backend/Cloud
Opsi yang disarankan untuk capstone:

1. Firebase Realtime Database
   - Cocok untuk data real-time.
   - Web mudah membaca perubahan data.
   - ESP32 dapat mengirim/mengambil data melalui HTTP.

2. Node.js + Express + MySQL/PostgreSQL
   - Cocok jika ingin backend sendiri.
   - Lebih fleksibel tetapi setup lebih banyak.

3. MQTT Broker + Web Dashboard
   - Cocok untuk IoT real-time.
   - Perlu pemahaman MQTT dan broker.

Rekomendasi utama: gunakan Firebase Realtime Database karena lebih cepat untuk prototype dan cocok dengan kebutuhan monitoring real-time.

### 6.3 Firmware ESP32
ESP32 menjalankan firmware untuk:

- Koneksi Wi-Fi.
- Pembacaan sensor pH.
- Pengiriman data pH ke database/cloud.
- Pembacaan command dari cloud.
- Kontrol servo dan relay.
- Pengiriman log aktivitas.

## 7. Modul Utama Web
### 7.1 Halaman Dashboard
Isi halaman:

- Nilai pH terbaru.
- Status pH: Aman, Asam, atau Basa.
- Status koneksi perangkat.
- Status pompa: ON/OFF.
- Status servo/pakan: siap/berjalan.
- Waktu update terakhir.
- Tombol beri pakan manual.
- Tombol aktifkan pompa manual.

### 7.2 Halaman Jadwal Pakan
Isi halaman:

- Daftar jadwal pemberian pakan.
- Tambah jadwal baru.
- Edit jadwal.
- Hapus jadwal.
- Status jadwal aktif/nonaktif.

Contoh jadwal:

- Pagi: 07.00
- Sore: 17.00

### 7.3 Halaman Riwayat pH
Isi halaman:

- Tabel riwayat nilai pH.
- Waktu pembacaan.
- Status pH.
- Grafik sederhana perubahan pH.

### 7.4 Halaman Riwayat Aksi
Isi halaman:

- Riwayat pemberian pakan otomatis.
- Riwayat pemberian pakan manual.
- Riwayat aktivasi pompa.
- Status berhasil/gagal.
- Waktu eksekusi.

### 7.5 Halaman Pengaturan
Isi halaman:

- Batas pH minimum.
- Batas pH maksimum.
- Durasi servo terbuka.
- Durasi pompa menyala.
- Nama perangkat.
- Token perangkat atau kode autentikasi sederhana.

## 8. Kebutuhan Fungsional
| Kode | Kebutuhan | Deskripsi |
|---|---|---|
| F-01 | Monitoring pH | Web menampilkan nilai pH terbaru dari ESP32. |
| F-02 | Status pH | Web memberi label kondisi pH: aman, asam, atau basa. |
| F-03 | Kontrol pakan manual | Pengguna dapat menekan tombol untuk mengaktifkan servo pemberi pakan. |
| F-04 | Kontrol pompa manual | Pengguna dapat menekan tombol untuk mengaktifkan pompa air. |
| F-05 | Jadwal pakan | Pengguna dapat menambah, mengubah, dan menghapus jadwal pakan. |
| F-06 | Riwayat pH | Sistem menyimpan dan menampilkan riwayat pembacaan pH. |
| F-07 | Riwayat aksi | Sistem menyimpan aktivitas pakan dan pompa. |
| F-08 | Status perangkat | Web menampilkan apakah ESP32 online atau offline. |
| F-09 | Konfigurasi batas pH | Pengguna dapat mengatur batas pH minimum dan maksimum. |
| F-10 | Notifikasi visual | Web menampilkan peringatan jika pH berada di luar batas aman. |

## 9. Kebutuhan Non-Fungsional
| Kode | Kebutuhan | Deskripsi |
|---|---|---|
| NF-01 | Responsif | Tampilan nyaman digunakan pada layar smartphone. |
| NF-02 | Real-time | Data pH diperbarui berkala, misalnya setiap 5–10 detik. |
| NF-03 | Mudah digunakan | Tombol utama harus jelas dan mudah dijangkau. |
| NF-04 | Aman | Kontrol pompa dan pakan tidak boleh dapat diakses sembarang orang. |
| NF-05 | Stabil | Sistem tetap menyimpan log meskipun ada command gagal. |
| NF-06 | Ringan | Web tidak menggunakan fitur berat agar dapat diakses di jaringan terbatas. |
| NF-07 | Terukur | Data pH dan aktivitas memiliki timestamp agar mudah dianalisis. |

## 10. Struktur Data
Contoh struktur data jika menggunakan Firebase Realtime Database:

```json
{
  "devices": {
    "fish-feeder-001": {
      "status": {
        "online": true,
        "last_seen": "2026-06-14T14:00:00+07:00",
        "ph": 7.2,
        "ph_status": "aman",
        "pump_status": "off",
        "servo_status": "idle"
      },
      "settings": {
        "ph_min": 6.5,
        "ph_max": 8.5,
        "feed_duration_ms": 1000,
        "pump_duration_ms": 5000
      },
      "schedules": {
        "schedule_001": {
          "time": "07:00",
          "active": true
        },
        "schedule_002": {
          "time": "17:00",
          "active": true
        }
      },
      "commands": {
        "latest": {
          "id": "cmd_001",
          "type": "feed",
          "status": "pending",
          "created_at": "2026-06-14T14:01:00+07:00"
        }
      },
      "logs": {
        "ph_logs": {},
        "action_logs": {}
      }
    }
  }
}
```

## 11. Desain API/Command
Jika menggunakan backend sendiri, endpoint minimal yang dibutuhkan adalah:

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/status` | Mengambil status terbaru perangkat. |
| POST | `/api/ph` | ESP32 mengirim data pH terbaru. |
| POST | `/api/command/feed` | Web mengirim perintah beri pakan. |
| POST | `/api/command/pump` | Web mengirim perintah aktifkan pompa. |
| GET | `/api/schedules` | Mengambil daftar jadwal pakan. |
| POST | `/api/schedules` | Menambah jadwal pakan. |
| PUT | `/api/schedules/:id` | Mengubah jadwal pakan. |
| DELETE | `/api/schedules/:id` | Menghapus jadwal pakan. |
| GET | `/api/logs/ph` | Mengambil riwayat pH. |
| GET | `/api/logs/actions` | Mengambil riwayat aksi. |

Jika memakai Firebase, endpoint backend tidak wajib dibuat karena web dan ESP32 dapat langsung membaca/menulis data ke database sesuai aturan akses.

## 12. Logika Kondisi pH
Rentang pH awal yang digunakan:

- pH < 6.5: terlalu asam.
- 6.5 <= pH <= 8.5: aman.
- pH > 8.5: terlalu basa.

Logika tampilan web:

```text
Jika pH < ph_min:
  tampilkan status "Terlalu Asam"
  tampilkan peringatan

Jika ph_min <= pH <= ph_max:
  tampilkan status "Aman"

Jika pH > ph_max:
  tampilkan status "Terlalu Basa"
  tampilkan peringatan
```

Pada tahap awal, sistem tidak perlu langsung menyalakan pompa otomatis ketika pH tidak aman. Web cukup memberikan peringatan, lalu pengguna dapat mengaktifkan pompa secara manual. Pendekatan ini lebih aman untuk prototype karena penggantian air tetap dikendalikan oleh pengguna.

## 13. Logika Pakan Otomatis
Pemberian pakan otomatis berjalan berdasarkan jadwal.

Alur:

1. ESP32 membaca waktu saat ini.
2. ESP32 membandingkan waktu dengan daftar jadwal aktif.
3. Jika waktu sesuai jadwal, servo membuka katup pakan.
4. Servo terbuka selama durasi tertentu.
5. Servo kembali ke posisi awal.
6. ESP32 mengirim log bahwa pakan sudah diberikan.

## 14. Logika Manual Override
Manual override adalah fitur yang memungkinkan pengguna menjalankan aksi langsung dari web.

Jenis command:

- `feed`: mengaktifkan servo untuk memberi pakan.
- `pump_on`: mengaktifkan pompa untuk durasi tertentu.
- `pump_off`: mematikan pompa jika diperlukan.

Alur manual override:

1. Pengguna menekan tombol di web.
2. Web membuat command dengan status `pending`.
3. ESP32 membaca command.
4. ESP32 menjalankan perintah.
5. ESP32 mengubah status command menjadi `done` atau `failed`.
6. Web menampilkan status hasil eksekusi.

## 15. Desain Tampilan Mobile
### 15.1 Layout Dashboard
Prioritas tampilan dashboard:

1. Card nilai pH besar di bagian atas.
2. Badge status pH.
3. Status perangkat online/offline.
4. Tombol aksi cepat: Beri Pakan dan Aktifkan Pompa.
5. Ringkasan jadwal pakan berikutnya.
6. Grafik mini riwayat pH.

Contoh struktur tampilan:

```text
+--------------------------------+
| FishFeeder IoT                 |
| pH Saat Ini                    |
| 7.2                            |
| Status: Aman                   |
+--------------------------------+
| Perangkat: Online              |
| Update: 14:00                  |
+--------------------------------+
| [Beri Pakan] [Aktifkan Pompa]  |
+--------------------------------+
| Jadwal berikutnya: 17:00       |
+--------------------------------+
| Grafik pH                      |
+--------------------------------+
```

### 15.2 Navigasi
Navigasi bawah cocok untuk web mobile:

- Dashboard
- Jadwal
- Riwayat
- Pengaturan

## 16. Keamanan Sistem
Agar web tidak bisa digunakan sembarang orang, sistem perlu memiliki pengamanan dasar:

1. Login sederhana untuk pengguna.
2. Token perangkat untuk ESP32.
3. Validasi command agar perintah tidak dieksekusi berulang.
4. Batas durasi pompa agar pompa tidak menyala terlalu lama.
5. Tombol konfirmasi sebelum mengaktifkan pompa.
6. Aturan akses database jika menggunakan Firebase.

## 17. Pengujian Sistem
### 17.1 Pengujian Web
- Web dapat dibuka di smartphone.
- Tampilan responsif pada layar kecil.
- Tombol pakan dan pompa dapat ditekan.
- Data pH terbaru muncul di dashboard.
- Riwayat pH tampil dengan benar.

### 17.2 Pengujian ESP32
- ESP32 dapat terhubung ke Wi-Fi.
- ESP32 dapat mengirim data pH.
- ESP32 dapat membaca command.
- Servo bergerak sesuai perintah.
- Relay dapat mengaktifkan pompa.
- Status command berubah setelah dieksekusi.

### 17.3 Pengujian Integrasi
- Data pH dari sensor muncul di web.
- Command dari web dijalankan oleh ESP32.
- Riwayat aksi tersimpan setelah perintah dijalankan.
- Status online/offline perangkat berubah sesuai kondisi koneksi.

## 18. Risiko dan Mitigasi
| Risiko | Dampak | Mitigasi |
|---|---|---|
| Koneksi internet tidak stabil | Data terlambat masuk | Tampilkan last update dan status offline. |
| Command terkirim dua kali | Servo/pompa aktif berulang | Gunakan command ID dan status pending/done. |
| Sensor pH tidak akurat | Monitoring keliru | Lakukan kalibrasi sensor pH. |
| Pompa menyala terlalu lama | Air berkurang berlebihan | Batasi durasi pompa dan gunakan konfirmasi. |
| Web dibuka orang lain | Kontrol tidak aman | Gunakan login/token. |

## 19. Rencana Implementasi
Tahap implementasi yang disarankan:

1. Membuat struktur database/cloud.
2. Membuat tampilan dashboard web mobile.
3. Membuat fitur monitoring pH real-time.
4. Membuat fitur tombol beri pakan manual.
5. Membuat fitur tombol aktifkan pompa manual.
6. Membuat fitur jadwal pakan.
7. Membuat riwayat pH dan riwayat aksi.
8. Menghubungkan ESP32 dengan cloud/server.
9. Melakukan pengujian sensor, servo, relay, dan pompa.
10. Melakukan pengujian integrasi web dengan hardware.

## 20. Kesimpulan Desain
Sistem web mobile menjadi pilihan yang realistis untuk prototype karena lebih mudah dikembangkan dibandingkan APK, tetapi tetap memenuhi kebutuhan utama proyek, yaitu monitoring pH air secara real-time dan kontrol perangkat melalui smartphone. Dengan arsitektur berbasis ESP32, cloud/database, dan web mobile, sistem dapat mendukung pemberian pakan otomatis berbasis jadwal, kontrol manual pakan, kontrol manual pompa, serta pencatatan riwayat data. Desain ini tetap sinkron dengan tujuan awal capstone, namun lebih sederhana dari sisi pengembangan perangkat lunak.
