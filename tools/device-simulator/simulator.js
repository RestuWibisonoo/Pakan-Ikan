#!/usr/bin/env node

/**
 * ==============================================================================
 * Pakan Ikan - ESP32 Virtual Device Simulator
 * ==============================================================================
 * Mensimulasikan perangkat keras IoT ESP32 Pakan Ikan:
 * 1. Booting dan sinkronisasi konfigurasi awal (GET /api/v1/device/sync)
 * 2. Pengiriman telemetri periodik sensor pH, pakan, pompa (POST /api/v1/device/telemetry)
 * 3. Polling antrean perintah pakan & pompa (GET /api/v1/device/commands/pending)
 * 4. Simulasi eksekusi fisik aktuator (servo pakan / relay pompa)
 * 5. Pelaporan hasil eksekusi (POST /api/v1/device/commands/:id/result)
 *
 * Penggunaan:
 *   node tools/device-simulator/simulator.js [opsi]
 *
 * Opsi CLI:
 *   --url=<url>         URL API IoT backend (default: http://127.0.0.1:5000/api/v1)
 *   --key=<key>         Kunci rahasia perangkat (default: pakan-ikan-esp32-secret-2026)
 *   --device-id=<id>    ID perangkat (default: fish-feeder-001)
 *   --interval=<detik>  Interval pengiriman telemetri (default: 10)
 *   --mode=<mode>       Mode operasi: loop | once | unauthorized | invalid-payload | offline
 * ==============================================================================
 */

const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value !== undefined ? value : true;
    }
  });
  return args;
};

const cliArgs = parseArgs();

const CONFIG = {
  apiUrl: (cliArgs.url || process.env.API_URL || 'http://127.0.0.1:5000/api/v1').replace(/\/$/, ''),
  deviceKey: cliArgs.key || process.env.DEVICE_KEY || 'pakan-ikan-esp32-secret-2026',
  deviceId: cliArgs['device-id'] || process.env.DEVICE_ID || 'fish-feeder-001',
  intervalSec: Math.max(1, parseInt(cliArgs.interval || process.env.INTERVAL_SEC || '10', 10)),
  mode: cliArgs.mode || process.env.SIMULATOR_MODE || 'loop',
};

// State internal perangkat simulator
const deviceState = {
  uptimeSeconds: 0,
  currentPh: 7.15,
  temperature: 28.2,
  feedLevel: 85, // Persentase sisa pakan
  pumpActive: false,
  totalFeedsExecuted: 0,
};

