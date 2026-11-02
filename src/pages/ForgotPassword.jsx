import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { resetPassword, getFriendlyErrorMessage } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Silakan masukkan alamat email akun Anda.');
      return;
    }

    // Validasi format email dasar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Format email tidak valid. Pastikan penulisan email benar.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(cleanEmail);
      // Selalu tampilkan pesan sukses yang aman untuk mencegah email enumeration
      setSubmitted(true);
    } catch (err) {
      // Jika error karena format email atau network, beritahu pengguna
      if (err.code === 'auth/invalid-email' || err.code === 'auth/network-request-failed') {
        setError(getFriendlyErrorMessage(err.code));
      } else {
        // Demi keamanan, tidak membocorkan apakah email terdaftar atau tidak
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Lupa Kata Sandi"
      subtitle="Instruksi pemulihan kata sandi akan dikirim ke alamat email Anda"
    >
      {submitted ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
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
            <CheckCircle2 size={30} />
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '8px' }}>
            Instruksi Pemulihan Dikirim
          </h3>

          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '20px',
            }}
          >
            Jika alamat email terdaftar pada sistem <strong>Pakan Ikan</strong>, tautan untuk mengatur ulang kata sandi telah dikirim ke <strong>{email}</strong>. Silakan periksa kotak masuk atau folder spam Anda.
          </p>

          <div
            style={{
              background: 'rgba(14, 165, 233, 0.08)',
              border: '1px solid rgba(14, 165, 233, 0.2)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <strong>Tips:</strong> Tautan pemulihan kata sandi berlaku selama beberapa jam. Klik tautan tersebut dan ikuti instruksi di layar untuk membuat kata sandi baru.
          </div>

          <Link
            to="/login"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', textDecoration: 'none' }}
          >
            <ArrowLeft size={18} />
            <span>Kembali ke Halaman Masuk</span>
          </Link>
        </div>
      ) : (
        <>
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
            <div className="input-group">
              <label className="input-label" htmlFor="forgot-email">
                Alamat Email Terdaftar
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
                  id="forgot-email"
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

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Mengirim Email Pemulihan...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Kirim Link Pemulihan</span>
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '22px',
              textAlign: 'center',
              fontSize: '0.875rem',
              borderTop: '1px solid var(--border)',
              paddingTop: '18px',
            }}
          >
            <Link
              to="/login"
              style={{
                color: 'var(--text-muted)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Halaman Masuk</span>
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}

