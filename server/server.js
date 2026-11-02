import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/appConfig.js';
import authRoutes from './routes/authRoutes.js';
import iotRoutes from './routes/iotRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { hasAdminCredentials, hasDatabaseAccess } from './config/firebaseAdmin.js';
import { isSmtpConfigured } from './config/smtp.js';

const app = express();

// Keamanan HTTP Headers
app.use(helmet());

// Konfigurasi CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin) || config.isDev) {
        return callback(null, true);
      }
      return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS Pakan Ikan.'));
    },
    credentials: true,
  })
);

// Body Parser dengan batasan ukuran aman
app.use(express.json({ limit: '100kb' }));

// Health Check Endpoint (Membedakan secara jujur antara Readiness konfigurasi dan Live Connectivity)
app.get('/api/health', (req, res) => {
  const isProd = config.nodeEnv === 'production';
  const hasCreds = hasAdminCredentials();
  const dbReady = hasDatabaseAccess();
  const smtpReady = isSmtpConfigured();
  const deviceAuthReady = Boolean(config.device.apiKey && config.device.apiKey.trim().length > 0);

  // Status sistem: 'degraded' di production jika kredensial wajib belum terkonfigurasi
  const systemStatus = isProd && (!hasCreds || !dbReady || !deviceAuthReady) ? 'degraded' : 'ok';

  const services = {
    firebaseAdmin: hasCreds ? 'ready' : 'credentials-needed',
    realtimeDatabase: dbReady
      ? (isProd ? 'ready' : 'ready-dev')
      : (isProd ? 'unavailable' : 'mock-fallback'),
    smtp: smtpReady ? 'configured' : (isProd ? 'unconfigured' : 'mock-mode'),
    deviceAuth: deviceAuthReady ? 'configured' : 'unconfigured',
  };

  res.status(200).json({
    status: systemStatus,
    app: 'Pakan Ikan Email Authentication Service',
    serviceName: 'Pakan Ikan IoT & Authentication Service',
    projectId: config.firebase.projectId,
    environment: config.nodeEnv,
    services,
    readiness: services,
    liveConnectivity: {
      realtimeDatabase: dbReady ? 'ready-for-queries' : 'not-connected',
    },
    timestamp: new Date().toISOString(),
  });
});

// Routing Autentikasi Kustom (Tetap berada di /api/auth untuk backward compatibility)
app.use('/api/auth', authRoutes);

// Routing IoT v1 (Monitoring pH, Feeder Servo, Pompa Air, Jadwal, Pengaturan)
app.use('/api/v1', iotRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.originalUrl}' tidak ditemukan pada server Pakan Ikan.`,
  });
});

// Central Error Handler
app.use(errorHandler);

// Jalankan Server jika file ini dieksekusi secara langsung (bind ke loopback 127.0.0.1)
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, config.host, () => {
    console.log(`[Pakan Ikan Server] Berjalan secara internal di http://${config.host}:${config.port} (${config.nodeEnv})`);
    console.log(`[Pakan Ikan Server] Frontend target URL: ${config.frontendUrl}`);
  });
}

export default app;

