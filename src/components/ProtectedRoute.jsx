import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading, isAuthenticated, isEmailVerified } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '16px',
        }}
      >
        <Loader2
          size={36}
          color="var(--primary)"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Memeriksa status akun...
        </span>
      </div>
    );
  }

  // Jika belum login, arahkan ke login dan simpan tujuan sebelumnya
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Jika login tetapi email belum diverifikasi, arahkan ke /verify-email
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // Pengguna login dan email terverifikasi: berikan akses
  return children;
}

