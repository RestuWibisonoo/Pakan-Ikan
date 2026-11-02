import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,https://pakan-ikan.my.id')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'pakan-ikan-4c18e',
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDO4JXKcHrTcufS9LavNMLGhpwJxYbdUP8',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Pakan Ikan',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'katasandi.pakanikan@gmail.com',
  },

  rateLimit: {
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 20,
  },
};

export default config;

