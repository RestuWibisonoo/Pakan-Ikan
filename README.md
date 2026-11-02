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
   - **Project:** `Pakan-Ikan`
   - **Web App:** `Pakan Ikan Web`
   - Buka menu **Authentication** > **Sign-in method**, lalu aktifkan penyedia **Email/Password**.

3. Masukkan konfigurasi ke dalam file `.env.local`:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=pakan-ikan.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=pakan-ikan
   VITE_FIREBASE_STORAGE_BUCKET=pakan-ikan.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_FIREBASE_DATABASE_URL=https://pakan-ikan-default-rtdb.firebaseio.com
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
