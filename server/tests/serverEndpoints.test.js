import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../server.js';

describe('Server Endpoints - Express API', () => {
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

  test('GET /api/health mengembalikan status ok dan identitas Pakan Ikan', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.app, 'Pakan Ikan Email Authentication Service');
    assert.strictEqual(body.projectId, 'pakan-ikan-4c18e');
    assert.ok(body.services);
  });

  test('GET /api/non-existent mengembalikan status 404', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent`);
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('tidak ditemukan'));
  });

  test('POST /api/auth/send-verification tanpa token Bearer mengembalikan status 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 401);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'AUTH_TOKEN_MISSING');
  });

  test('POST /api/auth/send-password-reset tanpa email mengembalikan status 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/send-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('masukkan alamat email'));
  });

  test('POST /api/auth/send-password-reset dengan format email salah mengembalikan status 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/send-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bukan-email-valid' }),
    });
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('Format alamat email tidak valid'));
  });
});
