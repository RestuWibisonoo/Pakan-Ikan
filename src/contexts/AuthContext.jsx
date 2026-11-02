import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import authApi from '../services/authApi';

const AuthContext = createContext(null);

const mapAuthErrorToIndonesian = (errorCode) => {
  switch (errorCode) {
    case 'auth/invalid-credential':
      return 'Email atau kata sandi yang Anda masukkan salah.';
    case 'auth/user-not-found':
      return 'Akun dengan email tersebut tidak ditemukan.';
    case 'auth/wrong-password':
      return 'Kata sandi yang Anda masukkan salah.';
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/email-already-in-use':
      return 'Alamat email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan gagal. Akses dinonaktifkan sementara demi keamanan. Silakan coba beberapa saat lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi jaringan gagal. Periksa koneksi internet Anda.';
    case 'auth/user-disabled':
      return 'Akun ini telah dinonaktifkan. Silakan hubungi admin di katasandi.pakanikan@gmail.com.';
    case 'auth/operation-not-allowed':
      return 'Metode autentikasi Email/Password belum diaktifkan di Firebase Console.';
    default:
      return 'Terjadi kesalahan autentikasi. Silakan coba beberapa saat lagi.';
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pantau perubahan status autentikasi melalui onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login dengan persistensi lokal (Remember Me) atau sesi tab
  const login = async (email, password, rememberMe = true) => {
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
    } catch {
      // Abaikan jika setPersistence tidak didukung pada browser tertentu
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    setUser(credential.user);
    return credential.user;
  };

  // Registrasi akun baru, simpan nama lengkap, dan kirim verifikasi email
  const register = async (email, password, displayName) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    
    if (displayName && credential.user) {
      await updateProfile(credential.user, { displayName });
    }

    if (credential.user) {
      // Coba kirim via backend email kustom Pakan Ikan; failover ke Firebase bawaan jika backend belum siap
      try {
        await authApi.sendCustomVerificationEmail(credential.user);
      } catch (backendErr) {
        console.warn('Backend custom email tidak tersedia, beralih ke Firebase bawaan:', backendErr?.message || backendErr);
        try {
          await sendEmailVerification(credential.user);
        } catch (fbErr) {
          console.warn('Gagal mengirim verifikasi bawaan Firebase:', fbErr?.message || fbErr);
          // Akun sudah berhasil dibuat di Firebase Auth, jangan batalkan registrasi
        }
      }
    }

    // Refresh state user lokal dengan displayName yang diperbarui
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    } else {
      setUser(credential.user);
    }

    return credential.user;
  };

  // Kirim ulang email verifikasi ke pengguna saat ini
  const sendVerificationEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Tidak ada pengguna yang sedang login.');
    }
    try {
      await authApi.resendCustomVerificationEmail(currentUser);
    } catch (backendErr) {
      console.warn('Backend custom email tidak tersedia, beralih ke Firebase bawaan:', backendErr?.message || backendErr);
      await sendEmailVerification(currentUser);
    }
  };

  // Reset kata sandi melalui email kustom backend atau bawaan Firebase
  const resetPassword = async (email) => {
    try {
      await authApi.sendCustomPasswordResetEmail(email);
    } catch (backendErr) {
      console.warn('Backend custom email tidak tersedia, beralih ke Firebase bawaan:', backendErr?.message || backendErr);
      await sendPasswordResetEmail(auth, email);
    }
  };

  // Logout dan bersihkan sesi Firebase
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // Reload data user untuk memeriksa apakah email sudah diverifikasi
  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const refreshed = auth.currentUser;
      setUser(refreshed);
      return refreshed.emailVerified;
    }
    return false;
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isEmailVerified: Boolean(user && user.emailVerified),
    login,
    register,
    logout,
    resetPassword,
    sendVerificationEmail,
    reloadUser,
    checkBackendHealth: authApi.checkBackendHealth,
    getFriendlyErrorMessage: mapAuthErrorToIndonesian,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}

export default AuthContext;
