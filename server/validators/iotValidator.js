const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateTelemetry(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data telemetri harus berupa objek JSON.' };
  }

  const { ph } = data;
  if (ph === undefined || ph === null || typeof ph !== 'number' || isNaN(ph)) {
    return { valid: false, error: 'Nilai pH wajib disertakan dan harus berupa angka numerik.' };
  }

  if (ph < 0 || ph > 14) {
    return { valid: false, error: 'Nilai pH tidak valid. Rentang pH harus di antara 0 dan 14.' };
  }

  return { valid: true };
}

export function validateFeedCommand(data) {
  if (data && data.duration_ms !== undefined) {
    const dur = Number(data.duration_ms);
    if (isNaN(dur) || dur < 100 || dur > 30000) {
      return { valid: false, error: 'Durasi pakan harus antara 100 dan 30000 milidetik.' };
    }
  }
  return { valid: true };
}

export function validatePumpCommand(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data perintah pompa tidak valid.' };
  }

  const { state } = data;
  if (state === undefined || state === null) {
    return { valid: false, error: 'Status pompa (state: true/false atau "on"/"off") wajib disertakan.' };
  }

  if (typeof state !== 'boolean' && state !== 'on' && state !== 'off') {
    return { valid: false, error: 'Format status pompa tidak valid. Gunakan boolean atau "on"/"off".' };
  }

  return { valid: true };
}

export function validateSchedule(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data jadwal pakan tidak valid.' };
  }

  const { time, label } = data;
  if (!time || typeof time !== 'string' || !TIME_REGEX.test(time)) {
    return { valid: false, error: 'Format waktu jadwal tidak valid. Gunakan format HH:mm 24-jam (contoh: 07:00).' };
  }

  if (label !== undefined && typeof label !== 'string') {
    return { valid: false, error: 'Label jadwal harus berupa teks.' };
  }

  return { valid: true };
}

export function validateSettings(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data pengaturan tidak valid.' };
  }

  const { ph_min, ph_max, feed_duration_ms, pump_duration_ms, device_name } = data;

  if (ph_min !== undefined) {
    const min = Number(ph_min);
    if (isNaN(min) || min < 0 || min > 14) {
      return { valid: false, error: 'Batas pH minimum harus angka antara 0 dan 14.' };
    }
  }

  if (ph_max !== undefined) {
    const max = Number(ph_max);
    if (isNaN(max) || max < 0 || max > 14) {
      return { valid: false, error: 'Batas pH maksimum harus angka antara 0 dan 14.' };
    }
  }

  if (ph_min !== undefined && ph_max !== undefined) {
    if (Number(ph_min) >= Number(ph_max)) {
      return { valid: false, error: 'Batas pH minimum harus lebih kecil dari batas maksimum.' };
    }
  }

  if (feed_duration_ms !== undefined) {
    const fd = Number(feed_duration_ms);
    if (isNaN(fd) || fd < 100 || fd > 60000) {
      return { valid: false, error: 'Durasi pakan harus antara 100 dan 60000 milidetik.' };
    }
  }

  if (pump_duration_ms !== undefined) {
    const pd = Number(pump_duration_ms);
    if (isNaN(pd) || pd < 1000 || pd > 600000) {
      return { valid: false, error: 'Durasi pompa harus antara 1000 dan 600000 milidetik.' };
    }
  }

  if (device_name !== undefined && (typeof device_name !== 'string' || device_name.trim().length === 0)) {
    return { valid: false, error: 'Nama perangkat tidak boleh kosong.' };
  }

  return { valid: true };
}

export function validateCommandResult(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data hasil perintah tidak valid.' };
  }

  const { status } = data;
  if (!status || (status !== 'completed' && status !== 'failed')) {
    return { valid: false, error: 'Status hasil perintah harus "completed" atau "failed".' };
  }

  return { valid: true };
}

export default {
  validateTelemetry,
  validateFeedCommand,
  validatePumpCommand,
  validateSchedule,
  validateSettings,
  validateCommandResult,
};

