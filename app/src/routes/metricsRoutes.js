/**
 * Prometheus Metrics Scrape Route
 * Exposes GET /metrics in standard Prometheus text exposition format.
 */

const express = require('express');
const { register } = require('../monitoring/metrics');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metricsData = await register.metrics();
    res.send(metricsData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
