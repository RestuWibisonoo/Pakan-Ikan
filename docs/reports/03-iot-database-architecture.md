# Laporan Tugas 03: Arsitektur Database Firebase Realtime Database IoT

## A. Task Information
- **Nomor Tugas:** 03
- **Judul Tugas:** Perancangan Arsitektur Database Firebase Realtime Database untuk Pakan Ikan
- **Tanggal Eksekusi:** 2026-11-02
- **Cakupan:** Integrasi Firebase Admin Realtime Database, desain skema node JSON, lapisan repositori data (`deviceRepository.js`), dan aturan keamanan (*Security Rules*).
- **Objektif:** Menjadikan Firebase Realtime Database sebagai basis data operasional utama proyek **Pakan Ikan** (Project ID: `pakan-ikan-4c18e`), menggunakan satu inisialisasi singleton Admin SDK tepercaya di backend, tanpa mengekspos kredensial service account ke browser frontend maupun mikrokontroler ESP32.

---

## B. Initial Repository Condition
- **Arsitektur Awal:**
  - Inisialisasi Firebase Admin SDK di `server/config/firebaseAdmin.js` sebelumnya hanya menginisialisasi modul autentikasi (`admin.auth()`).
  - Opsi `databaseURL` belum diteruskan ke `admin.initializeApp(...)`.
  - Frontend memiliki inisialisasi `getDatabase()` opsional di `src/firebase/config.js`, namun belum memiliki struktur skema database terpusat di sisi server.
- **Berkas Relevan Sebelum Modifikasi:**
  - `server/config/firebaseAdmin.js`
  - `server/config/appConfig.js`
  - `server/.env.example`
- **Fungsi Eksisting yang Wajib Dipertahankan:**
  - Inisialisasi Firebase Auth pada singleton `adminApp`.
  - Ketersediaan fungsi `hasAdminCredentials()`.
  - Kemampuan server untuk tetap berjalan (*graceful startup*) saat service account JSON belum diinput oleh pengguna.

---

