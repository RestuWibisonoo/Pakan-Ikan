import { useState, useEffect } from 'react';
import { Save, User, Mail, ShieldCheck, LogOut, Cpu, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import iotApi from '../services/iotApi';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    ph_min: 6.5,
    ph_max: 8.5,
    feed_duration: 1000,
    pump_duration: 5000,
    device_name: 'Kolam Utama',
  });

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ambil pengaturan dari backend
  useEffect(() => {
    let isMounted = true;
    iotApi
      .getSettings()
      .then((res) => {
        if (isMounted && res?.data) {
          const s = res.data;
          setSettings({
            ph_min: s.ph_min !== undefined ? s.ph_min : 6.5,
            ph_max: s.ph_max !== undefined ? s.ph_max : 8.5,
            feed_duration: s.feed_duration_ms !== undefined ? s.feed_duration_ms : 1000,
            pump_duration: s.pump_duration_ms !== undefined ? s.pump_duration_ms : 5000,
            device_name: s.device_name || 'Kolam Utama',
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await iotApi.updateSettings({
        ph_min: Number(settings.ph_min),
        ph_max: Number(settings.ph_max),
        feed_duration_ms: Number(settings.feed_duration),
        pump_duration_ms: Number(settings.pump_duration),
        device_name: settings.device_name,
      });
      alert('Pengaturan berhasil disimpan ke sistem.');
    } catch (err) {
      alert(`Pengaturan lokal diperbarui. (${err.message || 'Offline mode'})`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari akun Pakan Ikan?')) {
      setIsLoggingOut(true);
      try {
        await logout();
        navigate('/login', { replace: true });
      } catch (err) {
        alert('Gagal keluar dari sesi. Silakan coba kembali.');
        console.error('Logout error:', err);
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  return (
    <>
      <h2>Pengaturan Sistem</h2>

      {/* Profil Pengguna */}
      <div className="card glass-panel" style={{ marginBottom: '20px' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} color="var(--primary)" />
          <span>Profil Pengguna</span>
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(99, 102, 241, 0.25))',
              border: '2px solid rgba(14, 165, 233, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '1.25rem',
            }}
          >
            {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {user?.displayName || 'Pengguna Pakan Ikan'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Mail size={14} />
              <span>{user?.email || '-'}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
            <ShieldCheck size={18} color="var(--success)" />
            <span>Status Akun</span>
          </div>
          <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
            Email Terverifikasi
          </span>
        </div>
      </div>

      {/* Manajemen Perangkat IoT */}
      <div className="card glass-panel" style={{ marginBottom: '20px' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} color="var(--primary)" />
          <span>Perangkat IoT</span>
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
          Daftarkan modul hardware ESP32 baru atau beralih antar kolam pemantauan.
        </p>
        <button
          type="button"
          className="btn btn-outline"
          style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onClick={() => navigate('/devices')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="var(--primary)" />
            <span>Kelola & Tambah Perangkat</span>
          </span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Batas Aman pH */}
      <div className="card glass-panel" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">Batas Aman pH</h3>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="input-group" style={{ flex: 1, minWidth: 0 }}>
            <label className="input-label">Minimum</label>
            <input
              type="number"
              className="input-field"
              name="ph_min"
              value={settings.ph_min}
              onChange={handleChange}
              step="0.1"
            />
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: 0 }}>
            <label className="input-label">Maksimum</label>
            <input
              type="number"
              className="input-field"
              name="ph_max"
              value={settings.ph_max}
              onChange={handleChange}
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Hardware Settings */}
      <div className="card glass-panel" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">Hardware</h3>

        <div className="input-group">
          <label className="input-label">Nama Perangkat</label>
          <input
            type="text"
            className="input-field"
            name="device_name"
            value={settings.device_name}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Durasi Buka Servo Pakan (ms)</label>
          <input
            type="number"
            className="input-field"
            name="feed_duration"
            value={settings.feed_duration}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Durasi Maksimal Pompa (ms)</label>
          <input
            type="number"
            className="input-field"
            name="pump_duration"
            value={settings.pump_duration}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Tombol Simpan Pengaturan */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '16px', marginBottom: '16px' }}
        onClick={handleSave}
        disabled={isSaving}
      >
        <Save size={20} /> {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>

      {/* Tombol Logout Akun */}
      <button
        className="btn btn-danger"
        style={{
          width: '100%',
          padding: '14px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: 'none',
        }}
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        <LogOut size={18} />
        <span>{isLoggingOut ? 'Memproses Keluar...' : 'Keluar dari Akun'}</span>
      </button>
    </>
  );
}
