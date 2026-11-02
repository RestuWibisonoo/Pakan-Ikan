import deviceRepository from '../repositories/deviceRepository.js';

export class IotService {
  /**
   * Menentukan status pH berdasarkan rentang pengaturan
   */
  calculatePhStatus(ph, settings) {
    const min = settings?.ph_min !== undefined ? Number(settings.ph_min) : 6.5;
    const max = settings?.ph_max !== undefined ? Number(settings.ph_max) : 8.5;

    if (ph < min) return 'asam';
    if (ph > max) return 'basa';
    return 'aman';
  }

  /**
   * Memproses data telemetri yang dikirim oleh perangkat ESP32
   */
  async processDeviceTelemetry(deviceId, payload) {
    const settings = await deviceRepository.getSettings(deviceId);
    const phValue = Number(Number(payload.ph).toFixed(2));
    const phStatus = this.calculatePhStatus(phValue, settings);
    const timestamp = payload.timestamp || new Date().toISOString();

    const patch = {
      online: payload.online !== undefined ? Boolean(payload.online) : true,
      last_seen: timestamp,
      ph: phValue,
      ph_status: phStatus,
    };

    if (payload.pump_status !== undefined) {
      patch.pump_status = payload.pump_status === 'on' || payload.pump_status === true ? 'on' : 'off';
    }

    if (payload.servo_status !== undefined) {
      patch.servo_status = String(payload.servo_status);
    }

    // Perbarui status terkini
    const updatedStatus = await deviceRepository.updateStatus(deviceId, patch);

    // Simpan riwayat pembacaan pH
    await deviceRepository.addPhLog(deviceId, {
      value: phValue,
      status: phStatus,
      timestamp,
    });

    return updatedStatus;
  }

  /**
   * Mengirim perintah beri pakan (manual atau terjadwal)
   */
  async triggerFeedCommand(deviceId, options = {}) {
    const settings = await deviceRepository.getSettings(deviceId);
    const duration = options.duration_ms || settings.feed_duration_ms || 1000;
    const source = options.source || 'manual';

    const command = await deviceRepository.createCommand(deviceId, {
      type: 'feed',
      params: {
        duration_ms: duration,
        requested_by: options.userEmail || 'system',
      },
    });

    // Perbarui status servo menjadi aktif sementara
    await deviceRepository.updateStatus(deviceId, {
      servo_status: 'running',
    });

    // Catat log aksi pakan
    await deviceRepository.addActionLog(deviceId, {
      type: 'feed',
      action: source === 'manual' ? 'Manual Feed' : 'Auto Feed',
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    return command;
  }

  /**
   * Mengirim perintah kontrol pompa air (ON / OFF)
   */
  async triggerPumpCommand(deviceId, options = {}) {
    const isTurnOn = options.state === true || options.state === 'on';
    const nextState = isTurnOn ? 'on' : 'off';

    const command = await deviceRepository.createCommand(deviceId, {
      type: 'pump',
      params: {
        state: nextState,
        requested_by: options.userEmail || 'system',
      },
    });

    // Perbarui status pompa terkini
    await deviceRepository.updateStatus(deviceId, {
      pump_status: nextState,
    });

    // Catat log aksi pompa
    await deviceRepository.addActionLog(deviceId, {
      type: 'pump',
      action: isTurnOn ? 'Manual ON' : 'Manual OFF',
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    return command;
  }

  /**
   * Sinkronisasi data lengkap untuk ESP32 (pengaturan, jadwal aktif, dan status)
   */
  async getSyncDataForDevice(deviceId) {
    const [status, settings, schedules] = await Promise.all([
      deviceRepository.getStatus(deviceId),
      deviceRepository.getSettings(deviceId),
      deviceRepository.getSchedules(deviceId),
    ]);

    // Filter hanya jadwal yang aktif untuk memori ESP32 yang efisien
    const activeSchedules = (schedules || []).filter((s) => s.active);

    return {
      deviceId,
      serverTime: new Date().toISOString(),
      status,
      settings,
      schedules: activeSchedules,
    };
  }

  /**
   * Mengambil status lengkap sistem untuk antarmuka pengguna
   */
  async getFullSystemStatus(deviceId) {
    const [status, settings] = await Promise.all([
      deviceRepository.getStatus(deviceId),
      deviceRepository.getSettings(deviceId),
    ]);

    return {
      status,
      settings,
    };
  }
}

export const iotService = new IotService();
export default iotService;

