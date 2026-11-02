# Pakan Ikan

Sistem Pemberian Pakan Ikan Otomatis dengan Monitoring pH Air Secara Real-Time Melalui Smartphone.

## Identitas Aplikasi
- **Nama Aplikasi:** Pakan Ikan
- **Repository:** https://github.com/RestuWibisonoo/Pakan-Ikan
- **Email Kontak / Bisnis:** katasandi.pakanikan@gmail.com
- **Teknologi:** React 19, Vite 8, React Router DOM 7, Firebase SDK 12, Lucide React

---

## Fitur Utama

1. **Autentikasi Pengguna (Firebase Authentication):**
   - **Registrasi Akun:** Pendaftaran dengan nama lengkap, email, validasi kekuatan sandi, dan konfirmasi sandi. Menggunakan `createUserWithEmailAndPassword()`, `updateProfile()`, dan `sendEmailVerification()`.
   - **Verifikasi Email:** Proteksi akun di mana pengguna yang belum memverifikasi email wajib memverifikasi akun sebelum mengakses dashboard, dilengkapi fitur kirim ulang tautan verifikasi dan cooldown timer.
   - **Login:** Masuk akun dengan email/password, fitur remember me (`setPersistence`), dan validasi status verifikasi email.
   - **Lupa Kata Sandi:** Pemulihan sandi via email Firebase (`sendPasswordResetEmail()`) dengan respons aman yang tidak membocorkan keberadaan akun.
   - **Keluar (Logout):** Memutus sesi Firebase (`signOut()`) secara penuh dan mengarahkan kembali ke halaman login.
   - **Protected Routes:** Menjaga rute dashboard, jadwal, riwayat, dan pengaturan agar hanya dapat diakses pengguna terotentikasi & terverifikasi tanpa flash render.

2. **Monitoring & Kontrol Kolam:**
   - Pemantauan nilai pH air secara real-time dengan status indikator.
   - Pemberian pakan ikan manual (override).
   - Kontrol on/off pompa sirkulasi air.
   - Jadwal pemberian pakan ikan otomatis.
   - Riwayat log pembacaan pH dan aksi perangkat.
   - Pengaturan batas aman pH dan parameter durasi hardware.

---

## Konfigurasi Lingkungan (.env.local)

1. Salin template `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Buka Firebase Console (https://console.firebase.google.com/):
   - **Project:** `Pakan-Ikan` (Project ID: `pakan-ikan-4c18e`)
   - **Web App:** `Pakan Ikan Web`
   - Buka menu **Authentication** > **Sign-in method**, lalu aktifkan penyedia **Email/Password**.

3. Masukkan konfigurasi resmi ke dalam file `.env.local`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=pakan-ikan-4c18e.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=pakan-ikan-4c18e
   VITE_FIREBASE_STORAGE_BUCKET=pakan-ikan-4c18e.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=995038198723
   VITE_FIREBASE_APP_ID=1:995038198723:web:dfe5d757b5a1988eb51b76
   VITE_FIREBASE_MEASUREMENT_ID=G-3J6XKTQNJP
   ```

---

## Menjalankan Aplikasi

1. **Instalasi Dependensi (jika belum):**
   ```bash
   npm install
   ```

2. **Menjalankan Server Pengembangan (Dev Server):**
   ```bash
   npm run dev
   ```

3. **Pemeriksaan Kode (Linter):**
   ```bash
   npm run lint
   ```

4. **Build untuk Produksi:**
   ```bash
   npm run build
   ```

---

## Layanan Email Autentikasi Kustom (Backend Express)

Aplikasi **Pakan Ikan** dilengkapi dengan layanan backend terpisah di direktori `server/` untuk mengirimkan email verifikasi dan atur ulang kata sandi dengan template HTML responsif bernuansa aquatic (dark emerald green), tautan aksi kustom (`/auth/action`), dan integrasi Firebase Admin SDK + Nodemailer.

### 1. Struktur Backend (`server/`)
- `config/` - Konfigurasi Firebase Admin SDK, SMTP transport, dan aplikasi.
- `controllers/` - Handler endpoint autentikasi (`sendVerification`, `resendVerification`, `sendPasswordReset`).
- `middleware/` - Autentikasi token Firebase ID (`requireAuth`), rate limiting, dan error handling aman.
- `routes/` - Definisi rute Express (`/api/auth/*`).
- `services/` - Logika pembuatan link verifikasi/reset (`linkService`) dan pengiriman email (`emailService`).
- `templates/` - Template email responsif HTML ber-branding Pakan Ikan.
- `tests/` - Unit & integration test otomatis (`node --test`).

### 2. Menjalankan Backend
```bash
# Masuk ke direktori server
cd server

# Salin konfigurasi environment
cp .env.example .env

# Jalankan dalam mode pengembangan
npm run dev

# Jalankan pengujian otomatis
npm test
```

### 3. Keamanan & Mekanisme Failover
- **Firebase ID Token Verification:** Endpoint verifikasi memvalidasi token otentikasi Firebase dan hanya mengirim email ke alamat email pengguna yang sah (tidak mempercayai body request).
- **Anti-Enumeration:** Endpoint lupa kata sandi memberikan respons seragam untuk mencegah penyerang mengetahui apakah suatu email terdaftar.
- **Failover Bawaan:** Jika backend belum berjalan atau kredensial service account belum diisi, frontend secara otomatis beralih menggunakan email bawaan Firebase Authentication client.
- **Perlindungan Kredensial:** Seluruh token rahasia, private key Firebase Admin, dan password SMTP dilindungi oleh `.gitignore` dan tidak pernah terekspos ke frontend.
