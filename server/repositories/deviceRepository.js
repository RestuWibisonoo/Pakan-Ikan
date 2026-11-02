import { getAdminDatabase, hasDatabaseAccess } from '../config/firebaseAdmin.js';
import config from '../config/appConfig.js';

/**
 * Penyimpanan Data In-Memory Fallback
 * Digunakan jika server berjalan tanpa service account live atau saat unit testing
 */
const mockStore = {
  devices: {
    'fish-feeder-001': {
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
        pending: null,
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
      commands: { pending: null },
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
   * Mengambil status perangkat
   */
  async getStatus(deviceId) {
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
        console.warn(`[DeviceRepository] Gagal membaca Realtime Database (${err.message}), beralih ke cache lokal.`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return dev.status;
  }

  /**
   * Memperbarui status perangkat
   */
  async updateStatus(deviceId, patch) {
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
        console.warn(`[DeviceRepository] Gagal update RTDB (${err.message}), simpan ke cache lokal.`);
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
        console.warn(`[DeviceRepository] Gagal membaca settings RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return dev.settings;
  }

  /**
   * Memperbarui pengaturan perangkat
   */
  async updateSettings(deviceId, newSettings) {
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/settings`).update(newSettings);
        }
      } catch (err) {
        console.warn(`[DeviceRepository] Gagal menyimpan settings RTDB (${err.message}).`);
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
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db.ref(`devices/${id}/schedules`).once('value');
          if (snapshot.exists()) {
            const val = snapshot.val();
            return Object.values(val);
          }
        }
      } catch (err) {
        console.warn(`[DeviceRepository] Gagal membaca jadwal RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return Object.values(dev.schedules);
  }

  /**
   * Menyimpan jadwal baru atau memperbarui jadwal
   */
  async saveSchedule(deviceId, schedule) {
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
        console.warn(`[DeviceRepository] Gagal menyimpan jadwal RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.schedules[scheduleId] = scheduleData;
    return scheduleData;
  }

  /**
   * Menghapus jadwal pakan
   */
  async deleteSchedule(deviceId, scheduleId) {
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/schedules/${scheduleId}`).remove();
        }
      } catch (err) {
        console.warn(`[DeviceRepository] Gagal menghapus jadwal RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    const existed = Boolean(dev.schedules[scheduleId]);
    delete dev.schedules[scheduleId];
    return existed;
  }

  /**
   * Membuat perintah baru untuk ESP32 (misal feed atau pump)
   */
  async createCommand(deviceId, command) {
    const id = this.getEffectiveDeviceId(deviceId);
    const cmdId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const commandData = {
      id: cmdId,
      type: command.type, // 'feed' | 'pump'
      params: command.params || {},
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/commands/pending`).set(commandData);
        }
      } catch (err) {
        console.warn(`[DeviceRepository] Gagal menyimpan command RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.commands.pending = commandData;
    return commandData;
  }

  /**
   * Mengambil perintah pending terbaru untuk dieksekusi ESP32
   */
  async getLatestPendingCommand(deviceId) {
    const id = this.getEffectiveDeviceId(deviceId);

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          const snapshot = await db.ref(`devices/${id}/commands/pending`).once('value');
          if (snapshot.exists()) {
            return snapshot.val();
          }
        }
      } catch (err) {
        console.warn(`[DeviceRepository] Gagal membaca command pending RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return dev.commands.pending;
  }

  /**
   * Memperbarui status hasil eksekusi perintah dari ESP32
   */
  async updateCommandResult(deviceId, commandId, result) {
    const id = this.getEffectiveDeviceId(deviceId);
    const finishedAt = new Date().toISOString();

    const resultData = {
      id: commandId,
      status: result.status || 'completed', // 'completed' | 'failed'
      error: result.error || null,
      finished_at: finishedAt,
    };

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/commands/pending`).remove();
          await db.ref(`devices/${id}/commands/history/${commandId}`).set(resultData);
        }
      } catch (err) {
        console.warn(`[DeviceRepository] Gagal update command result RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    if (dev.commands.pending?.id === commandId) {
      dev.commands.pending = null;
    }
    return resultData;
  }

  /**
   * Menambahkan log nilai pH
   */
  async addPhLog(deviceId, logEntry) {
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
        console.warn(`[DeviceRepository] Gagal simpan log pH RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.logs.ph_logs.unshift(data);
    if (dev.logs.ph_logs.length > 100) dev.logs.ph_logs.pop();
    return data;
  }

  /**
   * Mengambil riwayat nilai pH
   */
  async getPhLogs(deviceId, limit = 50) {
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
            return Object.values(val).reverse();
          }
        }
      } catch (err) {
        console.warn(`[DeviceRepository] Gagal membaca log pH RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return dev.logs.ph_logs.slice(0, limit);
  }

  /**
   * Menambahkan log aksi (pakan / pompa)
   */
  async addActionLog(deviceId, logEntry) {
    const id = this.getEffectiveDeviceId(deviceId);
    const logId = `act_${Date.now()}`;
    const data = {
      id: logId,
      type: logEntry.type, // 'feed' | 'pump'
      action: logEntry.action,
      status: logEntry.status, // 'success' | 'failed'
      timestamp: logEntry.timestamp || new Date().toISOString(),
    };

    if (hasDatabaseAccess()) {
      try {
        const db = getAdminDatabase();
        if (db) {
          await db.ref(`devices/${id}/logs/action_logs/${logId}`).set(data);
        }
      } catch (err) {
        console.warn(`[DeviceRepository] Gagal simpan log aksi RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    dev.logs.action_logs.unshift(data);
    if (dev.logs.action_logs.length > 100) dev.logs.action_logs.pop();
    return data;
  }

  /**
   * Mengambil riwayat log aksi
   */
  async getActionLogs(deviceId, limit = 50) {
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
            return Object.values(val).reverse();
          }
        }
      } catch (err) {
        console.warn(`[DeviceRepository] Gagal membaca log aksi RTDB (${err.message}).`);
      }
    }

    const dev = getOrCreateMockDevice(id);
    return dev.logs.action_logs.slice(0, limit);
  }
}

export const deviceRepository = new DeviceRepository();
export default deviceRepository;

