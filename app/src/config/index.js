/**
 * Application Configuration
 * Centralized loader for environment variables with safe defaults.
 */

const path = require('node:path');
const fs = require('node:fs');

// In Node 22, load .env automatically if it exists without extra libraries
if (typeof process.loadEnvFile === 'function') {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore if cannot read
    }
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'MiniOps Demo App',
  isProduction: process.env.NODE_ENV === 'production'
};

module.exports = Object.freeze(config);
