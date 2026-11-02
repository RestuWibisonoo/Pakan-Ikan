import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../server.js';
import config from '../config/appConfig.js';
import { checkRealtimeDatabaseConnectivity } from '../config/firebaseAdmin.js';
import deviceRepository from '../repositories/deviceRepository.js';

describe('Task 07: Final Pre-Deployment Gate Verifications', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('1. Kejujuran Status Database & Pemeriksaan Konektivitas Read-Only', () => {
    test('checkRealtimeDatabaseConnectivity melaporkan unconfigured saat kredensial belum ada', async () => {
      const result = await checkRealtimeDatabaseConnectivity(1000);
      assert.strictEqual(typeof result, 'object');
      assert.strictEqual(result.configured, false);
      assert.strictEqual(result.connected, false);
      assert.strictEqual(result.status, 'unconfigured');
      assert.ok(result.message.includes('belum terkonfigurasi'));
    });

    test('GET /api/health membedakan secara jujur antara readiness konfigurasi dan liveConnectivity', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.status, 'ok');
      assert.strictEqual(body.app, 'Pakan Ikan Email Authentication Service');
      assert.strictEqual(body.serviceName, 'Pakan Ikan IoT & Authentication Service');

      // Memeriksa pemisahan field readiness vs liveConnectivity
      assert.ok(body.readiness !== undefined, 'Field readiness harus ada');
      assert.strictEqual(typeof body.readiness.firebaseAdmin, 'boolean');
      assert.strictEqual(typeof body.readiness.realtimeDatabase, 'boolean');
      assert.strictEqual(typeof body.readiness.deviceAuth, 'boolean');

      assert.ok(body.liveConnectivity !== undefined, 'Field liveConnectivity harus ada');
      assert.ok(body.liveConnectivity.realtimeDatabase !== undefined);
      assert.strictEqual(typeof body.liveConnectivity.realtimeDatabase.connected, 'boolean');
      assert.strictEqual(body.liveConnectivity.realtimeDatabase.status, 'unconfigured');

      // Backward compatibility tetap terjaga
      assert.ok(body.services);
      assert.strictEqual(body.services.realtimeDatabase, 'mock-fallback');
    });
  });

  describe('2. Hardening Terhadap Silent Mock Fallback di Lingkungan Produksi', () => {
    test('assertDatabaseAvailable melempar HTTP 503 DATABASE_UNAVAILABLE saat RTDB belum dikonfigurasi di production', () => {
      const originalEnv = config.nodeEnv;
      config.nodeEnv = 'production';

      try {
        assert.throws(
          () => {
            deviceRepository.assertDatabaseAvailable();
          },
          (err) => {
            assert.strictEqual(err.status, 503);
            assert.strictEqual(err.code, 'DATABASE_UNAVAILABLE');
            return true;
          }
        );
      } finally {
        config.nodeEnv = originalEnv;
      }
    });

    test('handleDatabaseError melempar HTTP 502 DATABASE_ERROR di production saat terjadi kegagalan RTDB live', () => {
      const originalEnv = config.nodeEnv;
      config.nodeEnv = 'production';

      try {
        assert.throws(
          () => {
            deviceRepository.handleDatabaseError('test_query', new Error('Firebase network unreachable'));
          },
          (err) => {
            assert.strictEqual(err.status, 502);
            assert.strictEqual(err.code, 'DATABASE_ERROR');
            assert.ok(err.message.includes('Firebase network unreachable'));
            return true;
          }
        );
      } finally {
        config.nodeEnv = originalEnv;
      }
    });

    test('handleDatabaseError tidak melempar error di lingkungan non-produksi (fallback diizinkan untuk dev/test)', () => {
      const originalEnv = config.nodeEnv;
      const originalProc = process.env.NODE_ENV;
      config.nodeEnv = 'test';
      process.env.NODE_ENV = 'test';

      try {
        // Tidak melempar error di non-produksi
        assert.doesNotThrow(() => {
          deviceRepository.handleDatabaseError('test_query', new Error('Simulated dev warning'));
        });
      } finally {
        config.nodeEnv = originalEnv;
        process.env.NODE_ENV = originalProc;
      }
    });
  });
});
