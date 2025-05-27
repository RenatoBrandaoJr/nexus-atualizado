/**
 * Módulo de logging simulado
 */

export function createLogger(context) {
  return {
    info: (message, meta = {}) => console.log(`[INFO] [${context}]`, message, meta),
    error: (message, meta = {}) => console.error(`[ERROR] [${context}]`, message, meta),
    warn: (message, meta = {}) => console.warn(`[WARN] [${context}]`, message, meta),
    debug: (message, meta = {}) => console.debug(`[DEBUG] [${context}]`, message, meta)
  };
}

export default createLogger;
