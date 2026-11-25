# Stage 1: Build & Dependencies
FROM node:22-alpine AS build

WORKDIR /usr/src/app

# Copy package definitions
COPY package*.json ./

# Install production-only dependencies cleanly
RUN npm ci --omit=dev

# Stage 2: Minimal Production Image
FROM node:22-alpine

# Install curl for reliable container health checks
RUN apk add --no-cache curl

WORKDIR /usr/src/app

# Production environment configuration
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    APP_NAME="MiniOps Demo App"

# Copy dependencies and application source with non-root ownership
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node public ./public
COPY --chown=node:node src ./src

# Run as built-in unprivileged user for security
USER node

# Expose configured application port
EXPOSE 3001

# Configure graceful termination signal
STOPSIGNAL SIGTERM

# Container healthcheck using existing /health endpoint
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:3001/health || exit 1

# Start server
CMD ["node", "src/server.js"]
