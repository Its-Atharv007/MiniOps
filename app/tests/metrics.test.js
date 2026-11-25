/**
 * Prometheus Metrics Integration Tests
 * Validates /metrics endpoint, Prometheus text exposition format,
 * metrics increments on real traffic, and strict exclusion of /metrics requests.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { register } = require('../src/monitoring/metrics');

describe('Prometheus Metrics Telemetry', () => {
  beforeEach(() => {
    // Reset all metric counters and gauges to guarantee test independence
    register.resetMetrics();
  });

  test('GET /metrics should return 200 OK with Prometheus exposition format', async () => {
    const response = await request(app)
      .get('/metrics')
      .expect(200);

    assert(response.headers['content-type'].includes('text/plain'), 'Content-Type must be text/plain');
    assert(response.text.includes('process_cpu_user_seconds_total'), 'Default CPU metric must be exposed');
    assert(response.text.includes('app_uptime_seconds'), 'Dynamic uptime gauge must be exposed');
    assert(response.text.includes('http_requests_total'), 'Custom requests counter must be exposed');
  });

  test('Application requests should update http_requests_total metrics with bounded labels', async () => {
    // Generate actual requests
    await request(app).get('/health').expect(200);
    await request(app).get('/health').expect(200);
    await request(app).get('/api/users').expect(200);

    // Retrieve metrics
    const metricsRes = await request(app).get('/metrics').expect(200);
    const body = metricsRes.text;

    // Check that /health was counted twice
    assert(body.includes('http_requests_total{method="GET",route="/health",status_code="200"} 2'),
      'Must record 2 requests for /health');

    // Check that /api/users was counted once
    assert(body.includes('http_requests_total{method="GET",route="/api/users",status_code="200"} 1'),
      'Must record 1 request for /api/users');

    // Check request duration histogram observation
    assert(body.includes('http_request_duration_seconds_bucket{le="'),
      'Histogram buckets must be populated');
  });

  test('/metrics endpoint requests must be excluded from http_requests_total', async () => {
    // Hit /metrics multiple times
    await request(app).get('/metrics').expect(200);
    await request(app).get('/metrics').expect(200);
    await request(app).get('/metrics').expect(200);

    const metricsRes = await request(app).get('/metrics').expect(200);
    const body = metricsRes.text;

    // Ensure /metrics is never recorded in http_requests_total
    assert(!body.includes('route="/metrics"'),
      'http_requests_total must not contain route="/metrics"');
  });
});
