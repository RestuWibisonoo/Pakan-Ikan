import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function Schedules() {
  const [schedules, setSchedules] = useState([
    { id: '1', time: '07:00', label: 'Pagi', active: true },
    { id: '2', time: '17:00', label: 'Sore', active: true },
  ]);

  const toggleSchedule = (id) => {
    setSchedules(schedules.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const deleteSchedule = (id) => {
    if (confirm('Hapus jadwal ini?')) {
      setSchedules(schedules.filter(s => s.id !== id));
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2>Jadwal Pakan</h2>
        <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '0.875rem' }}>
          <Plus size={16} /> Tambah
        </button>
      </div>

      <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {schedules.map((schedule) => (
          <div key={schedule.id} className="list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Outfit' }}>{schedule.time}</div>
                <div className="item-subtitle">{schedule.label}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={schedule.active} 
                  onChange={() => toggleSchedule(schedule.id)} 
                />
                <span className="slider"></span>
              </label>
              
              <button 
                onClick={() => deleteSchedule(schedule.id)}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada jadwal pakan
          </div>
        )}
      </div>
      
      <div style={{ padding: '16px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '12px', fontSize: '0.875rem', marginTop: '16px' }}>
        <p><strong>Info:</strong> Jadwal menggunakan zona waktu ESP32 (biasanya tersinkronisasi via NTP).</p>
      </div>
    </>
  );
}
