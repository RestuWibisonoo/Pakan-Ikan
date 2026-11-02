import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { iotService } from '../services/iotService.js';
import deviceRepository from '../repositories/deviceRepository.js';

describe('IoT Service - Logika Bisnis & Perhitungan Status', () => {
  const deviceId = 'test-feeder-unit';

  test('calculatePhStatus() menghitung status dengan benar', () => {
    const settings = { ph_min: 6.5, ph_max: 8.5 };

    assert.strictEqual(iotService.calculatePhStatus(6.0, settings), 'asam');
    assert.strictEqual(iotService.calculatePhStatus(7.2, settings), 'aman');
    assert.strictEqual(iotService.calculatePhStatus(9.0, settings), 'basa');
  });

  test('processDeviceTelemetry() memperbarui status dan menyimpan log pH', async () => {
    const updated = await iotService.processDeviceTelemetry(deviceId, {
      ph: 7.4,
      online: true,
      pump_status: 'off',
    });

    assert.strictEqual(updated.ph, 7.4);
    assert.strictEqual(updated.ph_status, 'aman');
    assert.strictEqual(updated.online, true);

    const logs = await deviceRepository.getPhLogs(deviceId, 5);
    assert.ok(logs.length > 0);
    assert.strictEqual(logs[0].value, 7.4);
  });

  test('triggerFeedCommand() membuat pending command dan mencatat log aksi', async () => {
    const cmd = await iotService.triggerFeedCommand(deviceId, {
      duration_ms: 1200,
      source: 'manual',
      userEmail: 'user@example.com',
    });

    assert.strictEqual(cmd.type, 'feed');
    assert.strictEqual(cmd.status, 'pending');
    assert.strictEqual(cmd.params.duration_ms, 1200);

    const pending = await deviceRepository.getLatestPendingCommand(deviceId);
    assert.strictEqual(pending.id, cmd.id);

    const actionLogs = await deviceRepository.getActionLogs(deviceId, 5);
    assert.ok(actionLogs.length > 0);
    assert.strictEqual(actionLogs[0].type, 'feed');
  });

  test('triggerPumpCommand() membuat pending command dan memperbarui status pompa', async () => {
    const cmd = await iotService.triggerPumpCommand(deviceId, {
      state: 'on',
      userEmail: 'user@example.com',
    });

    assert.strictEqual(cmd.type, 'pump');
    assert.strictEqual(cmd.params.state, 'on');

    const status = await deviceRepository.getStatus(deviceId);
    assert.strictEqual(status.pump_status, 'on');
  });

  test('getSyncDataForDevice() mengembalikan paket data lengkap untuk ESP32', async () => {
    // Tambahkan 1 jadwal aktif dan 1 nonaktif
    await deviceRepository.saveSchedule(deviceId, {
      id: 'active_1',
      time: '08:00',
      label: 'Pagi',
      active: true,
    });
    await deviceRepository.saveSchedule(deviceId, {
      id: 'inactive_1',
      time: '12:00',
      label: 'Siang',
      active: false,
    });

    const sync = await iotService.getSyncDataForDevice(deviceId);

    assert.strictEqual(sync.deviceId, deviceId);
    assert.ok(sync.serverTime);
    assert.ok(sync.status);
    assert.ok(sync.settings);

    // Pastikan hanya jadwal aktif yang dikirimkan ke ESP32
    assert.ok(sync.schedules.some((s) => s.id === 'active_1'));
    assert.ok(!sync.schedules.some((s) => s.id === 'inactive_1'));
  });
});

