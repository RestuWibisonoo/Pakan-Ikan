import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, getFriendlyErrorMessage } = useAuth();
  const navigate = useNavigate();

  // Evaluasi kekuatan kata sandi
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', color: 'transparent', score: 0 };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { label: 'Lemah (Minimal 6 karakter kombinasi)', color: 'var(--danger)', score: 33 };
    if (score <= 3) return { label: 'Sedang (Tambahkan huruf besar/simbol)', color: 'var(--warning)', score: 66 };
    return { label: 'Kuat', color: 'var(--success)', score: 100 };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = displayName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Silakan masukkan nama lengkap Anda.');
      return;
    }

    if (!cleanEmail) {
      setError('Silakan masukkan alamat email yang valid.');
      return;
    }

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Format email tidak valid. Pastikan penulisan email benar.');
      return;
    }

    if (!password) {
      setError('Silakan tentukan kata sandi Anda.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi harus terdiri dari minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
      return;
    }

    setLoading(true);

    try {
      await register(cleanEmail, password, cleanName);

      // Setelah berhasil mendaftar, langsung arahkan ke VerifyEmail dengan pesan informasi
      navigate('/verify-email', {
        replace: true,
        state: {
          isNewRegistration: true,
          email: cleanEmail,
          message: 'Pendaftaran akun Pakan Ikan berhasil! Kami telah mengirimkan email verifikasi.',
        },
      });
    } catch (err) {
      const msg = getFriendlyErrorMessage(err.code || '');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Daftar Akun Baru"
      subtitle="Buat akun untuk mengelola perangkat Pakan Ikan Anda"
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
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Nama Lengkap */}
        <div className="input-group">
          <label className="input-label" htmlFor="register-name">
            Nama Lengkap
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
              <User size={18} />
            </span>
            <input
              id="register-name"
              type="text"
              className="input-field"
              placeholder="Contoh: Budi Santoso"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ paddingLeft: '44px' }}
              autoComplete="name"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Alamat Email */}
        <div className="input-group">
          <label className="input-label" htmlFor="register-email">
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
              id="register-email"
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

        {/* Kata Sandi */}
        <div className="input-group">
          <label className="input-label" htmlFor="register-password">
            Kata Sandi
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
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '44px', paddingRight: '44px' }}
              autoComplete="new-password"
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

          {/* Indikator Kekuatan Sandi */}
          {password.length > 0 && (
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

        {/* Konfirmasi Kata Sandi */}
        <div className="input-group">
          <label className="input-label" htmlFor="register-confirm-password">
            Konfirmasi Kata Sandi
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
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Ulangi kata sandi"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingLeft: '44px', paddingRight: '44px' }}
              autoComplete="new-password"
              required
              disabled={loading}
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
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
              aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPassword && password === confirmPassword && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'var(--success)', fontSize: '0.75rem' }}>
              <CheckCircle2 size={14} />
              <span>Kata sandi cocok</span>
            </div>
          )}
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '10px' }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Mendaftarkan Akun...</span>
            </>
          ) : (
            <>
              <UserPlus size={18} />
              <span>Daftar Akun Pakan Ikan</span>
            </>
          )}
        </button>
      </form>

      {/* Tautan ke Login */}
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
        <span>Sudah memiliki akun? </span>
        <Link
          to="/login"
          style={{
            color: 'var(--primary)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Masuk di Sini
        </Link>
      </div>
    </AuthLayout>
  );
}

