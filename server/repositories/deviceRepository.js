import { getAdminDatabase, hasDatabaseAccess } from '../config/firebaseAdmin.js';
import config from '../config/appConfig.js';

/**
 * Penyimpanan Data In-Memory Fallback
 * HANYA diperbolehkan di lingkungan testing atau development lokal.
 * Di lingkungan produksi, kegagalan database live akan mengembalikan error 503.
 */
const mockStore = {
  devices: {
    'fish-feeder-001': {
      meta: {
        owner_uid: null, // Dinamis diisi oleh pengguna pertama yang mengklaim
      },
      status: {
        online: true,
        last_seen: new Date().toISOString(),
        ph: 7.2,
        ph_status: 'aman',
        pump_status: 'off',
        servo_status: 'idle',
      },
      settings: {
        ph_min: 6.5,
        ph_max: 8.5,
        feed_duration_ms: 1000,
        pump_duration_ms: 5000,
        device_name: 'Kolam Utama',
      },
      schedules: {
        'sched_1': { id: 'sched_1', time: '07:00', label: 'Pagi', active: true },
        'sched_2': { id: 'sched_2', time: '17:00', label: 'Sore', active: true },
      },
      commands: {
        queue: {},
        history: {},
      },
      logs: {
        ph_logs: [
          { id: 'ph_1', value: 7.2, status: 'aman', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: 'ph_2', value: 7.1, status: 'aman', timestamp: new Date(Date.now() - 7200000).toISOString() },
          { id: 'ph_3', value: 6.9, status: 'aman', timestamp: new Date(Date.now() - 10800000).toISOString() },
        ],
        action_logs: [
          { id: 'act_1', type: 'feed', action: 'Auto Feed', status: 'success', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: 'act_2', type: 'pump', action: 'Manual ON', status: 'success', timestamp: new Date(Date.now() - 7200000).toISOString() },
        ],
      },
    },
  },
};

function getOrCreateMockDevice(deviceId) {
  if (!mockStore.devices[deviceId]) {
    mockStore.devices[deviceId] = {
      meta: { owner_uid: null },
      status: {
        online: false,
        last_seen: new Date().toISOString(),
        ph: 7.0,
        ph_status: 'aman',
        pump_status: 'off',
        servo_status: 'idle',
      },
      settings: {
        ph_min: 6.5,
        ph_max: 8.5,
        feed_duration_ms: 1000,
        pump_duration_ms: 5000,
        device_name: 'Kolam Baru',
      },
      schedules: {},
      commands: { queue: {}, history: {} },
      logs: { ph_logs: [], action_logs: [] },
    };
  }
  return mockStore.devices[deviceId];
}

class DeviceRepository {
  getEffectiveDeviceId(deviceId) {
    return deviceId || config.device.defaultDeviceId;
  }

  /**
   * Menolak silent mock fallback jika server berjalan di environment produksi
   */
  assertDatabaseAvailable() {
    if ((config.nodeEnv === 'production' || process.env.NODE_ENV === 'production') && !hasDatabaseAccess()) {
      const err = new Error(
        'Layanan Firebase Realtime Database belum terkonfigurasi atau tidak tersedia di lingkungan produksi.'
      );
      err.status = 503;
      err.code = 'DATABASE_UNAVAILABLE';
      throw err;
    }
  }

  /**
   * Menangani kegagalan operasi Firebase Realtime Database.
   * Di lingkungan produksi, kegagalan RTDB langsung melempar error 502 (DATABASE_ERROR)
   * untuk mencegah silent fallback ke mock in-memory yang dapat menyesatkan.
   */
  handleDatabaseError(actionName, err) {
    console.warn(`[DeviceRepository] Gagal ${actionName} RTDB (${err.message}).`);
    if (config.nodeEnv === 'production' || process.env.NODE_ENV === 'production') {
      const error = new Error(
        `Gagal berkomunikasi dengan Firebase Realtime Database saat ${actionName}: ${err.message}`
      );
      error.status = 502;
      error.code = 'DATABASE_ERROR';
      throw error;
    }
  }

