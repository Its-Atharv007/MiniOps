/**
 * Express Application Configuration
 * Assembles middleware pipeline, static asset serving, routes, and error handlers.
 * Exported independently for isolated testing with Supertest.
 */

const express = require('express');
const path = require('node:path');

const { requestLoggerMiddleware } = require('./middleware/logger');
const { requestMetricsMiddleware } = require('./middleware/requestMetrics');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const healthRoutes = require('./routes/healthRoutes');
const userRoutes = require('./routes/userRoutes');
const metricsRoutes = require('./routes/metricsRoutes');

const app = express();

// 1. Telemetry and Logging Middlewares (Registered first to capture final response statuses)
app.use(requestLoggerMiddleware);
app.use(requestMetricsMiddleware);

// 2. Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. Static Assets (Public Directory for Vanilla Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// 4. Application Routes
app.use('/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/metrics', metricsRoutes);

// 5. Centralized Error Handlers (Registered last)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
