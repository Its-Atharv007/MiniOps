/**
 * Lightweight Application Logger
 * Logs lifecycle events and incoming HTTP requests cleanly.
 * Strictly sanitizes sensitive information (passwords, tokens, keys, URIs) from all log streams.
 */

function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Sanitizes messages by redacting credentials, tokens, keys, and connection strings.
 * @param {string} text
 * @returns {string} Sanitized text
 */
function sanitize(text) {
  if (typeof text !== 'string') return text;

  return text
    // Passwords, tokens, secrets, API keys, credentials (e.g. password=xyz, token: abc, DB_PASS=xyz)
    .replace(/(password|passwd|pass|pwd|db_pass|secret|token|api[_-]?key|auth)\s*[:=]\s*([^\s,;]+)/gi, '$1=[REDACTED]')
    // Bearer authorization tokens
    .replace(/(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]')
    // Database connection strings containing user:password@host
    .replace(/((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^\s:@]+):([^@\s]+)@/gi, '$1:[REDACTED]@');
}

/**
 * Standard log message formatter
 * @param {'INFO' | 'WARN' | 'ERROR'} level
 * @param {string} message
 */
function log(level, message) {
  const sanitizedMessage = sanitize(message);
  const line = `[${formatTimestamp()}] [${level}] ${sanitizedMessage}`;

  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Express middleware for request logging
 */
function requestLoggerMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';

    // Only log method and path; exclude query parameters or headers for privacy
    const pathOnly = req.path || req.originalUrl?.split('?')[0] || '/';
    log(level, `${req.method} ${pathOnly} ${status} - ${duration}ms`);
  });

  next();
}

module.exports = {
  requestLoggerMiddleware,
  sanitize,
  info: (msg) => log('INFO', msg),
  warn: (msg) => log('WARN', msg),
  error: (msg) => log('ERROR', msg)
};
