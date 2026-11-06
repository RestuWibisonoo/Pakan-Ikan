import { useState, useEffect } from 'react';
import { Activity, Droplets, Power, Loader2 } from 'lucide-react';
import iotApi from '../services/iotApi';

export default function History() {
  const [tab, setTab] = useState('ph'); // 'ph' or 'action'
  const [phLogs, setPhLogs] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      iotApi.getPhLogs(30).catch(() => ({ data: [] })),
      iotApi.getActionLogs(30).catch(() => ({ data: [] })),
    ])
      .then(([phRes, actionRes]) => {
        if (!isMounted) return;

        if (phRes?.data && Array.isArray(phRes.data)) {
          const formattedPh = phRes.data.map((item) => ({
            id: item.id,
            time: item.timestamp
              ? new Date(item.timestamp)
                  .toLocaleTimeString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                  .replace(/\./g, ':') + ' WIB'
              : 'Baru saja',
            value: item.value,
            status: item.status,
          }));
          setPhLogs(formattedPh);
        }

        if (actionRes?.data && Array.isArray(actionRes.data)) {
          const formattedAction = actionRes.data.map((item) => ({
            id: item.id,
            time: item.timestamp
              ? new Date(item.timestamp)
                  .toLocaleTimeString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                  .replace(/\./g, ':') + ' WIB'
              : 'Baru saja',
            type: item.type,
            action: item.action,
            status: item.status,
          }));
          setActionLogs(formattedAction);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2
              size={24}
              color="var(--primary)"
              style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }}
            />
            <div>Memuat data riwayat...</div>
          </div>
        ) : tab === 'ph' ? (
          phLogs.length > 0 ? (
            phLogs.map((log) => (
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
            ))
          ) : (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Belum ada riwayat pembacaan pH</p>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>
                Data pH akan otomatis tercatat saat sensor ESP32 mengirim telemetri.
              </p>
            </div>
          )
        ) : actionLogs.length > 0 ? (
          actionLogs.map((log) => (
            <div key={log.id} className="list-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
                  {log.type === 'feed' ? (
                    <Droplets size={20} color="var(--primary)" />
                  ) : (
                    <Power size={20} color="var(--primary)" />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{log.action}</div>
                  <div className="item-subtitle">{log.time}</div>
                </div>
              </div>
              {log.status === 'success' ? (
                <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                  Berhasil
                </span>
              ) : log.status === 'pending' ? (
                <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                  Menunggu
                </span>
              ) : (
                <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                  Gagal
                </span>
              )}
            </div>
          ))
        ) : (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Belum ada riwayat aksi</p>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>
              Aksi manual pemberian pakan dan pompa air akan dicatat di sini.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
