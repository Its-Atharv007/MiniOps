/**
 * Users API Integration Tests
 * Validates GET /api/users response structure and data using Supertest in-memory.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

describe('Users API Endpoints', () => {
  test('GET /api/users should return 200 OK with in-memory users array', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);

    assert(response.headers['content-type'].includes('application/json'), 'Content-Type must be application/json');
    assert(Array.isArray(response.body), 'Response body must be an array');
    assert.equal(response.body.length, 2, 'Expected 2 sample users');

    const expectedUsers = [
      { id: 1, name: 'Rahul', role: 'Developer' },
      { id: 2, name: 'Amit', role: 'DevOps Engineer' }
    ];

    assert.deepEqual(response.body, expectedUsers, 'Users data must match expected in-memory records');
  });
});
