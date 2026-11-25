/**
 * Sample Users Routes
 * Exposes GET /api/users with in-memory sample developer records.
 * Demonstrates API requests and application monitoring without requiring a database.
 */

const express = require('express');

const router = express.Router();

const sampleUsers = [
  {
    id: 1,
    name: 'Rahul',
    role: 'Developer'
  },
  {
    id: 2,
    name: 'Amit',
    role: 'DevOps Engineer'
  }
];

router.get('/', (req, res) => {
  res.status(200).json(sampleUsers);
});

module.exports = router;
