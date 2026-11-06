import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, CalendarClock, History as HistoryIcon, Settings, Fish } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import InstallPrompt from './components/InstallPrompt';
import iotApi from './services/iotApi';

// Pages
import Dashboard from './pages/Dashboard';
import Schedules from './pages/Schedules';
import DevicesPage from './pages/Devices';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import AuthActionHandler from './pages/AuthActionHandler';

function BottomNavigation() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${path === '/' ? 'active' : ''}`}>
        <Home size={24} />
        <span>Dashboard</span>
      </Link>
      <Link to="/schedules" className={`nav-item ${path === '/schedules' ? 'active' : ''}`}>
        <CalendarClock size={24} />
        <span>Jadwal</span>
      </Link>
      <Link to="/history" className={`nav-item ${path === '/history' ? 'active' : ''}`}>
        <HistoryIcon size={24} />
        <span>Riwayat</span>
      </Link>
      <Link to="/settings" className={`nav-item ${path === '/settings' ? 'active' : ''}`}>
        <Settings size={24} />
        <span>Pengaturan</span>
      </Link>
    </nav>
  );
}

function Header() {
  const { user } = useAuth();
  const [deviceOnline, setDeviceOnline] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = () => {
      iotApi
        .getSystemStatus()
        .then((res) => {
          if (isMounted) setDeviceOnline(Boolean(res?.data?.status?.online));
        })
        .catch(() => {
          if (isMounted) setDeviceOnline(false);
        });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="app-title">
        <Fish color="#38bdf8" />
        <span>Pakan Ikan</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {user?.displayName && (
          <span
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              maxWidth: '120px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={user.displayName}
          >
            {user.displayName}
          </span>
        )}
        <div
          className="device-status"
          title={`Status Perangkat IoT: ${deviceOnline ? 'Terhubung (Online)' : 'Terputus (Offline)'}`}
        >
          <span className={`status-indicator ${deviceOnline ? 'online' : 'offline'}`}></span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {deviceOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}

function AppRoutes() {
  const { isAuthenticated, isEmailVerified } = useAuth();
  const showNavAndHeader = isAuthenticated && isEmailVerified;

  return (
    <div className="app-container" style={!showNavAndHeader ? { paddingBottom: 0 } : {}}>
      {showNavAndHeader && <Header />}
      <main className="main-content" style={!showNavAndHeader ? { padding: '12px' } : {}}>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/auth/action" element={<AuthActionHandler />} />

          {/* Protected Routes (Dashboard & Features) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedules"
            element={
              <ProtectedRoute>
                <Schedules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedRoute>
                <DevicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <InstallPrompt />
      {showNavAndHeader && <BottomNavigation />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
