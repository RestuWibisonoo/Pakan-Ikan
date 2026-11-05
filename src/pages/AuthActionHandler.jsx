import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut,
} from 'firebase/auth';
import {
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { auth } from '../firebase/config';
import AuthLayout from '../components/AuthLayout';

export default function AuthActionHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  const rawContinueUrl = searchParams.get('continueUrl');

  // Validasi continueUrl agar tidak terjadi open redirect
  const getSafeContinueUrl = () => {
    if (!rawContinueUrl) return '/login';
    try {
      if (rawContinueUrl.startsWith('/')) return rawContinueUrl;
      const parsed = new URL(rawContinueUrl);
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === 'pakan-ikan.my.id' ||
        parsed.hostname.endsWith('.pakan-ikan.my.id')
      ) {
        return rawContinueUrl;
      }
      return '/login';
    } catch {
      return '/login';
    }
  };

  const isMissingParams = !oobCode || !mode;
  const isSupportedMode = mode === 'verifyEmail' || mode === 'resetPassword';

  // Status state: diinisialisasi secara deklaratif tanpa sinkronisasi setState dalam effect
  const [loading, setLoading] = useState(!isMissingParams && isSupportedMode);
  const [error, setError] = useState(
    isMissingParams
      ? 'Parameter tautan tidak lengkap atau tidak valid.'
      : !isSupportedMode
        ? `Mode aksi '${mode}' tidak didukung.`
        : ''
  );
  const [success, setSuccess] = useState(false);

  // Khusus Reset Password
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);

  // Evaluasi kekuatan sandi
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', color: 'transparent', score: 0 };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { label: 'Lemah', color: 'var(--danger)', score: 33 };
    if (score <= 3) return { label: 'Sedang', color: 'var(--warning)', score: 66 };
    return { label: 'Kuat', color: 'var(--success)', score: 100 };
  };

  const strength = getPasswordStrength(newPassword);

  useEffect(() => {
    if (isMissingParams || !isSupportedMode) {
      return;
    }

    // Tangani aksi verifikasi email
    if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setSuccess(true);
          setLoading(false);

          // Siarkan event verifikasi ke tab lain (Tab 1 registrasi / verify-email)
          try {
            const bc = new BroadcastChannel('pakan_ikan_auth');
            bc.postMessage({ type: 'EMAIL_VERIFIED', timestamp: Date.now() });
            bc.close();
          } catch {
            // Abaikan jika tidak didukung
          }
          try {
            localStorage.setItem('pakan_ikan_email_verified_event', Date.now().toString());
          } catch {
            // Abaikan jika storage diblokir
          }
        })
        .catch((err) => {
          if (err.code === 'auth/expired-action-code') {
            setError('Tautan verifikasi email telah kedaluwarsa. Silakan masuk dan minta tautan baru.');
          } else if (err.code === 'auth/invalid-action-code') {
            setError('Tautan verifikasi tidak valid atau telah digunakan sebelumnya.');
          } else {
            setError('Gagal memverifikasi alamat email. Silakan coba kembali.');
          }
          setLoading(false);
        });
    }

    // Tangani aksi reset kata sandi: verifikasi kode terlebih dahulu
    else if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setResetEmail(email);
          setLoading(false);
        })
        .catch((err) => {
          if (err.code === 'auth/expired-action-code') {
            setError('Tautan atur ulang kata sandi telah kedaluwarsa. Silakan minta tautan baru.');
          } else if (err.code === 'auth/invalid-action-code') {
            setError('Tautan atur ulang kata sandi tidak valid atau telah digunakan sebelumnya.');
          } else {
            setError('Gagal memeriksa tautan pemulihan kata sandi.');
          }
          setLoading(false);
        });
    }
  }, [mode, oobCode, isMissingParams, isSupportedMode]);

  // Handler submit password reset
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('Kata sandi baru harus memiliki minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
      return;
    }

    setSubmittingReset(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      if (err.code === 'auth/expired-action-code') {
        setError('Tautan telah kedaluwarsa. Silakan ajukan reset kata sandi baru.');
      } else if (err.code === 'auth/weak-password') {
        setError('Kata sandi terlalu lemah. Harap gunakan kombinasi yang lebih kuat.');
      } else {
        setError('Gagal memperbarui kata sandi. Silakan coba kembali.');
      }
    } finally {
      setSubmittingReset(false);
    }
  };

  // State: Loading
  if (loading) {
    return (
      <AuthLayout
        title="Memproses Aksi"
        subtitle="Mohon tunggu sebentar, sistem sedang memverifikasi tautan Anda..."
      >
        <div style={{ textAlign: 'center', padding: '36px 0' }}>
          <Loader2
            size={42}
            color="var(--primary)"
            style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Memvalidasi kode otentikasi Pakan Ikan...
          </p>
        </div>
      </AuthLayout>
    );
  }

  // State: Error
  if (error && !resetEmail) {
    return (
      <AuthLayout
        title="Tautan Tidak Valid"
        subtitle="Terjadi kendala saat memproses tautan autentikasi Anda"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--danger)',
            }}
          >
            <AlertCircle size={32} />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>
            Tautan Kedaluwarsa atau Tidak Valid
          </h3>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
            {error}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/login"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', textDecoration: 'none' }}
            >
              <span>Kembali ke Halaman Masuk</span>
            </Link>

            {mode === 'resetPassword' && (
              <Link
                to="/forgot-password"
                className="btn btn-outline"
                style={{ width: '100%', padding: '12px', textDecoration: 'none' }}
              >
                <RefreshCw size={16} />
                <span>Minta Tautan Pemulihan Baru</span>
              </Link>
            )}
          </div>
        </div>
      </AuthLayout>
    );
  }

  // 1. Tampilan Sukses Verifikasi Email
  if (mode === 'verifyEmail' && success) {
    return (
      <AuthLayout
        title="Verifikasi Berhasil!"
        subtitle="Alamat email Anda telah berhasil dikonfirmasi"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--success)',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>
            Email Anda Terverifikasi
          </h3>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            Selamat! Akun <strong>Pakan Ikan</strong> Anda kini telah aktif sepenuhnya. Anda dapat masuk dan mulai mengelola pakan otomatis serta monitoring pH kolam Anda.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
            onClick={async () => {
              try {
                await signOut(auth);
              } catch {
                // Abaikan jika tidak ada sesi
              }
              navigate('/login', {
                replace: true,
                state: {
                  verifiedSuccess: true,
                  message: 'Email berhasil diverifikasi! Silakan masuk dengan alamat email dan kata sandi Anda.',
                },
              });
            }}
          >
            <span>Masuk ke Akun Pakan Ikan</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </AuthLayout>
    );
  }

  // 2. Tampilan Sukses Reset Kata Sandi
  if (mode === 'resetPassword' && success) {
    return (
      <AuthLayout
        title="Kata Sandi Diperbarui!"
        subtitle="Kata sandi akun Anda telah berhasil diatur ulang"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--success)',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>
            Pembaruan Berhasil
          </h3>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            Kata sandi baru Anda telah aktif. Silakan masuk menggunakan kata sandi baru untuk mengakses sistem Pakan Ikan.
          </p>

          <Link
            to="/login"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', textDecoration: 'none' }}
          >
            <span>Masuk Sekarang</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // 3. Form Input Kata Sandi Baru (mode === 'resetPassword' & kode valid)
  if (mode === 'resetPassword') {
    return (
      <AuthLayout
        title="Buat Kata Sandi Baru"
        subtitle={`Atur ulang kata sandi untuk akun: ${resetEmail || ''}`}
      >
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '0.875rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleResetSubmit} noValidate>
          {/* Input Kata Sandi Baru */}
          <div className="input-group">
            <label className="input-label" htmlFor="new-password">
              Kata Sandi Baru
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Lock size={18} />
              </span>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                required
                disabled={submittingReset}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Indikator Kekuatan */}
            {newPassword.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div
                  style={{
                    height: '4px',
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${strength.score}%`,
                      backgroundColor: strength.color,
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: strength.color, marginTop: '4px', display: 'block' }}>
                  Kekuatan sandi: {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Konfirmasi Kata Sandi Baru */}
          <div className="input-group">
            <label className="input-label" htmlFor="confirm-new-password">
              Konfirmasi Kata Sandi Baru
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <KeyRound size={18} />
              </span>
              <input
                id="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Ulangi kata sandi baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                required
                disabled={submittingReset}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && newPassword === confirmPassword && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'var(--success)', fontSize: '0.75rem' }}>
                <CheckCircle2 size={14} />
                <span>Kata sandi cocok</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '12px' }}
            disabled={submittingReset}
          >
            {submittingReset ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Menyimpan Kata Sandi...</span>
              </>
            ) : (
              <span>Simpan Kata Sandi Baru</span>
            )}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return null;
}
