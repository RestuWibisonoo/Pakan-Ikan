import { useState } from 'react';
import { Activity, Droplets, Power } from 'lucide-react';

export default function History() {
  const [tab, setTab] = useState('ph'); // 'ph' or 'action'

  const mockPhLogs = [
    { id: 1, time: '14:00', value: 7.2, status: 'aman' },
    { id: 2, time: '13:00', value: 7.1, status: 'aman' },
    { id: 3, time: '12:00', value: 6.9, status: 'aman' },
    { id: 4, time: '11:00', value: 6.4, status: 'asam' },
  ];

  const mockActionLogs = [
    { id: 1, time: '14:01', type: 'pump', action: 'Manual ON', status: 'success' },
    { id: 2, time: '07:00', type: 'feed', action: 'Auto Feed', status: 'success' },
    { id: 3, time: '17:00', type: 'feed', action: 'Auto Feed', status: 'failed' },
  ];

  return (
    <>
      <h2>Riwayat</h2>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          className={`btn ${tab === 'ph' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
          onClick={() => setTab('ph')}
        >
          <Activity size={18} /> Nilai pH
        </button>
        <button 
          className={`btn ${tab === 'action' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
          onClick={() => setTab('action')}
        >
          <Droplets size={18} /> Aksi
        </button>
      </div>

      <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {tab === 'ph' && mockPhLogs.map(log => (
          <div key={log.id} className="list-item">
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>pH {log.value}</div>
              <div className="item-subtitle">{log.time}</div>
            </div>
            {log.status === 'aman' ? (
              <span className="badge badge-success">Aman</span>
            ) : log.status === 'asam' ? (
              <span className="badge badge-warning">Asam</span>
            ) : (
              <span className="badge badge-danger">Basa</span>
            )}
          </div>
        ))}

        {tab === 'action' && mockActionLogs.map(log => (
          <div key={log.id} className="list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
                {log.type === 'feed' ? <Droplets size={20} color="var(--primary)" /> : <Power size={20} color="var(--primary)" />}
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{log.action}</div>
                <div className="item-subtitle">{log.time}</div>
              </div>
            </div>
            {log.status === 'success' ? (
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Berhasil</span>
            ) : (
              <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>Gagal</span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
