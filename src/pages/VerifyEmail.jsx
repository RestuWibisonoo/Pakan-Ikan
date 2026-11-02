import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MailCheck, RefreshCw, LogOut, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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

  // Jika sudah terverifikasi, arahkan ke dashboard
  useEffect(() => {
    if (isEmailVerified) {
      navigate('/', { replace: true });
    }
  }, [isEmailVerified, navigate]);

  // Timer countdown untuk kirim ulang email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Cek apakah email sudah diverifikasi pengguna
  const handleCheckVerification = async () => {
    setChecking(true);
    setErrorMessage('');
    try {
      const verified = await reloadUser();
      if (verified) {
        navigate('/', { replace: true });
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
      setResendCooldown(5); // Cooldown hanya 5 detik untuk memudahkan testing
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
          {user?.email || 'Alamat email Anda'}
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
