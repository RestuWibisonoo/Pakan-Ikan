import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import iotApi from '../services/iotApi';

export default function Schedules() {
  const [schedules, setSchedules] = useState([
    { id: 'sched_1', time: '07:00', label: 'Pagi', active: true },
    { id: 'sched_2', time: '17:00', label: 'Sore', active: true },
  ]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTime, setNewTime] = useState('12:00');
  const [newLabel, setNewLabel] = useState('Siang');

  // Ambil jadwal pakan dari backend
  useEffect(() => {
    let isMounted = true;
    iotApi
      .getSchedules()
      .then((res) => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setSchedules(res.data);
        }
      })
      .catch(() => {
        // Fallback ke state lokal
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleSchedule = async (id) => {
    const target = schedules.find((s) => s.id === id);
    if (!target) return;

    const nextActive = !target.active;
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: nextActive } : s))
    );

    try {
      await iotApi.updateSchedule(id, { ...target, active: nextActive });
    } catch (err) {
      console.warn('Gagal sinkronisasi update jadwal:', err);
    }
  };

  const deleteSchedule = async (id) => {
    if (confirm('Hapus jadwal ini?')) {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      try {
        await iotApi.deleteSchedule(id);
      } catch (err) {
        console.warn('Gagal menghapus jadwal dari backend:', err);
      }
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!newTime) return;

    setLoading(true);
    const newEntry = {
      time: newTime,
      label: newLabel || 'Pakan',
      active: true,
    };

    try {
      const res = await iotApi.createSchedule(newEntry);
      const created = res?.data || { ...newEntry, id: `sched_${Date.now()}` };
      setSchedules((prev) => [...prev, created]);
      setShowAddForm(false);
      setNewTime('12:00');
      setNewLabel('Siang');
    } catch {
      // Fallback lokal
      setSchedules((prev) => [...prev, { ...newEntry, id: `sched_${Date.now()}` }]);
      setShowAddForm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ margin: 0 }}>Jadwal Pakan</h2>
        <button
          className="btn btn-primary"
          style={{ padding: '8px 14px', fontSize: '0.875rem' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={16} /> {showAddForm ? 'Batal' : 'Tambah'}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSchedule}
          className="card glass-panel"
          style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <h3 style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="var(--primary)" />
            <span>Tambah Jadwal Otomatis Baru</span>
          </h3>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Waktu (HH:mm)
              </label>
              <input
                type="time"
                className="input-field"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Keterangan
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Contoh: Siang / Malam"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px' }}
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan Jadwal'}
          </button>
        </form>
      )}

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
                aria-label="Hapus Jadwal"
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
        <p style={{ margin: 0 }}>
          <strong>Info:</strong> Jadwal otomatis tersinkronisasi ke perangkat ESP32 melalui RTC/NTP time.
        </p>
      </div>
    </>
  );
}
