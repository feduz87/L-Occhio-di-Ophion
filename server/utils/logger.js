/**
 * Simple Logger Utility
 */

const logger = {
  log: (...args) => console.log('[INFO]', ...args),
  info: (...args) => console.info('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => {
    if (process.env.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }
};

export default logger;
