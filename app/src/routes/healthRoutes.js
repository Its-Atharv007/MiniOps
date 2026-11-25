/**
 * Health Check Routes
 * Exposes GET /health for container orchestration and uptime monitoring probes.
 */

const express = require('express');
const config = require('../config');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    application: config.appName,
    uptime: Math.floor(process.uptime())
  });
});

module.exports = router;
