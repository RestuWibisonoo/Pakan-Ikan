import express from 'express';
import requireAuth from '../middleware/authMiddleware.js';
import requireDeviceAuth from '../middleware/deviceAuthMiddleware.js';
import {
  getStatus,
  triggerFeed,
  triggerPump,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSettings,
  updateSettings,
  getPhLogs,
  getActionLogs,
  postDeviceTelemetry,
  getPendingCommand,
  reportCommandResult,
  syncDevice,
} from '../controllers/iotController.js';

const router = express.Router();

// ==============================================================================
// User Endpoints (React Web & Future Flutter App - Firebase ID Token Required)
// ==============================================================================

// Status sistem & telemetri terkini
router.get('/status', requireAuth, getStatus);

// Kontrol aksi manual
router.post('/commands/feed', requireAuth, triggerFeed);
router.post('/commands/pump', requireAuth, triggerPump);

// Manajemen jadwal pakan
router.get('/schedules', requireAuth, getSchedules);
router.post('/schedules', requireAuth, createSchedule);
router.put('/schedules/:id', requireAuth, updateSchedule);
router.delete('/schedules/:id', requireAuth, deleteSchedule);

// Pengaturan perangkat & ambang batas
router.get('/settings', requireAuth, getSettings);
router.put('/settings', requireAuth, updateSettings);

// Riwayat log
router.get('/logs/ph', requireAuth, getPhLogs);
router.get('/logs/actions', requireAuth, getActionLogs);

// ==============================================================================
// ESP32 Hardware Endpoints (Device Secret Header X-Device-Key Required)
// ==============================================================================

// Kirim data telemetri sensor pH dan status perangkat dari ESP32
router.post('/device/telemetry', requireDeviceAuth, postDeviceTelemetry);

// Ambil perintah pending untuk dieksekusi servo/pompa
router.get('/device/commands/pending', requireDeviceAuth, getPendingCommand);

// Laporkan hasil eksekusi perintah
router.post('/device/commands/:id/result', requireDeviceAuth, reportCommandResult);

// Sinkronisasi jadwal & pengaturan saat ESP32 booting atau heartbeat
router.get('/device/sync', requireDeviceAuth, syncDevice);

export default router;