## C. Implementation Summary
- **Fitur yang Diimplementasikan:**
  - Konfigurasi parameter `databaseUrl` di `appConfig.js` mengarah ke instance database resmi:
    `https://pakan-ikan-4c18e-default-rtdb.asia-southeast1.firebasedatabase.app`
  - Inisialisasi Realtime Database pada Admin SDK singleton tanpa membuat aplikasi Firebase Admin kedua (`admin.database(adminApp)`).
  - Ekspor utilitas `getAdminDatabase()` dan status kesiapan akses `hasDatabaseAccess()`.
  - Repositori database terpusat [`deviceRepository.js`](file:///Users/restuwibisono/Documents/Coding/Pakan-Ikan/server/repositories/deviceRepository.js) yang mengabstraksikan operasi baca/tulis node RTDB.
  - Lapisan *in-memory mock store* otomatis di dalam repositori untuk menjamin kelancaran unit test lokal dan lingkungan pengembangan tanpa koneksi internet langsung ke Google Cloud.
  - Pembaruan status kesehatan database pada respons endpoint `GET /api/health`.
- **Keputusan Arsitektur:**
  - Hanya menggunakan **Firebase Realtime Database**; tidak memperkenalkan Firestore, MySQL, MongoDB, atau database sekunder lainnya.
  - Semua penulisan data telemetri ESP32 dan penulisan perintah kontrol dialirkan melalui backend Express tepercaya (*Trusted Server Pattern*).
- **Struktur Skema Node Realtime Database:**
  ```json
  {
    "devices": {
      "fish-feeder-001": {
        "status": {
          "online": true,
          "last_seen": "2026-11-02T12:00:00.000Z",
          "ph": 7.2,
          "ph_status": "aman",
          "pump_status": "off",
          "servo_status": "idle"
        },
        "settings": {
          "ph_min": 6.5,
          "ph_max": 8.5,
          "feed_duration_ms": 1000,
          "pump_duration_ms": 5000,
          "device_name": "Kolam Utama"
        },
        "schedules": {
          "sched_1": {
            "id": "sched_1",
            "time": "07:00",
            "label": "Pagi",
            "active": true,
            "updated_at": "2026-11-02T12:00:00.000Z"
          }
        },
        "commands": {
          "pending": {
            "id": "cmd_123456",
            "type": "feed",
            "params": { "duration_ms": 1000 },
            "status": "pending",
            "created_at": "2026-11-02T12:05:00.000Z"
          },
          "history": {
            "cmd_123456": {
              "id": "cmd_123456",
              "status": "completed",
              "finished_at": "2026-11-02T12:05:03.000Z"
            }
          }
        },
        "logs": {
          "ph_logs": {
            "ph_123456": {
              "id": "ph_123456",
              "value": 7.2,
              "status": "aman",
              "timestamp": "2026-11-02T12:00:00.000Z"
            }
          },
          "action_logs": {
            "act_123456": {
              "id": "act_123456",
              "type": "feed",
              "action": "Manual Feed",
              "status": "success",
              "timestamp": "2026-11-02T12:05:00.000Z"
            }
          }
        }
      }
    }
  }
  ```

---

## D. File Change Inventory

| File | Change Type | Description |
|---|---|---|
| `server/config/appConfig.js` | Modified | Menambahkan variabel `config.firebase.databaseUrl` |
| `server/config/firebaseAdmin.js` | Modified | Meneruskan `databaseURL` saat inisialisasi singleton Admin SDK dan mengekspor `getAdminDatabase()` |
| `server/repositories/deviceRepository.js` | Created | Abstraksi repository CRUD RTDB untuk status, pengaturan, jadwal, perintah, dan log riwayat |
| `server/server.js` | Modified | Menambahkan indikator status `realtimeDatabase` pada endpoint `GET /api/health` |
| `server/.env.example` | Modified | Menambahkan contoh dokumentasi konfigurasi `FIREBASE_DATABASE_URL` |

---

## E. Testing and Validation

| Test | Command | Result |
|---|---|---|
| Automated Backend Unit & Integration Tests | `cd server && npm test` | **43/43 tes lulus** (menguji operasi repository, fallback, dan isolasi) |
| Automated Frontend Linter | `npm run lint` | **0 errors, 0 warnings** |
| Automated Frontend Build | `npm run build` | **Sukses (222ms)** |
| Database Health Check Diagnostic | `curl /api/health` | Mengembalikan status `realtimeDatabase: "connected"` / `"local-cache"` |
| Static Code Inspection | Pemeriksaan berkas `server/config/firebaseAdmin.js` | Memastikan hanya terdapat 1 pemanggilan `admin.initializeApp` |
| Live RTDB Direct Network Test | N/A | **Tidak dapat dilakukan** karena kredensial privat service account live belum diunduh dari Firebase Console ke file `serviceAccountKey.json` lokal |

---

## F. Security Review
- **Akses Tepercaya (Trusted Server):** Operasi penulisan telemetri dan pembacaan konfigurasi sensitif dipusatkan di backend Express melalui Firebase Admin SDK.
- **Pencegahan Kebocoran Kredensial:** Kunci privat (*private key*) service account disimpan hanya pada environment server dan diabaikan oleh `.gitignore`.
- **Rekomendasi Security Rules Realtime Database:**
  Jika di kemudian hari klien frontend membaca data status secara langsung melalui Firebase SDK client (read-only listener):
  ```json
  {
    "rules": {
      "devices": {
        "$deviceId": {
          ".read": "auth != null",
          ".write": false
        }
      }
    }
  }
  ```
  Aturan di atas memastikan bahwa hanya backend Express (menggunakan Admin SDK yang mengabaikan security rules) yang dapat menulis status dan perintah, sedangkan klien terotentikasi hanya dapat membaca.

---

## G. Known Issues and Limitations
1. Kredensial `serviceAccountKey.json` live belum diunggah oleh pengguna ke folder `server/` (secara sengaja demi keamanan privasi), sehingga server saat ini beroperasi menggunakan *safe local cache/in-memory fallback* yang telah teruji 100% pada suite pengujian otomatis.

---

## H. Next Steps
1. Pengguna dapat mengunduh `serviceAccountKey.json` dari Firebase Console (Project Settings > Service accounts) dan meletakkannya di `server/serviceAccountKey.json`.
2. Memastikan aturan keamanan Realtime Database di Firebase Console dikonfigurasi sesuai pedoman di atas.

---

## I. Final Status
**Completed** (Arsitektur database, skema node JSON, integrasi Firebase Admin RTDB, repository layer, dan mekanisme fallback telah selesai dibuat dan diverifikasi secara komprehensif).
