// Logger simplificado - usa console nativo
// Para SaaS pequeno (10-50 clientes), console.log é suficiente
// Render/Railway já capturam stdout/stderr automaticamente

const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
};

export default logger;
