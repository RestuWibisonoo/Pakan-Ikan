import { useState, useEffect } from 'react';
import { Droplets, Power, Activity } from 'lucide-react';

export default function Dashboard() {
  const [ph, setPh] = useState(7.2);
  const [phStatus, setPhStatus] = useState('aman'); // 'aman', 'asam', 'basa'
  const [lastUpdate, setLastUpdate] = useState('Baru saja');
  const [isFeeding, setIsFeeding] = useState(false);
  const [isPumpOn, setIsPumpOn] = useState(false);

  // Mock data update
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate slight pH changes
      const change = (Math.random() - 0.5) * 0.2;
      setPh(prev => {
        const newPh = Number((prev + change).toFixed(1));
        if (newPh < 6.5) setPhStatus('asam');
        else if (newPh > 8.5) setPhStatus('basa');
        else setPhStatus('aman');
        return newPh;
      });
      setLastUpdate('Baru saja');
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFeed = () => {
    setIsFeeding(true);
    // TODO: Send command to Firebase
    setTimeout(() => {
      setIsFeeding(false);
      alert('Pakan berhasil diberikan');
    }, 2000);
  };

  const handlePump = () => {
    const nextState = !isPumpOn;
    if (nextState) {
      if (confirm('Apakah Anda yakin ingin menyalakan pompa air?')) {
        setIsPumpOn(true);
        // TODO: Send command to Firebase
      }
    } else {
      setIsPumpOn(false);
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
