import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, CalendarClock, History as HistoryIcon, Settings } from 'lucide-react';
import { Fish } from 'lucide-react';

// Pages
import Dashboard from './pages/Dashboard';
import Schedules from './pages/Schedules';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';

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
  return (
    <header className="app-header">
      <div className="app-title">
        <Fish color="#38bdf8" />
        <span>AquaIoT</span>
      </div>
      <div className="device-status">
        <span className="status-indicator online"></span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Online</span>
      </div>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <BottomNavigation />
      </div>
    </BrowserRouter>
  );
}

export default App;
