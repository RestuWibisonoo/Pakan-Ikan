import deviceRepository from '../repositories/deviceRepository.js';
import iotService from './iotService.js';
import config from '../config/appConfig.js';

let runnerInterval = null;
const triggeredMinutes = new Set();

/**
 * Mendapatkan string jam & menit saat ini dalam zona waktu WIB (Asia/Jakarta, GMT+7)
 */
export function getCurrentWibTime() {
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit', minute: '2-digit' };
  const formatter = new Intl.DateTimeFormat('id-ID', options);
  const parts = formatter.formatToParts(now);
  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
}

export function getTodayWibDate() {
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat('id-ID', options).format(now);
}

/**
 * Memeriksa jadwal pakan aktif dan memicu pemberian pakan otomatis jika waktu cocok
 */
export async function checkAndExecuteSchedules() {
  try {
    const defaultId = config.device.defaultDeviceId;
    const schedules = await deviceRepository.getSchedules(defaultId);
    if (!schedules || schedules.length === 0) return;

    const currentWib = getCurrentWibTime();
    const todayDate = getTodayWibDate();

    // Reset buffer riwayat pemicuan jika sudah terakumulasi banyak
    if (triggeredMinutes.size > 200) {
      triggeredMinutes.clear();
    }

    for (const schedule of schedules) {
      if (!schedule.active) continue;

      if (schedule.time === currentWib) {
        const triggerKey = `${todayDate}_${currentWib}_${schedule.id}`;
        if (!triggeredMinutes.has(triggerKey)) {
          // Perlindungan ganda: pastikan belum pernah dieksekusi dalam 60 detik terakhir
          const recentLogs = await deviceRepository.getActionLogs(defaultId, 5);
          const alreadyExecutedRecently = recentLogs.some((l) => {
            if (l.type !== 'feed' || l.action !== 'Auto Feed') return false;
            const logTime = new Date(l.timestamp).getTime();
            return Date.now() - logTime < 60000;
          });

          if (alreadyExecutedRecently) {
            triggeredMinutes.add(triggerKey);
            continue;
          }

          triggeredMinutes.add(triggerKey);
          console.log(
            `[ScheduleRunner] Waktu cocok (${currentWib} WIB). Menjalankan jadwal pakan otomatis (1x): "${schedule.label || 'Pakan'}"`
          );

          await iotService.triggerFeedCommand(defaultId, {
            source: 'schedule',
            userEmail: `auto-schedule (${schedule.label || 'Jadwal'})`,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[ScheduleRunner] Error saat memeriksa jadwal:', err.message);
  }
}

/**
 * Memulai runner latar belakang untuk mengeksekusi jadwal secara otomatis
 */
export function startScheduleRunner(intervalMs = 30000) {
  if (runnerInterval) return;
  console.log('[ScheduleRunner] Background scheduler aktif (pemeriksaan otomatis setiap 30 detik, zona waktu WIB).');
  runnerInterval = setInterval(checkAndExecuteSchedules, intervalMs);
}

/**
 * Menghentikan runner latar belakang
 */
export function stopScheduleRunner() {
  if (runnerInterval) {
    clearInterval(runnerInterval);
    runnerInterval = null;
  }
}

export default {
  getCurrentWibTime,
  getTodayWibDate,
  checkAndExecuteSchedules,
  startScheduleRunner,
  stopScheduleRunner,
};