const log = (tag, message, data = null) => {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const prefix = `[${ts}] [ESP32-${CONFIG.deviceId}] [${tag}]`;
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data));
  } else {
    console.log(`${prefix} ${message}`);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getHeaders = (overrideKey = null) => ({
  'Content-Type': 'application/json',
  'X-Device-Key': overrideKey !== null ? overrideKey : CONFIG.deviceKey,
  'X-Device-Id': CONFIG.deviceId,
});

/**
 * 1. Sinkronisasi konfigurasi awal dari server
 */
async function performSync() {
  log('BOOT', `Menghubungi backend di ${CONFIG.apiUrl}/device/sync...`);
  try {
    const res = await fetch(`${CONFIG.apiUrl}/device/sync`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errText = await res.text();
      log('BOOT-WARN', `Gagal sinkronisasi (HTTP ${res.status}): ${errText}`);
      return null;
    }

    const data = await res.json();
    log('BOOT-SUCCESS', 'Konfigurasi perangkat berhasil disinkronisasi:', {
      schedulesCount: data.sync?.schedules?.length || 0,
      phThresholds: data.sync?.settings?.ph_thresholds || null,
      pumpState: data.sync?.settings?.pump_state,
    });

    if (data.sync?.settings?.pump_state !== undefined) {
      deviceState.pumpActive = data.sync.settings.pump_state === 'on' || data.sync.settings.pump_state === true;
    }

    return data.sync;
  } catch (err) {
    log('BOOT-ERR', `Koneksi gagal ke ${CONFIG.apiUrl}: ${err.message}`);
    return null;
  }
}

/**
 * 2. Pengiriman telemetri periodik sensor
 */
async function sendTelemetry(overridePayload = null, overrideKey = null) {
  // Simulasi fluktuasi alami air
  const phDrift = (Math.random() - 0.5) * 0.08;
  deviceState.currentPh = Math.round(Math.min(8.5, Math.max(5.5, deviceState.currentPh + phDrift)) * 100) / 100;

  const tempDrift = (Math.random() - 0.5) * 0.1;
  deviceState.temperature = Math.round((deviceState.temperature + tempDrift) * 10) / 10;
  deviceState.uptimeSeconds += CONFIG.intervalSec;

  const payload = overridePayload || {
    ph: deviceState.currentPh,
    temperature: deviceState.temperature,
    feed_level: deviceState.feedLevel,
    pump_active: deviceState.pumpActive,
    uptime_seconds: deviceState.uptimeSeconds,
    timestamp: new Date().toISOString(),
  };

  log('TELEMETRY-TX', `Mengirim telemetri (pH: ${payload.ph}, Pompa: ${payload.pump_active ? 'ON' : 'OFF'}, Pakan: ${payload.feed_level}%)...`);

  const res = await fetch(`${CONFIG.apiUrl}/device/telemetry`, {
    method: 'POST',
    headers: getHeaders(overrideKey),
    body: JSON.stringify(payload),
  });

  const resJson = await res.json().catch(() => ({}));
  if (res.ok) {
    log('TELEMETRY-RX', `Telemetri diterima backend (HTTP ${res.status}): Status pH = ${resJson.status?.ph_status || 'ok'}`);
  } else {
    log('TELEMETRY-ERR', `Backend menolak telemetri (HTTP ${res.status}):`, resJson);
  }

  return { status: res.status, ok: res.ok, body: resJson };
}

/**
 * 3. Polling dan eksekusi perintah aktuator
 */
async function checkAndExecuteCommands() {
  log('COMMAND-POLL', 'Memeriksa antrean perintah pending di backend...');
  try {
    const res = await fetch(`${CONFIG.apiUrl}/device/commands/pending`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!res.ok) {
      log('COMMAND-WARN', `Gagal polling antrean (HTTP ${res.status})`);
      return null;
    }

    const data = await res.json();
    const command = data.command;

    if (!command) {
      log('COMMAND-POLL', 'Tidak ada perintah pending.');
      return null;
    }

    log('ACTUATOR', `Perintah diterima [ID: ${command.id}] -> Tipe: ${command.type}`, command.params);

    // Simulasi penundaan pengerjaan fisik aktuator (servo / relay)
    await delay(1200);

    let resultPayload = {
      status: 'completed',
      executed_at: new Date().toISOString(),
      message: '',
    };

    if (command.type === 'feed') {
      const durationMs = command.params?.duration_ms || 2000;
      deviceState.totalFeedsExecuted += 1;
      deviceState.feedLevel = Math.max(0, deviceState.feedLevel - 2); // Pakan berkurang 2%
      resultPayload.message = `Servo motor dispenser pakan aktif selama ${durationMs}ms. Pakan berhasil dikeluarkan. Sisa pakan: ${deviceState.feedLevel}%. Total pakan: ${deviceState.totalFeedsExecuted}.`;
      log('ACTUATOR-FEED', resultPayload.message);
    } else if (command.type === 'pump') {
      const nextState = command.params?.state === 'on' || command.params?.state === true;
      deviceState.pumpActive = nextState;
      resultPayload.message = `Relay aerasi/pompa sirkulasi berhasil diubah ke ${nextState ? 'AKTIF (ON)' : 'MATI (OFF)'}.`;
      log('ACTUATOR-PUMP', resultPayload.message);
    } else {
      resultPayload.status = 'failed';
      resultPayload.message = `Jenis perintah tidak dikenali oleh perangkat: '${command.type}'.`;
      log('ACTUATOR-ERR', resultPayload.message);
    }

    // Laporkan hasil eksekusi kembali ke backend
    log('REPORT', `Melaporkan status eksekusi perintah ${command.id} ke backend...`);
    const reportRes = await fetch(`${CONFIG.apiUrl}/device/commands/${command.id}/result`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(resultPayload),
    });

    const reportData = await reportRes.json().catch(() => ({}));
    if (reportRes.ok) {
      log('REPORT-SUCCESS', `Laporan eksekusi ${command.id} diterima backend (HTTP ${reportRes.status}).`);
    } else {
      log('REPORT-ERR', `Gagal melaporkan hasil perintah (HTTP ${reportRes.status}):`, reportData);
    }

    return { command, result: resultPayload };
  } catch (err) {
    log('COMMAND-ERR', `Kesalahan saat polling/eksekusi perintah: ${err.message}`);
    return null;
  }
}

