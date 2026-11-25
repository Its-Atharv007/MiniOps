/**
 * Prometheus Metrics Module
 * Configures prom-client registry, default Node.js process metrics,
 * and custom application metrics with bounded low-cardinality labels.
 */

const promClient = require('prom-client');

// Dedicated Registry to prevent global registry pollution
const register = new promClient.Registry();

// Enable standard Node.js process metrics (memory, CPU, event loop, handles)
promClient.collectDefaultMetrics({
  register,
  prefix: ''
});

// Custom HTTP Request Counter
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed, categorized by method, route, and status code.',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Custom HTTP Request Duration Histogram
const httpRequestDurationHistogram = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds, categorized by method, route, and status code.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register]
});

// Dynamic Application Uptime Gauge (reads real process.uptime() on every scrape)
const appUptimeGauge = new promClient.Gauge({
  name: 'app_uptime_seconds',
  help: 'Current application uptime in seconds, calculated from process.uptime().',
  registers: [register],
  collect() {
    this.set(Math.floor(process.uptime()));
  }
});

module.exports = {
  register,
  httpRequestCounter,
  httpRequestDurationHistogram,
  appUptimeGauge
};