  /**
   * Mengambil UID pemilik perangkat
   */
  async getDeviceOwner(deviceId) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db.ref(`devices/${id}/meta/owner_uid`).once('value');
          if (snapshot.exists()) {
            return snapshot.val();
          }
        }
      } catch (err) {
        this.handleDatabaseError('membaca owner_uid', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return dev.meta?.owner_uid || null;
  }

  /**
   * Menetapkan atau mengklaim kepemilikan perangkat oleh pengguna
   */
  async setDeviceOwner(deviceId, ownerUid) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/meta/owner_uid`).set(ownerUid);
        }
      } catch (err) {
        this.handleDatabaseError('menyimpan owner_uid', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.meta = dev.meta || {};
    dev.meta.owner_uid = ownerUid;
    return ownerUid;
  }

  /**
   * Mengambil rahasia/kunci unik per perangkat (dukungan per-device secret)
   */
  async getDeviceSecret(deviceId) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db.ref(`devices/${id}/meta/device_key`).once('value');
          if (snapshot.exists()) {
            return snapshot.val();
          }
        }
      } catch (err) {
        this.handleDatabaseError('membaca device_key', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return dev.meta?.device_key || null;
  }

  /**
   * Menetapkan kunci rahasia unik untuk perangkat tertentu
   */
  async setDeviceSecret(deviceId, secretKey) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/meta/device_key`).set(secretKey);
        }
      } catch (err) {
        this.handleDatabaseError('menyimpan device_key', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.meta = dev.meta || {};
    dev.meta.device_key = secretKey;
    return secretKey;
  }

  /**
   * Mengambil status perangkat
   */
  async getStatus(deviceId) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db.ref(`devices/${id}/status`).once('value');
          if (snapshot.exists()) {
            return snapshot.val();
          }
        }
      } catch (err) {
        this.handleDatabaseError('membaca status', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return dev.status;
  }

  /**
   * Memperbarui status perangkat
   */
  async updateStatus(deviceId, patch) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);
    const updated = {
      ...patch,
      last_seen: patch.last_seen || new Date().toISOString(),
    };

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/status`).update(updated);
        }
      } catch (err) {
        this.handleDatabaseError('update status', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.status = { ...dev.status, ...updated };
    return dev.status;
  }

  /**
   * Mengambil pengaturan perangkat
   */
  async getSettings(deviceId) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db.ref(`devices/${id}/settings`).once('value');
          if (snapshot.exists()) {
            return snapshot.val();
          }
        }
      } catch (err) {
        this.handleDatabaseError('membaca settings', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return dev.settings;
  }

  /**
   * Memperbarui pengaturan perangkat
   */
  async updateSettings(deviceId, newSettings) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/settings`).update(newSettings);
        }
      } catch (err) {
        this.handleDatabaseError('menyimpan settings', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.settings = { ...dev.settings, ...newSettings };
    return dev.settings;
  }

  /**
   * Mengambil daftar jadwal pakan
   */
  async getSchedules(deviceId) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db.ref(`devices/${id}/schedules`).once('value');
          if (snapshot.exists()) {
            const val = snapshot.val();
            return Object.values(val || {});
          }
          return [];
        }
      } catch (err) {
        this.handleDatabaseError('membaca jadwal', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return Object.values(dev.schedules || {});
  }

  /**
   * Menyimpan jadwal baru atau memperbarui jadwal
   */
  async saveSchedule(deviceId, schedule) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);
    const scheduleId = schedule.id || `sched_${Date.now()}`;
    const scheduleData = {
      ...schedule,
      id: scheduleId,
      updated_at: new Date().toISOString(),
    };

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/schedules/${scheduleId}`).set(scheduleData);
        }
      } catch (err) {
        this.handleDatabaseError('menyimpan jadwal', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.schedules = dev.schedules || {};
    dev.schedules[scheduleId] = scheduleData;
    return scheduleData;
  }

  /**
   * Menghapus jadwal pakan
   */
  async deleteSchedule(deviceId, scheduleId) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/schedules/${scheduleId}`).remove();
        }
      } catch (err) {
        this.handleDatabaseError('menghapus jadwal', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.schedules = dev.schedules || {};
    const existed = Boolean(dev.schedules[scheduleId]);
    delete dev.schedules[scheduleId];
    return existed;
  }

  /**
   * Membuat perintah baru dalam antrean FIFO (mencegah overwrite race condition)
   */
  async createCommand(deviceId, command) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);
    const cmdId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const commandData = {
      id: cmdId,
      type: command.type, // 'feed' | 'pump'
      params: command.params || {},
      status: command.status || 'pending',
      created_at: command.created_at || new Date().toISOString(),
    };

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/commands/queue/${cmdId}`).set(commandData);
        }
      } catch (err) {
        this.handleDatabaseError('menyimpan command queue', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.commands = dev.commands || { queue: {}, history: {} };
    dev.commands.queue = dev.commands.queue || {};
    dev.commands.queue[cmdId] = commandData;
    return commandData;
  }

  /**
   * Mengambil perintah pending tertua (FIFO) untuk dieksekusi ESP32
   * Membersihkan perintah usang/kedaluwarsa (> 180 detik) untuk mencegah aktuasi pakan basi
   */
  async getLatestPendingCommand(deviceId) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);
    const now = Date.now();
    const COMMAND_EXPIRATION_MS = 180000; // 3 menit timeout kedaluwarsa

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db
            .ref(`devices/${id}/commands/queue`)
            .orderByChild('created_at')
            .once('value');

          if (snapshot.exists()) {
            let activeCommand = null;
            const updates = {};

            snapshot.forEach((child) => {
              const cmd = child.val();
              const createdAt = new Date(cmd.created_at).getTime();

              if (!isNaN(createdAt) && now - createdAt > COMMAND_EXPIRATION_MS) {
                // Evict perintah kedaluwarsa
                updates[`devices/${id}/commands/queue/${child.key}`] = null;
                updates[`devices/${id}/commands/history/${child.key}`] = {
                  ...cmd,
                  status: 'expired',
                  error: 'Perintah kedaluwarsa (perangkat tidak merespons > 3 menit).',
                  finished_at: new Date().toISOString(),
                };
              } else if (!activeCommand) {
                activeCommand = cmd;
              }
            });

            if (Object.keys(updates).length > 0) {
              await db.ref().update(updates);
            }

            return activeCommand;
          }
          return null;
        }
      } catch (err) {
        this.handleDatabaseError('membaca command queue', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.commands = dev.commands || { queue: {}, history: {} };
    const queue = dev.commands.queue || {};
    const keys = Object.keys(queue);
    if (keys.length === 0) return null;

    let activeCommand = null;
    const sorted = keys
      .map((k) => queue[k])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    for (const cmd of sorted) {
      const createdAt = new Date(cmd.created_at).getTime();
      if (!isNaN(createdAt) && now - createdAt > COMMAND_EXPIRATION_MS) {
        delete dev.commands.queue[cmd.id];
        dev.commands.history = dev.commands.history || {};
        dev.commands.history[cmd.id] = {
          ...cmd,
          status: 'expired',
          error: 'Perintah kedaluwarsa (perangkat tidak merespons > 3 menit).',
          finished_at: new Date().toISOString(),
        };
      } else if (!activeCommand) {
        activeCommand = cmd;
      }
    }

    return activeCommand;
  }

  /**
   * Memperbarui status hasil eksekusi perintah dari ESP32 dan menyinkronkan action_logs
   * Mendukung siklus hidup: 'acknowledged' -> 'executing' -> 'completed' | 'failed'
   */
  async updateCommandResult(deviceId, commandId, result) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);
    const nowIso = new Date().toISOString();
    const status = result.status || 'completed';

    // Status perantara: 'acknowledged' atau 'executing'
    if (status === 'acknowledged' || status === 'executing') {
      const interimData = {
        status,
        updated_at: nowIso,
        message: result.message || `Perintah sedang diproses (${status}).`,
      };

      if (hasDatabaseAccess()) {
        try {
          const db = getAdminDatabase();
          if (db) {
            await db.ref(`devices/${id}/commands/queue/${commandId}`).update(interimData);
          }
        } catch (err) {
          this.handleDatabaseError('update interim command', err);
        }
      }

      const dev = getOrCreateMockDevice(id);
      if (dev.commands?.queue?.[commandId]) {
        Object.assign(dev.commands.queue[commandId], interimData);
      }

      await this.updateActionLogStatusByCommandId(id, commandId, status);
      return { id: commandId, ...interimData };
    }

    // Status final: 'completed' atau 'failed'
    const resultData = {
      id: commandId,
      status,
      message: result.message || '',
      error: result.error || null,
      finished_at: nowIso,
    };

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/commands/queue/${commandId}`).remove();
          await db.ref(`devices/${id}/commands/history/${commandId}`).set(resultData);
        }
      } catch (err) {
        this.handleDatabaseError('update command result', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.commands = dev.commands || { queue: {}, history: {} };
    if (dev.commands.queue && dev.commands.queue[commandId]) {
      delete dev.commands.queue[commandId];
    }
    dev.commands.history = dev.commands.history || {};
    dev.commands.history[commandId] = resultData;

    // Sinkronkan status pada riwayat aksi pengguna!
    await this.updateActionLogStatusByCommandId(
      id,
      commandId,
      status === 'completed' ? 'success' : 'failed'
    );

    return resultData;
  }

  /**
   * Memperbarui status log aksi berdasarkan ID perintah yang selesai dieksekusi
   */
  async updateActionLogStatusByCommandId(deviceId, commandId, newStatus) {
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db
            .ref(`devices/${id}/logs/action_logs`)
            .orderByChild('command_id')
            .equalTo(commandId)
            .once('value');

          if (snapshot.exists()) {
            const updates = {};
            snapshot.forEach((child) => {
              updates[`devices/${id}/logs/action_logs/${child.key}/status`] = newStatus;
            });
            await db.ref().update(updates);
          }
        }
      } catch (err) {
        this.handleDatabaseError('sinkronisasi status action_log', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    if (dev.logs?.action_logs) {
      for (const log of dev.logs.action_logs) {
        if (log.command_id === commandId) {
          log.status = newStatus;
        }
      }
    }
  }

  /**
   * Menambahkan log nilai pH dengan retensi data
   */
  async addPhLog(deviceId, logEntry) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);
    const logId = `ph_${Date.now()}`;
    const data = {
      id: logId,
      value: Number(logEntry.value),
      status: logEntry.status,
      timestamp: logEntry.timestamp || new Date().toISOString(),
    };

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/logs/ph_logs/${logId}`).set(data);
        }
      } catch (err) {
        this.handleDatabaseError('simpan log pH', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.logs = dev.logs || { ph_logs: [], action_logs: [] };
    dev.logs.ph_logs.unshift(data);
    if (dev.logs.ph_logs.length > 200) dev.logs.ph_logs.pop();
    return data;
  }

  /**
   * Mengambil riwayat nilai pH
   */
  async getPhLogs(deviceId, limit = 50) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db
            .ref(`devices/${id}/logs/ph_logs`)
            .limitToLast(limit)
            .once('value');
          if (snapshot.exists()) {
            const val = snapshot.val();
            return Object.values(val || {}).reverse();
          }
          return [];
        }
      } catch (err) {
        this.handleDatabaseError('membaca log pH', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return (dev.logs?.ph_logs || []).slice(0, limit);
  }

  /**
   * Menambahkan log aksi (pakan / pompa) dengan status awal
   */
  async addActionLog(deviceId, logEntry) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);
    const logId = `act_${Date.now()}`;
    const data = {
      id: logId,
      type: logEntry.type, // 'feed' | 'pump'
      action: logEntry.action,
      status: logEntry.status || 'pending', // 'pending' | 'success' | 'failed'
      command_id: logEntry.command_id || null,
      timestamp: logEntry.timestamp || new Date().toISOString(),
    };

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/logs/action_logs/${logId}`).set(data);
        }
      } catch (err) {
        this.handleDatabaseError('simpan log aksi', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.logs = dev.logs || { ph_logs: [], action_logs: [] };
    dev.logs.action_logs.unshift(data);
    if (dev.logs.action_logs.length > 200) dev.logs.action_logs.pop();
    return data;
  }

  /**
   * Mengambil riwayat log aksi
   */
  async getActionLogs(deviceId, limit = 50) {
    this.assertDatabaseAvailable();
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db
            .ref(`devices/${id}/logs/action_logs`)
            .limitToLast(limit)
            .once('value');
          if (snapshot.exists()) {
            const val = snapshot.val();
            return Object.values(val || {}).reverse();
          }
          return [];
        }
      } catch (err) {
        this.handleDatabaseError('membaca log aksi', err);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return (dev.logs?.action_logs || []).slice(0, limit);
  }
}

export const deviceRepository = new DeviceRepository();
export default deviceRepository;
