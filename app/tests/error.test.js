/**
 * Error Handling Integration Tests
 * Validates 404 not found responses (JSON for API, HTML for browser),
 * production 500 error sanitization, and credential redaction in logs.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');
const app = require('../src/app');
const { errorHandler } = require('../src/middleware/errorHandler');

describe('Error Handling Middleware', () => {
  test('GET /api/nonexistent should return 404 with structured JSON error', async () => {
    const response = await request(app)
      .get('/api/nonexistent-route')
      .expect(404);

    assert(response.headers['content-type'].includes('application/json'), 'Content-Type must be application/json');
    assert.deepEqual(response.body, {
      error: {
        code: 'NOT_FOUND',
        message: "Route '/api/nonexistent-route' not found"
      }
    });
  });

  test('GET /unknown-browser-page should return 404 with clean HTML', async () => {
    const response = await request(app)
      .get('/unknown-browser-page')
      .set('Accept', 'text/html')
      .expect(404);

    assert(response.headers['content-type'].includes('text/html'), 'Content-Type must be text/html');
    assert(response.text.includes('404 - Not Found'), 'Must contain 404 heading');
    assert(response.text.includes('Return to Homepage'), 'Must contain link to home');
  });

  test('500 Error handler should sanitize message and suppress stack traces in production', async () => {
    const testApp = express();
    testApp.get('/api/test-failure', (req, res, next) => {
      const sensitiveErr = new Error('Database password DB_PASS=Secret123 connection timeout');
      next(sensitiveErr);
    });
    testApp.use(errorHandler);

    // Temporarily set NODE_ENV to production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const response = await request(testApp)
        .get('/api/test-failure')
        .expect(500);

      assert(response.headers['content-type'].includes('application/json'));
      assert.equal(response.body.error.code, 'INTERNAL_SERVER_ERROR');
      // In production mode, sensitive error message must be suppressed
      assert(!response.body.error.message.includes('Secret123'), 'Sensitive details must not leak');
      assert.equal(response.body.error.message, 'Internal server error occurred');
      // Stack trace must never be returned
      assert.equal(response.body.stack, undefined, 'Stack trace must not exist');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('500 Error handler in development should provide error message but suppress stack trace', async () => {
    const testApp = express();
    testApp.get('/api/test-dev-failure', (req, res, next) => {
      next(new Error('Sample validation failure'));
    });
    testApp.use(errorHandler);

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      const response = await request(testApp)
        .get('/api/test-dev-failure')
        .expect(500);

      assert.equal(response.body.error.message, 'Sample validation failure');
      assert.equal(response.body.stack, undefined, 'Stack trace must not exist');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('Security regression: Logger must sanitize credentials and passwords from log output', async () => {
    const testApp = express();
    testApp.get('/api/test-leak', (req, res, next) => {
      next(new Error('Connection failed: DB_PASS=Secret123 token=mySecretToken123 postgresql://admin:password999@db:5432/main'));
    });
    testApp.use(errorHandler);

    // Intercept console.error to capture logged error output
    let capturedLogs = '';
    const originalConsoleError = console.error;
    console.error = (msg) => {
      capturedLogs += msg + '\n';
      originalConsoleError(msg);
    };

    try {
      await request(testApp).get('/api/test-leak').expect(500);

      // Verify sample passwords and tokens NEVER appear in the captured logs
      assert(!capturedLogs.includes('Secret123'), 'Sample password "Secret123" must be redacted from logs');
      assert(!capturedLogs.includes('mySecretToken123'), 'Sample token "mySecretToken123" must be redacted from logs');
      assert(!capturedLogs.includes('password999'), 'Connection string password "password999" must be redacted from logs');

      // Verify redaction tokens appear instead
      assert(capturedLogs.includes('DB_PASS=[REDACTED]'), 'DB_PASS must be replaced with [REDACTED]');
      assert(capturedLogs.includes('token=[REDACTED]'), 'token must be replaced with [REDACTED]');
      assert(capturedLogs.includes('postgresql://admin:[REDACTED]@db:5432/main'), 'Connection URI password must be replaced with [REDACTED]');
    } finally {
      console.error = originalConsoleError;
    }
  });
});
