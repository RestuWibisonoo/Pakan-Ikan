import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);

  const { login, getFriendlyErrorMessage, isAuthenticated, isEmailVerified } = useAuth();
  const navigate = useNavigate();

  // URL yang dituju sebelum dialihkan ke login (jika ada)
  const from = location.state?.from?.pathname || '/';

  // Perbarui state jika location.state berubah (misal dialihkan setelah verifikasi email)
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  // Jika sudah terotentikasi dan terverifikasi secara penuh, langsung masuk dashboard
  useEffect(() => {
    if (isAuthenticated && isEmailVerified && !location.state?.verifiedSuccess) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isEmailVerified, from, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Silakan masukkan email dan kata sandi Anda.');
      return;
    }

    setLoading(true);

    try {
      const user = await login(cleanEmail, password, rememberMe);

      // Cek apakah email pengguna sudah diverifikasi
      if (!user.emailVerified) {
        navigate('/verify-email', {
          replace: true,
          state: {
            message: 'Email Anda belum diverifikasi. Silakan periksa kotak masuk untuk melakukan verifikasi akun.',
          },
        });
        return;
      }

      // Berhasil login dan terverifikasi
      navigate(from, { replace: true });
    } catch (err) {
      const msg = getFriendlyErrorMessage(err.code || '');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Selamat Datang"
      subtitle="Masuk untuk memantau pakan ikan & pH air secara real-time"
    >
      {successMessage && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#86efac',
            padding: '12px 14px',
            borderRadius: '12px',
            fontSize: '0.875rem',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            lineHeight: 1.4,
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{successMessage}</span>
        </div>
      )}

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
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Input Email */}
        <div className="input-group">
          <label className="input-label" htmlFor="login-email">
            Alamat Email
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
              <Mail size={18} />
            </span>
            <input
              id="login-email"
              type="email"
              className="input-field"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '44px' }}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Input Kata Sandi */}
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="input-label" htmlFor="login-password">
              Kata Sandi
            </label>
            <Link
              to="/forgot-password"
              style={{
                fontSize: '0.8rem',
                color: 'var(--primary)',
                textDecoration: 'none',
              }}
            >
              Lupa Kata Sandi?
            </Link>
          </div>
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
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '44px', paddingRight: '44px' }}
              autoComplete="current-password"
              required
              disabled={loading}
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
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Ingat Saya Checkbox */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            cursor: 'pointer',
          }}
          onClick={() => setRememberMe(!rememberMe)}
        >
          <input
            type="checkbox"
            id="remember-me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{
              cursor: 'pointer',
              accentColor: 'var(--primary)',
              width: '16px',
              height: '16px',
            }}
          />
          <label
            htmlFor="remember-me"
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            Ingat saya di perangkat ini
          </label>
        </div>

        {/* Tombol Masuk */}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Memproses Masuk...</span>
            </>
          ) : (
            <>
              <LogIn size={18} />
              <span>Masuk ke Pakan Ikan</span>
            </>
          )}
        </button>
      </form>

      {/* Tautan ke Registrasi */}
      <div
        style={{
          marginTop: '22px',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
          paddingTop: '18px',
        }}
      >
        <span>Belum memiliki akun? </span>
        <Link
          to="/register"
          style={{
            color: 'var(--primary)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Daftar Sekarang
        </Link>
      </div>
    </AuthLayout>
  );
}

