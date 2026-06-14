import { useState } from 'react';
import { Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    ph_min: 6.5,
    ph_max: 8.5,
    feed_duration: 1000,
    pump_duration: 5000,
    device_name: 'Kolam Utama'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // TODO: Save to Firebase
    alert('Pengaturan berhasil disimpan');
  };

  return (
    <>
      <h2>Pengaturan Sistem</h2>

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

      <button className="btn btn-primary" style={{ width: '100%', padding: '16px' }} onClick={handleSave}>
        <Save size={20} /> Simpan Pengaturan
      </button>
    </>
  );
}
