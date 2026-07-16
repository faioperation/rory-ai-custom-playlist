# =============================================================================
# Soundtrack My Night — Frontend Dockerfile
# React 19 + Vite 7 + Tailwind CSS v4 → nginx:1.27-alpine static serving
# =============================================================================
# Multi-stage:
#   Stage 1 (build)       — Node.js builds the Vite bundle
#   Stage 2 (production)  — nginx serves the static dist/
#
# IMPORTANT: VITE_BACKEND_URL is embedded at BUILD TIME by Vite.
# In production (behind the nginx reverse proxy), leave it empty so axios
# uses relative URLs routed by nginx.  For development, set it to
# http://localhost:3000.
# =============================================================================

# ── Stage 1: Vite build ────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copy manifests first — layer cache optimisation
COPY package.json package-lock.json ./

RUN npm ci

# Receive VITE_BACKEND_URL as a build argument (empty = relative URLs via nginx)
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: nginx static serving ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# SPA nginx config (try_files handles React Router client-side routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled Vite output
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check: verify nginx is serving the index.html
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
