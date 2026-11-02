import { Navigate } from 'react-router-dom';
import { Fish, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthLayout({ children, title, subtitle }) {
  const { isAuthenticated, isEmailVerified, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          gap: '16px',
        }}
      >
        <Loader2
          size={36}
          color="var(--primary)"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Memuat aplikasi Pakan Ikan...
        </span>
      </div>
    );
  }

  // Jika pengguna sudah login dan email sudah terverifikasi, langsung arahkan ke Dashboard
  if (isAuthenticated && isEmailVerified) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-layout" style={{ maxWidth: '440px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.15))',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            boxShadow: '0 8px 24px rgba(14, 165, 233, 0.25)',
            marginBottom: '16px',
          }}
        >
          <Fish size={32} color="#38bdf8" />
        </div>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            background: 'linear-gradient(to right, #38bdf8, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '6px',
          }}
        >
          Pakan Ikan
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Sistem Pemberian Pakan Otomatis & Monitoring Kualitas Air
        </p>
      </div>

      {/* Main Card */}
      <div className="card glass-panel" style={{ padding: '28px 24px' }}>
        {title && (
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        {children}
      </div>

      {/* Footer Identity */}
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span>Butuh bantuan? Hubungi </span>
        <a
          href="mailto:katasandi.pakanikan@gmail.com"
          style={{ color: 'var(--primary)', textDecoration: 'none' }}
        >
          katasandi.pakanikan@gmail.com
        </a>
      </div>
    </div>
  );
}

