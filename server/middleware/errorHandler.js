import config from '../config/appConfig.js';

export function errorHandler(err, req, res, next) {
  // Catat error secara aman (tidak mencatat data sensitif)
  const safeMessage = err.message || 'Internal Server Error';
  console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, safeMessage);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 && !config.isDev
      ? 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.'
      : safeMessage,
    ...(config.isDev && { details: err.code || undefined }),
  });
}

export default errorHandler;

