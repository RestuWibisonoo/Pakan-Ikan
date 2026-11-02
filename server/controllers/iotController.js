import iotService from '../services/iotService.js';
import deviceRepository from '../repositories/deviceRepository.js';
import config from '../config/appConfig.js';
import {
  validateTelemetry,
  validateFeedCommand,
  validatePumpCommand,
  validateSchedule,
  validateSettings,
  validateCommandResult,
} from '../validators/iotValidator.js';

export async function getVerifiedDeviceId(req) {
  // Jika request berasal dari ESP32 (sudah diautentikasi lewat requireDeviceAuth)
  if (req.device) {
    return req.device.id;
  }

  // Jika request berasal dari pengguna (Firebase Auth)
  const userUid = req.user?.uid;
  if (!userUid) {
    const err = new Error('Autentikasi pengguna tidak valid.');
    err.status = 401;
    err.code = 'AUTH_TOKEN_MISSING';
    throw err;
  }

  // Periksa parameter identifier perangkat dari query, body, atau header
  const candidates = [
    req.query?.deviceId,
    req.body?.deviceId,
    req.headers?.['x-device-id'],
  ].filter((c) => c !== undefined && c !== null && String(c).trim().length > 0);

  // Pencegahan Parameter Pollution & Tampering: Jika terdapat perbedaan nilai deviceId di query/body/header
  if (candidates.length > 1) {
    const first = String(candidates[0]).trim();
    const hasMismatch = candidates.some((c) => String(c).trim() !== first);
    if (hasMismatch) {
      const err = new Error('Inkonsistensi parameter identifier perangkat (deviceId) dalam request.');
      err.status = 400;
      err.code = 'INVALID_DEVICE_ID';
      throw err;
    }
  }

  const requestedDeviceId = String(candidates[0] || config.device.defaultDeviceId).trim();

  // Verifikasi kepemilikan perangkat untuk mencegah serangan BOLA / IDOR
  const ownerUid = await deviceRepository.getDeviceOwner(requestedDeviceId);
  if (!ownerUid) {
    // Klaim otomatis untuk perangkat pertama yang dihubungkan pengguna
    await deviceRepository.setDeviceOwner(requestedDeviceId, userUid);
    return requestedDeviceId;
  }

  if (ownerUid !== userUid) {
    const err = new Error('Akses ditolak: Anda tidak memiliki hak akses terhadap perangkat kolam ini.');
    err.status = 403;
    err.code = 'DEVICE_ACCESS_DENIED';
    throw err;
  }

  return requestedDeviceId;
}

// ==============================================================================
// User Endpoints (Memerlukan Firebase ID Token via requireAuth)
// ==============================================================================

export async function getStatus(req, res, next) {
  try {
    const deviceId = await getVerifiedDeviceId(req);
    const data = await iotService.getFullSystemStatus(deviceId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function triggerFeed(req, res, next) {
  try {
    const validation = validateFeedCommand(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const deviceId = await getVerifiedDeviceId(req);
    const command = await iotService.triggerFeedCommand(deviceId, {
      duration_ms: req.body?.duration_ms,
      source: 'manual',
      userEmail: req.user?.email,
    });

    return res.status(200).json({
      success: true,
      message: 'Perintah pemberian pakan berhasil dikirim ke perangkat.',
      command,
    });
  } catch (err) {
    next(err);
  }
}

export async function triggerPump(req, res, next) {
  try {
    const validation = validatePumpCommand(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const deviceId = await getVerifiedDeviceId(req);
    const command = await iotService.triggerPumpCommand(deviceId, {
      state: req.body.state,
      userEmail: req.user?.email,
    });

    return res.status(200).json({
      success: true,
      message: `Perintah pompa berhasil diatur ke status '${command.params.state}'.`,
      command,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSchedules(req, res, next) {
  try {
    const deviceId = await getVerifiedDeviceId(req);
    const schedules = await deviceRepository.getSchedules(deviceId);
    return res.status(200).json({ success: true, data: schedules });
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req, res, next) {
  try {
    const validation = validateSchedule(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const deviceId = await getVerifiedDeviceId(req);
    const newSchedule = await deviceRepository.saveSchedule(deviceId, {
      time: req.body.time,
      label: req.body.label || 'Pakan',
      active: req.body.active !== undefined ? Boolean(req.body.active) : true,
    });

    return res.status(201).json({
      success: true,
      message: 'Jadwal pakan berhasil ditambahkan.',
      data: newSchedule,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID jadwal wajib disertakan.' });
    }

    const validation = validateSchedule(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const deviceId = await getVerifiedDeviceId(req);
    const updated = await deviceRepository.saveSchedule(deviceId, {
      id,
      time: req.body.time,
      label: req.body.label,
      active: req.body.active !== undefined ? Boolean(req.body.active) : true,
    });

    return res.status(200).json({
      success: true,
      message: 'Jadwal pakan berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID jadwal wajib disertakan.' });
    }

    const deviceId = await getVerifiedDeviceId(req);
    await deviceRepository.deleteSchedule(deviceId, id);

    return res.status(200).json({
      success: true,
      message: 'Jadwal pakan berhasil dihapus.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getSettings(req, res, next) {
  try {
    const deviceId = await getVerifiedDeviceId(req);
    const settings = await deviceRepository.getSettings(deviceId);
    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const validation = validateSettings(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const deviceId = await getVerifiedDeviceId(req);
    const updated = await deviceRepository.updateSettings(deviceId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Pengaturan sistem berhasil disimpan.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPhLogs(req, res, next) {
  try {
    const deviceId = await getVerifiedDeviceId(req);
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await deviceRepository.getPhLogs(deviceId, limit);
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}

export async function getActionLogs(req, res, next) {
  try {
    const deviceId = await getVerifiedDeviceId(req);
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await deviceRepository.getActionLogs(deviceId, limit);
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}

// ==============================================================================
// ESP32 Device Endpoints (Memerlukan Device Key via requireDeviceAuth)
// ==============================================================================

export async function postDeviceTelemetry(req, res, next) {
  try {
    const validation = validateTelemetry(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const deviceId = req.device.id;
    const updatedStatus = await iotService.processDeviceTelemetry(deviceId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Telemetri berhasil dicatat.',
      status: updatedStatus,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPendingCommand(req, res, next) {
  try {
    const deviceId = req.device.id;
    const command = await deviceRepository.getLatestPendingCommand(deviceId);
    return res.status(200).json({
      success: true,
      command: command || null,
    });
  } catch (err) {
    next(err);
  }
}

export async function reportCommandResult(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID perintah wajib disertakan.' });
    }

    const validation = validateCommandResult(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const deviceId = req.device.id;
    const result = await deviceRepository.updateCommandResult(deviceId, id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Laporan hasil eksekusi perintah berhasil disimpan.',
      result,
    });
  } catch (err) {
    next(err);
  }
}

export async function syncDevice(req, res, next) {
  try {
    const deviceId = req.device.id;
    const syncData = await iotService.getSyncDataForDevice(deviceId);
    return res.status(200).json({
      success: true,
      sync: syncData,
    });
  } catch (err) {
    next(err);
  }
}

export default {
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
};

