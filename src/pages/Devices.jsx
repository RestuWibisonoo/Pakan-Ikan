import { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Plus,
  Trash2,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  KeyRound,
  Terminal,
  Activity,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import iotApi from '../services/iotApi';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDeviceId, setActiveDeviceIdState] = useState(iotApi.getActiveDeviceId());

  // State Form Tambah Perangkat
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceKey, setNewDeviceKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Ambil daftar perangkat dari backend
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setFormError('');
    try {
      const res = await iotApi.getDevices();
      if (res?.data && Array.isArray(res.data)) {
        setDevices(res.data);

        // Jika belum ada activeDeviceId atau activeDeviceId tidak ada di daftar, pilih perangkat pertama
        const currentActive = iotApi.getActiveDeviceId();
        const exists = res.data.some((d) => d.deviceId === currentActive);

        if (!currentActive || !exists) {
          const firstId = res.data[0]?.deviceId || '';
          if (firstId) {
            iotApi.setActiveDeviceId(firstId);
            setActiveDeviceIdState(firstId);
          }
        } else {
          setActiveDeviceIdState(currentActive);
        }
      }
    } catch (err) {
      console.warn('[Devices] Gagal memuat daftar perangkat:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Handler memilih perangkat aktif untuk dashboard
  const handleSelectActiveDevice = (deviceId) => {
    iotApi.setActiveDeviceId(deviceId);
    setActiveDeviceIdState(deviceId);
    // Notifikasi singkat atau trigger update
  };

  // Handler salin teks ke clipboard
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handler Submit Tambah Perangkat Baru
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanId = newDeviceId.trim();
    const cleanName = newDeviceName.trim() || cleanId;
    const cleanKey = newDeviceKey.trim();

    if (!cleanId) {
      setFormError('ID Perangkat (Device ID) wajib diisi.');
      return;
    }

    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(cleanId)) {
      setFormError(
        'Format ID Perangkat tidak valid. Gunakan 3-64 karakter huruf, angka, tanda hubung (-), atau garis bawah (_).'
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await iotApi.registerDevice({
        deviceId: cleanId,
        deviceName: cleanName,
        deviceKey: cleanKey || undefined,
      });

      setFormSuccess(res?.message || `Perangkat '${cleanId}' berhasil didaftarkan!`);
      setNewDeviceId('');
      setNewDeviceName('');
      setNewDeviceKey('');

      // Refresh daftar dan jadikan perangkat baru sebagai perangkat aktif
      await fetchDevices();
      iotApi.setActiveDeviceId(cleanId);
      setActiveDeviceIdState(cleanId);
      setShowAddForm(false);
    } catch (err) {
      setFormError(err.message || 'Gagal mendaftarkan perangkat. Periksa koneksi Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Hapus / Lepas Tautan Perangkat
  const handleUnpair = async (deviceId, deviceName) => {
    const confirmMsg = `Apakah Anda yakin ingin melepas tautan perangkat '${deviceName || deviceId}' dari akun Anda?\n\nAlat IoT ini tidak akan lagi dapat mengirim telemetri ke akun Anda sampai didaftarkan kembali.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await iotApi.unpairDevice(deviceId);
      await fetchDevices();
    } catch (err) {
      alert(`Gagal melepas tautan perangkat: ${err.message}`);
    }
  };

  const activeDevice = devices.find((d) => d.deviceId === activeDeviceId) || devices[0];

  return (
    <div style={{ paddingBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Manajemen Perangkat IoT</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Hubungkan modul hardware ESP32 / Pakan Ikan ke akun Anda
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={fetchDevices}
          disabled={loading}
          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          title="Segarkan daftar perangkat"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span style={{ display: 'none' }}>Refresh</span>
        </button>
      </div>

      {formSuccess && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#86efac',
            padding: '12px 14px',
            borderRadius: '12px',
            fontSize: '0.875rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Ringkasan Perangkat Aktif */}
      {activeDevice && (
        <div
          className="card glass-panel"
          style={{
            marginBottom: '20px',
            border: '1px solid rgba(14, 165, 233, 0.35)',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
              >
                <Cpu size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {activeDevice.deviceName}
                  </span>
                  <span
                    style={{
                      background: 'rgba(14, 165, 233, 0.2)',
                      color: 'var(--primary)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    Aktif di Dashboard
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeDevice.deviceId}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeDevice.deviceId, 'active-id')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                    title="Salin ID Perangkat"
                  >
                    {copiedId === 'active-id' ? <Check size={14} color="#86efac" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-indicator ${activeDevice.online ? 'online' : 'offline'}`} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: activeDevice.online ? '#86efac' : 'var(--text-muted)' }}>
                {activeDevice.online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.8rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Kadar pH</span>
              <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                {activeDevice.ph !== null ? activeDevice.ph : '-'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Status Pompa</span>
              <strong
                style={{
                  fontSize: '0.9rem',
                  color: activeDevice.pumpStatus === 'on' ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >
                {activeDevice.pumpStatus === 'on' ? 'Menyala' : 'Mati'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Terakhir Dilihat</span>
              <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {activeDevice.lastSeen
                  ? new Date(activeDevice.lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : 'Belum ada'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Tombol Tambah Perangkat & Panduan */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setFormError('');
          }}
        >
          <Plus size={18} />
          <span>{showAddForm ? 'Tutup Formulir' : 'Tambah Perangkat Baru'}</span>
        </button>

        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setShowGuide((prev) => !prev)}
          title="Panduan setting hardware IoT"
        >
          <Terminal size={18} />
          <span style={{ display: 'none' }}>Panduan</span>
          {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Formulir Tambah Perangkat Baru */}
      {showAddForm && (
        <div
          className="card glass-panel"
          style={{
            marginBottom: '24px',
            border: '1px solid rgba(14, 165, 233, 0.4)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--primary)" />
            <span>Daftarkan Modul Perangkat IoT</span>
          </h3>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
            Masukkan ID unik yang diprogram ke dalam ESP32 atau stiker kode alat Pakan Ikan Anda untuk mengklaim kepemilikannya.
          </p>

          {formError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleRegisterDevice}>
            {/* Input Device ID */}
            <div className="input-group" style={{ marginBottom: '14px' }}>
              <label className="input-label" htmlFor="device-id">
                ID Perangkat (Device ID) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="device-id"
                type="text"
                className="input-field"
                placeholder="misal: fish-feeder-002 atau esp32-kolam-01"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Hanya huruf, angka, tanda hubung (-), dan garis bawah (_). Panjang 3-64 karakter.
              </span>
            </div>

            {/* Input Device Name */}
            <div className="input-group" style={{ marginBottom: '14px' }}>
              <label className="input-label" htmlFor="device-name">
                Nama Kolam / Perangkat
              </label>
              <input
                id="device-name"
                type="text"
                className="input-field"
                placeholder="misal: Kolam Nila Belakang atau Kolam Utama"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
              />
            </div>

            {/* Input Secret Key (Opsional) */}
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label className="input-label" htmlFor="device-key">
                Kunci Rahasia Perangkat (Opsional / Per-Device Secret)
              </label>
              <input
                id="device-key"
                type="text"
                className="input-field"
                placeholder="Kosongkan jika menggunakan kunci standar sistem"
                value={newDeviceKey}
                onChange={(e) => setNewDeviceKey(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Digunakan untuk otentikasi header <code>X-Device-Key</code> dari hardware.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px' }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  <span>Tautkan Perangkat ke Akun</span>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAddForm(false)}
                disabled={submitting}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Panduan Integrasi Hardware ESP32 */}
      {showGuide && (
        <div
          className="card glass-panel"
          style={{
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(15, 23, 42, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Terminal size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Panduan Konfigurasi Hardware ESP32</h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
            Pada kode firmware Arduino IDE / PlatformIO perangkat ESP32 Anda, kirimkan permintaan HTTP dengan menyertakan header otentikasi berikut:
          </p>

          <div
            style={{
              background: '#090d16',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#38bdf8',
              lineHeight: 1.6,
              overflowX: 'auto',
              marginBottom: '14px',
            }}
          >
            <div>// Endpoint REST API Publik Gateway:</div>
            <div style={{ color: '#f8fafc' }}>POST https://api.pakan-ikan.my.id/api/v1/device/telemetry</div>
            <br />
            <div>// Header HTTP Wajib:</div>
            <div style={{ color: '#a5f3fc' }}>Content-Type: application/json</div>
            <div style={{ color: '#a5f3fc' }}>X-Device-Id: {activeDevice?.deviceId || 'fish-feeder-001'}</div>
            <div style={{ color: '#a5f3fc' }}>X-Device-Key: &lt;KUNCI_RAHASIA_PERANGKAT&gt;</div>
            <br />
            <div>// Payload Body Telemetri:</div>
            <div style={{ color: '#fed7aa' }}>
              {JSON.stringify({ ph: 7.2, pump_status: 'off', servo_status: 'idle' }, null, 2)}
            </div>
          </div>
        </div>
      )}

      {/* Daftar Semua Perangkat Terdaftar */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Layers size={18} color="var(--primary)" />
        <span>Daftar Perangkat Saya ({devices.length})</span>
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--primary)' }} />
          <span>Memuat data perangkat...</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="card glass-panel" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <Cpu size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)', opacity: 0.5 }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>Belum Ada Perangkat</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Anda belum mendaftarkan modul perangkat IoT ke akun ini.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '10px 18px', margin: '0 auto' }}
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} />
            <span>Tambah Perangkat Pertama</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {devices.map((dev) => {
            const isCurrentActive = dev.deviceId === activeDeviceId;

            return (
              <div
                key={dev.deviceId}
                className="card glass-panel"
                style={{
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: isCurrentActive ? '1px solid rgba(14, 165, 233, 0.45)' : '1px solid var(--border)',
                  background: isCurrentActive ? 'rgba(14, 165, 233, 0.05)' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: isCurrentActive ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCurrentActive ? 'var(--primary)' : 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    <Cpu size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {dev.deviceName}
                      </span>
                      <span className={`status-indicator ${dev.online ? 'online' : 'offline'}`} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID:</span>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dev.deviceId}</code>
                      <button
                        type="button"
                        onClick={() => handleCopy(dev.deviceId, dev.deviceId)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                        title="Salin ID"
                      >
                        {copiedId === dev.deviceId ? <Check size={12} color="#86efac" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isCurrentActive ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        padding: '6px 10px',
                        background: 'rgba(14, 165, 233, 0.15)',
                        borderRadius: '8px',
                      }}
                    >
                      Aktif
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => handleSelectActiveDevice(dev.deviceId)}
                    >
                      Gunakan
                    </button>
                  )}

                  {!dev.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleUnpair(dev.deviceId, dev.deviceName)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        padding: '6px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Lepas Tautan Perangkat"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
