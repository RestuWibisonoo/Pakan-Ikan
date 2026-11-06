import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import deviceRepository from '../repositories/deviceRepository.js';
import { getCurrentWibTime, checkAndExecuteSchedules } from '../services/scheduleRunner.js';
import config from '../config/appConfig.js';

describe('ScheduleRunner - Background Automated Fish Feeding', () => {
  const deviceId = config.device.defaultDeviceId;

  beforeEach(async () => {
    // Bersihkan jadwal dan perintah antrean sebelum pengujian
    const existing = await deviceRepository.getSchedules(deviceId);
    for (const s of existing) {
      await deviceRepository.deleteSchedule(deviceId, s.id);
    }
  });

  test('getCurrentWibTime() mengembalikan format HH:mm yang valid', () => {
    const time = getCurrentWibTime();
    assert.strictEqual(typeof time, 'string');
    assert.match(time, /^([01]\d|2[0-3]):[0-5]\d$/);
  });

  test('checkAndExecuteSchedules() memicu feed command otomatis jika waktu jadwal cocok', async () => {
    const currentWib = getCurrentWibTime();

    // Tambah jadwal aktif dengan waktu saat ini
    await deviceRepository.saveSchedule(deviceId, {
      id: 'test_sched_now',
      time: currentWib,
      label: 'Pakan Otomatis Tes',
      active: true,
    });

    // Jalankan pemeriksaan
    await checkAndExecuteSchedules();

    // Periksa antrean perintah perangkat
    const pendingCmd = await deviceRepository.getLatestPendingCommand(deviceId);
    assert.ok(pendingCmd, 'Harus ada perintah pakan tertunda di antrean');
    assert.strictEqual(pendingCmd.type, 'feed');
  });

  test('checkAndExecuteSchedules() mengabaikan jadwal yang statusnya tidak aktif (active: false)', async () => {
    const currentWib = getCurrentWibTime();

    await deviceRepository.saveSchedule(deviceId, {
      id: 'test_sched_inactive',
      time: currentWib,
      label: 'Jadwal Nonaktif',
      active: false,
    });

    await checkAndExecuteSchedules();

    // Pastikan tidak memicu perintah
    const pendingCmd = await deviceRepository.getLatestPendingCommand(deviceId);
    // Jika ada perintah sebelumnya, pastikan bukan dari jadwal nonaktif
    if (pendingCmd) {
      assert.notStrictEqual(pendingCmd.params?.requested_by, 'auto-schedule (Jadwal Nonaktif)');
    }
  });
});
