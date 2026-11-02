import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTelemetry,
  validateFeedCommand,
  validatePumpCommand,
  validateSchedule,
  validateSettings,
  validateCommandResult,
} from '../validators/iotValidator.js';

describe('IoT Validators - Pakan Ikan', () => {
  describe('validateTelemetry()', () => {
    test('menerima payload telemetri yang valid', () => {
      const res = validateTelemetry({ ph: 7.2, online: true });
      assert.strictEqual(res.valid, true);
    });

    test('menolak nilai pH di luar rentang 0-14', () => {
      const resLow = validateTelemetry({ ph: -1 });
      assert.strictEqual(resLow.valid, false);

      const resHigh = validateTelemetry({ ph: 14.5 });
      assert.strictEqual(resHigh.valid, false);
    });

    test('menolak payload tanpa nilai pH numerik', () => {
      const resNull = validateTelemetry({ ph: null });
      assert.strictEqual(resNull.valid, false);

      const resStr = validateTelemetry({ ph: 'tujuh' });
      assert.strictEqual(resStr.valid, false);
    });
  });

  describe('validateFeedCommand()', () => {
    test('menerima durasi valid', () => {
      assert.strictEqual(validateFeedCommand({ duration_ms: 2000 }).valid, true);
      assert.strictEqual(validateFeedCommand({}).valid, true);
    });

    test('menolak durasi di luar batas aman', () => {
      assert.strictEqual(validateFeedCommand({ duration_ms: 10 }).valid, false);
      assert.strictEqual(validateFeedCommand({ duration_ms: 50000 }).valid, false);
    });
  });

  describe('validatePumpCommand()', () => {
    test('menerima state boolean atau on/off', () => {
      assert.strictEqual(validatePumpCommand({ state: true }).valid, true);
      assert.strictEqual(validatePumpCommand({ state: false }).valid, true);
      assert.strictEqual(validatePumpCommand({ state: 'on' }).valid, true);
      assert.strictEqual(validatePumpCommand({ state: 'off' }).valid, true);
    });

    test('menolak nilai state yang tidak dikenal', () => {
      assert.strictEqual(validatePumpCommand({ state: 'toggle' }).valid, false);
      assert.strictEqual(validatePumpCommand({}).valid, false);
    });
  });

  describe('validateSchedule()', () => {
    test('menerima format jam HH:mm yang benar', () => {
      assert.strictEqual(validateSchedule({ time: '07:00', label: 'Pagi' }).valid, true);
      assert.strictEqual(validateSchedule({ time: '23:59' }).valid, true);
      assert.strictEqual(validateSchedule({ time: '00:00' }).valid, true);
    });

    test('menolak format jam yang salah', () => {
      assert.strictEqual(validateSchedule({ time: '24:00' }).valid, false);
      assert.strictEqual(validateSchedule({ time: '7:00' }).valid, false);
      assert.strictEqual(validateSchedule({ time: 'siang' }).valid, false);
      assert.strictEqual(validateSchedule({}).valid, false);
    });
  });

  describe('validateSettings()', () => {
    test('menerima pengaturan ambang batas valid', () => {
      const res = validateSettings({
        ph_min: 6.5,
        ph_max: 8.5,
        feed_duration_ms: 1500,
        pump_duration_ms: 6000,
        device_name: 'Kolam Nila',
      });
      assert.strictEqual(res.valid, true);
    });

    test('menolak jika ph_min >= ph_max', () => {
      const res = validateSettings({ ph_min: 8.0, ph_max: 7.0 });
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('lebih kecil'));
    });
  });

  describe('validateCommandResult()', () => {
    test('menerima status completed atau failed', () => {
      assert.strictEqual(validateCommandResult({ status: 'completed' }).valid, true);
      assert.strictEqual(validateCommandResult({ status: 'failed' }).valid, true);
      assert.strictEqual(validateCommandResult({ status: 'pending' }).valid, false);
    });
  });
});

