import { useState, useEffect } from 'react';
import { Droplets, Power, Activity, Clock, Loader2, Cpu } from 'lucide-react';
import iotApi from '../services/iotApi';

export default function Dashboard() {
  const [ph, setPh] = useState(null);
  const [phStatus, setPhStatus] = useState('aman'); // 'aman', 'asam', 'basa'
  const [lastUpdate, setLastUpdate] = useState('Menghubungkan...');
  const [isFeeding, setIsFeeding] = useState(false);
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [nextSchedule, setNextSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceName, setDeviceName] = useState('');
  const activeDeviceId = iotApi.getActiveDeviceId() || 'fish-feeder-001';

  // Ambil data status real-time dan jadwal berikutnya dari Backend IoT API v1
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [statusRes, schedRes] = await Promise.all([
          iotApi.getSystemStatus().catch(() => null),
          iotApi.getSchedules().catch(() => null),
        ]);

        if (!isMounted) return;

        if (statusRes?.data?.status) {
          const st = statusRes.data.status;
          setPh(st.ph !== null && st.ph !== undefined ? Number(st.ph) : null);
          setPhStatus(st.ph_status || (st.ph !== null && st.ph !== undefined ? 'aman' : 'menunggu'));
          setIsPumpOn(st.pump_status === 'on');
          setLastUpdate(
            st.last_seen
              ? new Date(st.last_seen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              : 'Belum ada data'
          );
        }

        if (statusRes?.data?.settings?.device_name) {
          setDeviceName(statusRes.data.settings.device_name);
        }

        // Hitung jadwal aktif berikutnya berdasarkan waktu lokal saat ini
        if (schedRes?.data && Array.isArray(schedRes.data)) {
          const active = schedRes.data.filter((s) => s.active);
          if (active.length > 0) {
            const now = new Date();
            const currentHourMinute = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const laterToday = active
              .filter((s) => s.time >= currentHourMinute)
              .sort((a, b) => a.time.localeCompare(b.time));

            if (laterToday.length > 0) {
              setNextSchedule(laterToday[0]);
            } else {
              const earliestTomorrow = [...active].sort((a, b) => a.time.localeCompare(b.time))[0];
              setNextSchedule({ ...earliestTomorrow, label: `${earliestTomorrow.label || 'Pakan'} (Besok)` });
            }
          } else {
            setNextSchedule(null);
          }
        }
      } catch {
        // Fallback anggun jika backend sedang offline
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleFeed = async () => {
    if (isFeeding) return;
    setIsFeeding(true);
    try {
      await iotApi.triggerFeed();
      alert('Perintah pakan berhasil dikirim ke antrean perangkat.');
    } catch (err) {
      alert(`Gagal mengirim perintah pakan: ${err.message || 'Koneksi backend gagal.'}`);
    } finally {
      setIsFeeding(false);
    }
  };

  const handlePump = async () => {
    const nextState = !isPumpOn;
    if (nextState) {
      if (!confirm('Apakah Anda yakin ingin menyalakan pompa air?')) {
        return;
      }
    }
    // Optimistic UI update
    setIsPumpOn(nextState);
    try {
      await iotApi.setPumpState(nextState);
    } catch (err) {
      // Rollback jika request backend gagal
      setIsPumpOn(!nextState);
      alert(`Gagal mengubah status pompa: ${err.message || 'Koneksi gagal.'}`);
    }
  };

  const getStatusBadge = () => {
    switch (phStatus) {
      case 'aman':
        return <span className="badge badge-success">Aman</span>;
      case 'asam':
        return <span className="badge badge-warning">Terlalu Asam</span>;
      case 'basa':
        return <span className="badge badge-danger">Terlalu Basa</span>;
      case 'menunggu':
        return <span className="badge badge-neutral">Menunggu Alat</span>;
      default:
        return <span className="badge badge-neutral">Normal</span>;
    }
  };

  return (
    <>
      {/* Device Info Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border)',
            padding: '4px 10px',
            borderRadius: '20px',
          }}
        >
          <Cpu size={14} color="var(--primary)" />
          <span>
            Kolam: <strong style={{ color: 'var(--text-main)' }}>{deviceName || 'Kolam Utama'}</strong>
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Update: {lastUpdate}
        </span>
      </div>

      {/* pH Main Card */}
      <div className="card glass-panel" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title" style={{ margin: 0 }}>
            Kualitas Air (pH)
          </span>
          {getStatusBadge()}
        </div>

        <div className="value-display">
          <div className="value-number">
            {loading && ph === null ? (
              <Loader2 size={36} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
            ) : ph !== null ? (
              ph.toFixed(1)
            ) : (
              '--'
            )}
          </div>
          <div className="value-label">
            {ph !== null ? `Update: ${lastUpdate}` : 'Menunggu koneksi & pembacaan sensor probe ESP32'}
          </div>
        </div>

        {(phStatus === 'asam' || phStatus === 'basa') && ph !== null && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              color: 'var(--warning)',
              fontSize: '0.875rem',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'left',
            }}
          >
            <Activity size={18} />
            <span>Peringatan: pH berada di luar batas aman. Cek kondisi kolam.</span>
          </div>
        )}
      </div>

      {/* Manual Actions Grid */}
      <div className="action-grid">
        <div className="card glass-panel action-card" onClick={handleFeed}>
          <div className="action-icon">
            <Droplets size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Beri Pakan</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isFeeding ? 'Mengirim perintah...' : 'Manual Override'}
            </span>
          </div>
        </div>

        <div
          className={`card glass-panel action-card ${isPumpOn ? 'active' : ''}`}
          onClick={handlePump}
          style={isPumpOn ? { background: 'rgba(14, 165, 233, 0.2)', border: '1px solid var(--primary)' } : {}}
        >
          <div
            className={`action-icon ${isPumpOn ? '' : 'danger'}`}
            style={isPumpOn ? { background: 'var(--primary)', color: 'white' } : {}}
          >
            <Power size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Pompa Air</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isPumpOn ? 'Menyala' : 'Mati'}
            </span>
          </div>
        </div>
      </div>

      {/* Info Card: Jadwal Berikutnya Dinamis */}
      <div className="card glass-panel">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--primary)" />
          <span>Jadwal Pakan Berikutnya</span>
        </h3>
        {nextSchedule ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'Outfit' }}>
                {nextSchedule.time}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {nextSchedule.label || 'Pakan Otomatis'}
              </div>
            </div>
            <span className="badge badge-success">Aktif</span>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '6px 0' }}>
            Belum ada jadwal pakan otomatis yang aktif.
          </div>
        )}
      </div>
    </>
  );
}
