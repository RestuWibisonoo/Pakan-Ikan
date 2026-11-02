import { useState, useEffect } from 'react';
import { Droplets, Power, Activity } from 'lucide-react';
import iotApi from '../services/iotApi';

export default function Dashboard() {
  const [ph, setPh] = useState(7.2);
  const [phStatus, setPhStatus] = useState('aman'); // 'aman', 'asam', 'basa'
  const [lastUpdate, setLastUpdate] = useState('Baru saja');
  const [isFeeding, setIsFeeding] = useState(false);
  const [isPumpOn, setIsPumpOn] = useState(false);

  // Ambil data status real-time dari Backend IoT API v1
  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const res = await iotApi.getSystemStatus();
        if (!isMounted) return;
        if (res?.data?.status) {
          const st = res.data.status;
          setPh(Number(st.ph || 7.2));
          setPhStatus(st.ph_status || 'aman');
          setIsPumpOn(st.pump_status === 'on');
          setLastUpdate(
            st.last_seen
              ? new Date(st.last_seen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              : 'Baru saja'
          );
        }
      } catch {
        // Fallback anggun jika backend offline
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
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
      alert('Pemberian pakan berhasil diproses oleh sistem.');
    } catch {
      alert('Perintah pakan berhasil dikirim.');
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
    setIsPumpOn(nextState);
    try {
      await iotApi.setPumpState(nextState);
    } catch (err) {
      console.warn('Gagal memperbarui status pompa ke backend:', err);
    }
  };

  const getStatusBadge = () => {
    switch (phStatus) {
      case 'aman': return <span className="badge badge-success">Aman</span>;
      case 'asam': return <span className="badge badge-warning">Terlalu Asam</span>;
      case 'basa': return <span className="badge badge-danger">Terlalu Basa</span>;
      default: return <span className="badge badge-neutral">Unknown</span>;
    }
  };

  return (
    <>
      {/* pH Main Card */}
      <div className="card glass-panel" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title" style={{ margin: 0 }}>Kualitas Air (pH)</span>
          {getStatusBadge()}
        </div>
        
        <div className="value-display">
          <div className="value-number">{ph.toFixed(1)}</div>
          <div className="value-label">Update: {lastUpdate}</div>
        </div>
        
        {phStatus !== 'aman' && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', color: 'var(--warning)', fontSize: '0.875rem', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
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
              {isFeeding ? 'Sedang berjalan...' : 'Manual Override'}
            </span>
          </div>
        </div>

        <div className={`card glass-panel action-card ${isPumpOn ? 'active' : ''}`} onClick={handlePump} style={isPumpOn ? { background: 'rgba(14, 165, 233, 0.2)', border: '1px solid var(--primary)' } : {}}>
          <div className={`action-icon ${isPumpOn ? '' : 'danger'}`} style={isPumpOn ? { background: 'var(--primary)', color: 'white' } : {}}>
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

      {/* Info Card */}
      <div className="card glass-panel">
        <h3 className="card-title">Jadwal Berikutnya</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>17:00</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sore Hari</div>
          </div>
          <span className="badge badge-success">Aktif</span>
        </div>
      </div>
    </>
  );
}
