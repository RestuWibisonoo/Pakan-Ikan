import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../server.js';
import config from '../config/appConfig.js';
import deviceRepository from '../repositories/deviceRepository.js';
import iotService from '../services/iotService.js';
import { getVerifiedDeviceId } from '../controllers/iotController.js';

describe('ESP32 Simulator & Security Integration Suite', () => {
  let server;
  let baseUrl;
  const testDeviceId = 'sim-test-device-01';

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Siklus Lengkap Simulator Perangkat Lunak ESP32', () => {
    test('1. Sync awal: Simulator meminta konfigurasi & jadwal awal perangkat', async () => {
      const res = await fetch(`${baseUrl}/api/v1/device/sync`, {
        method: 'GET',
        headers: {
          'X-Device-Key': config.device.apiKey,
          'X-Device-Id': testDeviceId,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.sync);
      assert.ok(Array.isArray(data.sync.schedules));
      assert.ok(data.sync.settings);
    });

    test('2. Telemetri: Simulator mengirimkan data pembacaan sensor pH yang valid', async () => {
      const res = await fetch(`${baseUrl}/api/v1/device/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': config.device.apiKey,
          'X-Device-Id': testDeviceId,
        },
        body: JSON.stringify({
          ph: 7.25,
          temperature: 28.1,
          feed_level: 82,
          pump_active: false,
          uptime_seconds: 120,
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.status.ph, 7.25);
      assert.strictEqual(data.status.ph_status, 'aman');
    });

    test('3. Antrean Perintah: Eksekusi alur perintah dan pelaporan hasil dari simulator', async () => {
      // 3a. Buat perintah pakan pending di antrean
      const feedCmd = await iotService.triggerFeedCommand(testDeviceId, {
        duration_ms: 2500,
        source: 'manual',
        userEmail: 'admin@pakan-ikan.my.id',
      });
      assert.ok(feedCmd.id);
      assert.strictEqual(feedCmd.type, 'feed');

      // 3b. Simulator melakukan polling antrean perintah pending
      const pollRes = await fetch(`${baseUrl}/api/v1/device/commands/pending`, {
        method: 'GET',
        headers: {
          'X-Device-Key': config.device.apiKey,
          'X-Device-Id': testDeviceId,
        },
      });
      assert.strictEqual(pollRes.status, 200);
      const pollData = await pollRes.json();
      assert.strictEqual(pollData.success, true);
      assert.ok(pollData.command);
      assert.strictEqual(pollData.command.id, feedCmd.id);
      assert.strictEqual(pollData.command.type, 'feed');

      // 3c. Simulator melaporkan hasil eksekusi fisik aktuator
      const reportRes = await fetch(`${baseUrl}/api/v1/device/commands/${feedCmd.id}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': config.device.apiKey,
          'X-Device-Id': testDeviceId,
        },
        body: JSON.stringify({
          status: 'completed',
          executed_at: new Date().toISOString(),
          message: 'Servo motor dispenser berputar 2500ms.',
        }),
      });
      assert.strictEqual(reportRes.status, 200);
      const reportData = await reportRes.json();
      assert.strictEqual(reportData.success, true);

      // 3d. Simulator melakukan polling lagi -> antrean harus kosong (null)
      const secondPoll = await fetch(`${baseUrl}/api/v1/device/commands/pending`, {
        method: 'GET',
        headers: {
          'X-Device-Key': config.device.apiKey,
          'X-Device-Id': testDeviceId,
        },
      });
      const secondPollData = await secondPoll.json();
      assert.strictEqual(secondPollData.command, null);

      // 3e. Verifikasi action log di repository terupdate menjadi 'success'
      const actionLogs = await deviceRepository.getActionLogs(testDeviceId, 5);
      const matchingLog = actionLogs.find((l) => l.id === feedCmd.id || l.type === 'feed');
      assert.ok(matchingLog);
      assert.strictEqual(matchingLog.status, 'success');
    });

    test('4. Deteksi Kegagalan: Simulator mengirim perintah failed dan tercatat dengan benar', async () => {
      const pumpCmd = await iotService.triggerPumpCommand(testDeviceId, {
        state: 'on',
        userEmail: 'admin@pakan-ikan.my.id',
      });

      const reportRes = await fetch(`${baseUrl}/api/v1/device/commands/${pumpCmd.id}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': config.device.apiKey,
          'X-Device-Id': testDeviceId,
        },
        body: JSON.stringify({
          status: 'failed',
          executed_at: new Date().toISOString(),
          message: 'Relay pompa mengalami trip proteksi.',
        }),
      });

      assert.strictEqual(reportRes.status, 200);
      const actionLogs = await deviceRepository.getActionLogs(testDeviceId, 5);
      const matchingLog = actionLogs.find((l) => l.command_id === pumpCmd.id);
      assert.ok(matchingLog);
      assert.strictEqual(matchingLog.status, 'failed');
    });
  });

  describe('Pengujian Keamanan & Validasi', () => {
    test('Penolakan kunci rahasia salah (Timing safe)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/device/sync`, {
        method: 'GET',
        headers: {
          'X-Device-Key': 'kunci-salah-yang-tidak-terdaftar',
          'X-Device-Id': testDeviceId,
        },
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.code, 'DEVICE_UNAUTHORIZED');
    });

    test('Penolakan payload telemetri dengan pH korup/di luar jangkauan (pH 22.0)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/device/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': config.device.apiKey,
          'X-Device-Id': testDeviceId,
        },
        body: JSON.stringify({ ph: 22.0 }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error);
    });

    test('Device Ownership Guard (BOLA/IDOR): Mengisolasi perangkat antar pengguna', async () => {
      const isolatedDeviceId = 'kolam-privat-01';
      // User A mengklaim kepemilikan
      await deviceRepository.setDeviceOwner(isolatedDeviceId, 'user-a-uid');

      // Request oleh User A berhasil
      const devIdUserA = await getVerifiedDeviceId({
        query: { deviceId: isolatedDeviceId },
        user: { uid: 'user-a-uid' },
      });
      assert.strictEqual(devIdUserA, isolatedDeviceId);

      // Request oleh User B ke kolam User A ditolak dengan HTTP 403 DEVICE_ACCESS_DENIED
      await assert.rejects(
        async () => {
          await getVerifiedDeviceId({
            query: { deviceId: isolatedDeviceId },
            user: { uid: 'user-b-uid' },
          });
        },
        (err) => {
          return err.status === 403 && err.code === 'DEVICE_ACCESS_DENIED';
        }
      );
    });

    test('Production Mock Guard: Mode production menolak mock fallback saat database offline', async () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        await assert.rejects(
          async () => {
            await deviceRepository.getStatus('test-prod-guard');
          },
          (err) => {
            return err.status === 503 && err.code === 'DATABASE_UNAVAILABLE';
          }
        );
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    test('Dukungan Kunci Unik Per-Perangkat (Per-Device Secret)', async () => {
      const customDeviceId = 'kolam-khusus-007';
      const customSecretKey = 'kunci-rahasia-khusus-perangkat-007';

      // Daftarkan kunci unik pada metadata perangkat
      await deviceRepository.setDeviceSecret(customDeviceId, customSecretKey);

      // Verifikasi request dengan kunci unik perangkat diterima (200)
      const resSuccess = await fetch(`${baseUrl}/api/v1/device/sync`, {
        method: 'GET',
        headers: {
          'X-Device-Key': customSecretKey,
          'X-Device-Id': customDeviceId,
        },
      });
      assert.strictEqual(resSuccess.status, 200);

      // Verifikasi request dengan kunci salah ditolak (401)
      const resFail = await fetch(`${baseUrl}/api/v1/device/sync`, {
        method: 'GET',
        headers: {
          'X-Device-Key': 'kunci-salah-sembarang',
          'X-Device-Id': customDeviceId,
        },
      });
      assert.strictEqual(resFail.status, 401);
    });

    test('Pencegahan Parameter Pollution / Tampering (Inkonsistensi deviceId)', async () => {
      // Mengirimkan deviceId berbeda di query dan body
      await assert.rejects(
        async () => {
          await getVerifiedDeviceId({
            query: { deviceId: 'kolam-a' },
            body: { deviceId: 'kolam-b' },
            user: { uid: 'user-a-uid' },
          });
        },
        (err) => {
          return err.status === 400 && err.code === 'INVALID_DEVICE_ID';
        }
      );
    });

    test('Command Lifecycle: Status perantara executing memperbarui log aksi', async () => {
      const cmd = await iotService.triggerFeedCommand(testDeviceId, {
        duration_ms: 1000,
        source: 'manual',
        userEmail: 'operator@pakan-ikan.my.id',
      });

      // ESP32 melaporkan sedang mengeksekusi
      const execRes = await fetch(`${baseUrl}/api/v1/device/commands/${cmd.id}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': config.device.apiKey,
          'X-Device-Id': testDeviceId,
        },
        body: JSON.stringify({
          status: 'executing',
          message: 'Servo sedang berputar membuka katup pakan...',
        }),
      });

      assert.strictEqual(execRes.status, 200);
      const actionLogs = await deviceRepository.getActionLogs(testDeviceId, 5);
      const targetLog = actionLogs.find((l) => l.command_id === cmd.id);
      assert.ok(targetLog);
      assert.strictEqual(targetLog.status, 'executing');
    });

    test('Command Timeout: Perintah usang (> 180s) otomatis dieviktir dengan status expired', async () => {
      const staleDeviceId = 'kolam-stale-test';
      const fourMinutesAgo = new Date(Date.now() - 240000).toISOString();

      // Buat perintah dengan timestamp 4 menit yang lalu
      const staleCmd = await deviceRepository.createCommand(staleDeviceId, {
        type: 'feed',
        params: { duration_ms: 2000 },
        created_at: fourMinutesAgo,
      });
      assert.ok(staleCmd.id);

      // Ambil perintah tertunda: fungsi getLatestPendingCommand harus meng-evict perintah usang
      const result = await deviceRepository.getLatestPendingCommand(staleDeviceId);
      // Perintah stale tidak boleh dikembalikan untuk dieksekusi (antrean aktif kosong)
      assert.strictEqual(result, null);
    });
  });
});
