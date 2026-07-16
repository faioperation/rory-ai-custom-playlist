# =============================================================================
# Soundtrack My Night — Backend Dockerfile
# Node.js 20 + Express 5 + MongoDB (Mongoose) + Stripe + Nodemailer
# =============================================================================
# Multi-stage build: separate dev (hot-reload) and production targets.
# Use --target development for docker-compose.yml (dev)
# Use --target production for docker-compose.prod.yml
# =============================================================================

# ── Stage 1: base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

# dumb-init: proper PID 1 signal forwarding for graceful shutdown
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy manifests first — maximises Docker layer cache
COPY package.json package-lock.json ./

# ── Stage 2: development ──────────────────────────────────────────────────────
FROM base AS development

# Install ALL deps (including devDependencies such as nodemon)
RUN npm ci

COPY . .

# Create upload dirs expected by multer (uploads/admin, uploads/user)
RUN mkdir -p uploads/admin uploads/user

# Copy and make entrypoint executable (handles WAIT_HOSTS for mongo)
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

# nodemon already installed as devDependency — use it for hot-reload
# docker-entrypoint.sh waits for WAIT_HOSTS (e.g. mongo:27017) before exec
ENTRYPOINT ["dumb-init", "--", "/docker-entrypoint.sh"]
CMD ["npx", "nodemon", "src/server.js"]

# ── Stage 3: production deps only ─────────────────────────────────────────────
FROM base AS deps

# Install only production dependencies — keeps image small
RUN npm ci --omit=dev

# ── Stage 4: production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

# dumb-init for proper signal handling (SIGTERM → graceful shutdown)
RUN apk add --no-cache dumb-init wget

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy application source
COPY --chown=appuser:appgroup . .

# Copy and make entrypoint executable
COPY --chown=root:root docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create upload dirs and give ownership to non-root user
# These are mounted as a named volume in docker-compose.prod.yml
RUN mkdir -p uploads/admin uploads/user && \
    chown -R appuser:appgroup uploads

USER appuser

EXPOSE 3000

# Health check calls the existing /health endpoint (defined in app.js)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# docker-entrypoint.sh checks WAIT_HOSTS before exec-ing the CMD
ENTRYPOINT ["dumb-init", "--", "/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
