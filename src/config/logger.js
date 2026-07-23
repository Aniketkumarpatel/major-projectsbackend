'use strict';

/**
 * Minimal structured logger.
 * In production, replace with winston or pino for log rotation & transport.
 */
const logger = {
  info: (msg) => console.log(`[INFO]  ${new Date().toISOString()} – ${msg}`),
  warn: (msg) => console.warn(`[WARN]  ${new Date().toISOString()} – ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} – ${msg}`),
  debug: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} – ${msg}`);
    }
  },
};

module.exports = logger;
