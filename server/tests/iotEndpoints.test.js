import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../server.js';
import config from '../config/appConfig.js';

describe('IoT Endpoints - Express API v1', () => {
  let server;
  let baseUrl;

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

  describe('User Endpoints Access Control', () => {
    test('GET /api/v1/status tanpa token Firebase ID mengembalikan 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/status`);
      assert.strictEqual(res.status, 401);

      const body = await res.json();
      assert.strictEqual(body.code, 'AUTH_TOKEN_MISSING');
    });

    test('POST /api/v1/commands/feed tanpa token Firebase ID mengembalikan 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/commands/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_ms: 1000 }),
      });
      assert.strictEqual(res.status, 401);
    });

    test('POST /api/v1/commands/pump tanpa token Firebase ID mengembalikan 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/commands/pump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'on' }),
      });
      assert.strictEqual(res.status, 401);
    });
  });

  describe('ESP32 Hardware Endpoints Access Control & Operations', () => {
    test('POST /api/v1/device/telemetry tanpa X-Device-Key mengembalikan 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/device/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ph: 7.2 }),
      });
      assert.strictEqual(res.status, 401);

      const body = await res.json();
      assert.strictEqual(body.code, 'DEVICE_UNAUTHORIZED');
    });

    test('POST /api/v1/device/telemetry dengan X-Device-Key salah mengembalikan 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/device/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': 'wrong-secret-key',
        },
        body: JSON.stringify({ ph: 7.2 }),
      });
      assert.strictEqual(res.status, 401);
    });

    test('POST /api/v1/device/telemetry dengan X-Device-Key valid berhasil mencatat data (200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/device/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': config.device.apiKey,
        },
        body: JSON.stringify({
          ph: 7.3,
          online: true,
          pump_status: 'off',
        }),
      });
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.status.ph, 7.3);
      assert.strictEqual(body.status.ph_status, 'aman');
    });

    test('GET /api/v1/device/sync dengan X-Device-Key valid mengembalikan data sinkronisasi (200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/device/sync`, {
        method: 'GET',
        headers: {
          'X-Device-Key': config.device.apiKey,
          'X-Device-Id': 'fish-feeder-001',
        },
      });
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.sync);
      assert.strictEqual(body.sync.deviceId, 'fish-feeder-001');
    });

    test('GET /api/v1/device/commands/pending mengembalikan daftar perintah tertunda untuk ESP32', async () => {
      const res = await fetch(`${baseUrl}/api/v1/device/commands/pending`, {
        method: 'GET',
        headers: {
          'X-Device-Key': config.device.apiKey,
        },
      });
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);
    });
  });

  describe('Regression: Memastikan Endpoint Autentikasi Lama Tetap Utuh', () => {
    test('GET /api/health tetap merespons ok dengan informasi database', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.status, 'ok');
      assert.ok(body.services.realtimeDatabase);
      assert.ok(body.services.firebaseAdmin);
    });

    test('POST /api/auth/send-verification tetap tersedia dan menolak token kosong', async () => {
      const res = await fetch(`${baseUrl}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 401);
    });

    test('POST /api/auth/send-password-reset tetap tersedia dan memvalidasi email', async () => {
      const res = await fetch(`${baseUrl}/api/auth/send-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' }),
      });
      assert.strictEqual(res.status, 400);
    });
  });
});

