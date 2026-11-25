/**
 * HTTP Server Entry Point
 * Binds Express app to configured HOST and PORT, and handles graceful shutdown signals.
 */

const app = require('./app');
const config = require('./config');
const logger = require('./middleware/logger');

const server = app.listen(config.port, config.host, () => {
  logger.info(`Application: ${config.appName}`);
  logger.info(`Server listening on http://${config.host}:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

// Flag to prevent multiple shutdown triggers
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error(`Error while closing HTTP server: ${err.message}`);
      process.exit(1);
    }
    logger.info('HTTP server closed cleanly. All pending connections resolved.');
    process.exit(0);
  });

  // Force shutdown after timeout if connections fail to close
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing process termination.');
    process.exit(1);
  }, 5000);

  // Unref timer so it does not keep event loop open if server closes sooner
  shutdownTimeout.unref();
}

// Register OS termination signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
