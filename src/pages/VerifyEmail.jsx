import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MailCheck, RefreshCw, LogOut, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function VerifyEmail() {
  const { user, reloadUser, sendVerificationEmail, logout, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState(location.state?.message || '');
  const [errorMessage, setErrorMessage] = useState('');

  const displayEmail = user?.email || location.state?.email || 'Alamat email Anda';
  const hasRedirectedRef = useRef(false);

  // Alihkan langsung login ke Dashboard jika sesi aktif, atau ke halaman login jika sesi tidak aktif
  const handleVerificationSuccess = useCallback(() => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;

    // Jika user memiliki sesi aktif setelah registrasi/login, langsung masuk ke Dashboard!
    if (auth.currentUser || user) {
      navigate('/', { replace: true });
    } else {
      // Jika sesi tidak aktif, arahkan ke halaman login dengan email terisi
      const targetEmail = location.state?.email || '';
      navigate('/login', {
        replace: true,
        state: {
          verifiedSuccess: true,
          email: targetEmail,
          message: 'Email berhasil diverifikasi! Silakan masuk dengan akun Pakan Ikan Anda.',
        },
      });
    }
  }, [user, location.state, navigate]);

  // 1. Cek langsung jika status isEmailVerified di context sudah true
  useEffect(() => {
    if (isEmailVerified) {
      handleVerificationSuccess();
    }
  }, [isEmailVerified, handleVerificationSuccess]);

  // 2. Polling latar belakang setiap 3 detik untuk mendeteksi verifikasi dari tab lain atau HP
  useEffect(() => {
    let isCancelled = false;

    const pollInterval = setInterval(async () => {
      if (hasRedirectedRef.current || isCancelled) return;
      try {
        const verified = await reloadUser();
        if (verified && !isCancelled) {
          clearInterval(pollInterval);
          await handleVerificationSuccess();
        }
      } catch {
        // Abaikan error saat background polling
      }
    }, 3000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, [reloadUser, handleVerificationSuccess]);

  // 3. Listener saat tab kembali aktif (focus / visibilitychange)
  useEffect(() => {
    let isCancelled = false;

    const checkStatus = async () => {
      if (hasRedirectedRef.current || isCancelled) return;
      try {
        const verified = await reloadUser();
        if (verified && !isCancelled) {
          await handleVerificationSuccess();
        }
      } catch {
        // Abaikan
      }
    };

    const handleFocus = () => {
      checkStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reloadUser, handleVerificationSuccess]);

  // 4. Sinkronisasi antar-tab (BroadcastChannel & LocalStorage event)
  useEffect(() => {
    let isCancelled = false;
    let bc;

    try {
      bc = new BroadcastChannel('pakan_ikan_auth');
      bc.onmessage = async (e) => {
        if (e.data?.type === 'EMAIL_VERIFIED' && !isCancelled) {
          await reloadUser();
          await handleVerificationSuccess();
        }
      };
    } catch {
      // BroadcastChannel mungkin tidak tersedia di browser lawas
    }

    const handleStorageEvent = async (e) => {
      if (e.key === 'pakan_ikan_email_verified_event' && !isCancelled) {
        await reloadUser();
        await handleVerificationSuccess();
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      isCancelled = true;
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [reloadUser, handleVerificationSuccess]);

  // Timer countdown untuk kirim ulang email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Tombol Manual: "Saya Sudah Verifikasi"
  const handleCheckVerification = async () => {
    setChecking(true);
    setErrorMessage('');
    try {
      const verified = await reloadUser();
      if (verified) {
        await handleVerificationSuccess();
      } else {
        setErrorMessage(
          'Email belum terverifikasi. Silakan buka kotak masuk email Anda dan klik tautan verifikasi yang telah dikirimkan.'
        );
      }
    } catch {
      setErrorMessage('Gagal memeriksa status verifikasi. Silakan coba kembali.');
    } finally {
      setChecking(false);
    }
  };

  // Kirim ulang email verifikasi
  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setResending(true);
    setErrorMessage('');
    setInfoMessage('');
    try {
      await sendVerificationEmail();
      setInfoMessage('Tautan verifikasi baru berhasil dikirim ke email Anda.');
      setResendCooldown(5); // Cooldown 5 detik untuk testing
    } catch (err) {
      console.error('[VerifyEmail] Error resend:', err);
      const detailedMsg = err.message || (err.code ? `Error: ${err.code}` : 'Gagal mengirim email verifikasi.');
      setErrorMessage(`Gagal mengirim verifikasi: ${detailedMsg}`);
    } finally {
      setResending(false);
    }
  };

  // Logout / ganti akun
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout
      title="Verifikasi Email"
      subtitle="Konfirmasi alamat email Anda untuk mengamankan akun"
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--primary)',
          }}
        >
          <MailCheck size={32} />
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Kami telah mengirimkan tautan verifikasi akun ke:
        </p>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border)',
            padding: '10px 14px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '1rem',
            color: 'var(--text-main)',
            wordBreak: 'break-all',
            marginBottom: '20px',
          }}
        >
          {displayEmail}
        </div>

        {infoMessage && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#86efac',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              textAlign: 'left',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{infoMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              textAlign: 'left',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '13px' }}
            onClick={handleCheckVerification}
            disabled={checking}
          >
            {checking ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Memeriksa Verifikasi...</span>
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                <span>Saya Sudah Verifikasi</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            style={{ width: '100%', padding: '12px' }}
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
          >
            {resending ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Mengirim Ulang...</span>
              </>
            ) : resendCooldown > 0 ? (
              <span>Kirim Ulang ({resendCooldown}s)</span>
            ) : (
              <span>Kirim Ulang Email Verifikasi</span>
            )}
          </button>
        </div>

        <div
          style={{
            marginTop: '22px',
            borderTop: '1px solid var(--border)',
            paddingTop: '16px',
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LogOut size={16} />
            <span>Keluar / Masuk dengan Akun Lain</span>
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
