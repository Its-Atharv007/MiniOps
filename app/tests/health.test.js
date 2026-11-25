/**
 * Health & Homepage Integration Tests
 * Validates GET / and GET /health responses using Supertest in-memory.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

describe('Homepage & Health Endpoints', () => {
  test('GET / should serve the HTML homepage with 200 OK', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    assert(response.headers['content-type'].includes('text/html'), 'Content-Type must be text/html');
    assert(response.text.includes('MiniOps Demo App'), 'Page must contain brand title');
    assert(response.text.includes('id="app-status-badge"'), 'Page must contain status badge element');
    assert(response.text.includes('id="btn-test-health"'), 'Page must contain health test button');
  });

  test('GET /health should return 200 OK with valid health status JSON', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    assert(response.headers['content-type'].includes('application/json'), 'Content-Type must be application/json');
    assert.equal(response.body.status, 'healthy');
    assert.equal(response.body.application, 'MiniOps Demo App');
    assert.equal(typeof response.body.uptime, 'number', 'Uptime must be a number');
    assert(response.body.uptime >= 0, 'Uptime must be non-negative');
  });
});
