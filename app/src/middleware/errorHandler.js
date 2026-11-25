/**
 * Centralized Error Handling Middleware
 * Provides context-aware 404 and 500 responses (JSON for API routes, HTML for browsers)
 * and strictly prevents stack trace leakage in production.
 */

const config = require('../config');
const logger = require('./logger');

/**
 * 404 Not Found Handler for undefined routes
 */
function notFoundHandler(req, res, next) {
  const isApi = req.path.startsWith('/api') || req.originalUrl.startsWith('/api') || req.accepts('json');

  if (isApi) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route '${req.originalUrl}' not found`
      }
    });
  }

  // Fallback for direct browser navigation
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>404 Not Found - MiniOps</title>
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #f8fafc; color: #1e293b; }
        h1 { font-size: 2rem; color: #ef4444; }
        a { color: #2563eb; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>404 - Not Found</h1>
      <p>The requested page <code>${req.path}</code> does not exist.</p>
      <p><a href="/">Return to Homepage</a></p>
    </body>
    </html>
  `.trim());
}

/**
 * Centralized 500 Internal Error Handler
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const isApi = req.path.startsWith('/api') || req.originalUrl.startsWith('/api') || req.accepts('json');

  // Check production status dynamically or from config
  const isProd = process.env.NODE_ENV === 'production' || config.isProduction;

  // Log error message server-side
  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message || 'Unknown error'}`);

  // Never expose raw stack trace to clients; in development provide error message, in production provide sanitized message
  const clientMessage = isProd && statusCode === 500
    ? 'Internal server error occurred'
    : (err.message || 'Internal server error');

  if (isApi) {
    return res.status(statusCode).json({
      error: {
        code: statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
        message: clientMessage
      }
    });
  }

  // HTML response for browser requests
  res.status(statusCode).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>500 Internal Server Error - MiniOps</title>
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #f8fafc; color: #1e293b; }
        h1 { font-size: 2rem; color: #ef4444; }
        a { color: #2563eb; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>${statusCode} - Server Error</h1>
      <p>${clientMessage}</p>
      <p><a href="/">Return to Homepage</a></p>
    </body>
    </html>
  `.trim());
}

module.exports = {
  notFoundHandler,
  errorHandler
};