/**
 * Main Simulator Runner
 */
async function startSimulator() {
  console.log('================================================================');
  console.log('  PAKAN IKAN - ESP32 VIRTUAL HARDWARE SIMULATOR');
  console.log('================================================================');
  console.log(`  Target API URL : ${CONFIG.apiUrl}`);
  console.log(`  Device ID      : ${CONFIG.deviceId}`);
  console.log(`  Auth Key       : ${CONFIG.deviceKey ? '••••••••' + CONFIG.deviceKey.slice(-4) : '(kosong)'}`);
  console.log(`  Interval       : ${CONFIG.intervalSec} detik`);
  console.log(`  Mode Operasi   : ${CONFIG.mode}`);
  console.log('================================================================\n');

  if (CONFIG.mode === 'unauthorized') {
    log('MODE', 'Menguji autentikasi penolakan kunci tidak valid...');
    const result = await sendTelemetry(null, 'kunci-rahasia-salah-12345');
    if (result.status === 401) {
      log('TEST-PASS', 'Backend berhasil menolak perangkat tidak sah dengan status HTTP 401 Unauthorized.');
      process.exit(0);
    } else {
      log('TEST-FAIL', `Diharapkan HTTP 401, tetapi menerima HTTP ${result.status}`);
      process.exit(1);
    }
  }

  if (CONFIG.mode === 'invalid-payload') {
    log('MODE', 'Menguji validasi backend dengan nilai pH ekstrem di luar batas (pH = 25.0)...');
    const result = await sendTelemetry({ ph: 25.0, temperature: 28.0 });
    if (result.status === 400) {
      log('TEST-PASS', 'Backend berhasil menolak payload tidak valid dengan status HTTP 400 Bad Request.');
      process.exit(0);
    } else {
      log('TEST-FAIL', `Diharapkan HTTP 400, tetapi menerima HTTP ${result.status}`);
      process.exit(1);
    }
  }

  if (CONFIG.mode === 'offline') {
    log('MODE', 'Menguji deteksi offline/heartbeat timeout: Mengirim 1 telemetri lalu perangkat mati...');
    await sendTelemetry();
    log('SIM-OFFLINE', 'Perangkat ESP32 sekarang offline (power disconnected). Menunggu backend mendeteksi status offline...');
    process.exit(0);
  }

  // 1. Inisialisasi Boot Sync
  await performSync();

  // Mode 'once' (untuk CI / unit testing integrasi)
  if (CONFIG.mode === 'once') {
    log('MODE', 'Menjalankan 1 siklus lengkap (telemetri -> cek perintah -> laporkan)...');
    await sendTelemetry();
    await checkAndExecuteCommands();
    log('COMPLETED', 'Siklus mode once selesai.');
    process.exit(0);
  }

  // Mode 'loop' (operasi normal berkelanjutan)
  log('RUNNING', `Simulator berjalan. Mengirim telemetri setiap ${CONFIG.intervalSec} detik. Tekan Ctrl+C untuk berhenti.\n`);

  let isRunning = true;
  process.on('SIGINT', () => {
    console.log('\n[ESP32] Simulator dihentikan oleh pengguna.');
    isRunning = false;
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    isRunning = false;
    process.exit(0);
  });

  while (isRunning) {
    try {
      await sendTelemetry();
      await checkAndExecuteCommands();
    } catch (err) {
      log('LOOP-ERR', `Kesalahan loop perangkat: ${err.message}`);
    }

    await delay(CONFIG.intervalSec * 1000);
  }
}

// Jalankan simulator
startSimulator().catch((err) => {
  console.error('[FATAL] Kesalahan tidak terduga pada simulator:', err);
  process.exit(1);
});
