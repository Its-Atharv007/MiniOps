/**
 * Request Metrics Middleware
 * Intercepts incoming HTTP requests, calculates response duration,
 * and updates Prometheus counters and histograms with bounded labels.
 */

const { httpRequestCounter, httpRequestDurationHistogram } = require('../monitoring/metrics');

/**
 * Normalizes the route label to prevent high-cardinality explosions.
 * Avoids raw URLs, IDs, or query strings as metric labels.
 *
 * @param {import('express').Request} req
 * @returns {string} Normalized route label
 */
function getNormalizedRoute(req) {
  // If matched by an Express route handler, use the route pattern (e.g. '/api/users')
  if (req.route && req.route.path) {
    const baseUrl = req.baseUrl || '';
    let fullPath = `${baseUrl}${req.route.path}`.replace(/\/+/g, '/');
    if (fullPath.length > 1 && fullPath.endsWith('/')) {
      fullPath = fullPath.slice(0, -1);
    }
    return fullPath;
  }

  // Handle root route
  if (req.path === '/' || req.originalUrl === '/') {
    return '/';
  }

  // Fallback for unmatched / 404 routes to prevent cardinality explosion
  return 'unmatched';
}

/**
 * Middleware function to track HTTP requests and durations.
 */
function requestMetricsMiddleware(req, res, next) {
  // Exclude the Prometheus scraping endpoint itself to prevent metric noise and feedback loops
  if (req.path === '/metrics' || req.originalUrl === '/metrics') {
    return next();
  }

  const startTime = process.hrtime.bigint();

  // Hook into response finish event to ensure final status code is captured
  res.on('finish', () => {
    try {
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;

      const labels = {
        method: req.method.toUpperCase(),
        route: getNormalizedRoute(req),
        status_code: res.statusCode.toString()
      };

      httpRequestCounter.inc(labels, 1);
      httpRequestDurationHistogram.observe(labels, durationSeconds);
    } catch {
      // Metrics collection should never crash the request-response cycle
    }
  });

  next();
}

module.exports = {
  requestMetricsMiddleware,
  getNormalizedRoute
};
