# Soundtrack My Night — Production Deployment Guide

> Complete step-by-step guide for deploying on a **Ubuntu 22.04 LTS** VPS
> using Docker Compose, Nginx, and Let's Encrypt SSL.

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Install Docker & Docker Compose](#2-install-docker--docker-compose)
3. [Clone the Repository](#3-clone-the-repository)
4. [Configure Environment Files](#4-configure-environment-files)
5. [Configure Stripe Webhook](#5-configure-stripe-webhook)
6. [Build & Start Services](#6-build--start-services)
7. [Domain & Nginx (Host-Level SSL)](#7-domain--nginx-host-level-ssl)
8. [Let's Encrypt SSL Certificate](#8-lets-encrypt-ssl-certificate)
9. [Verify Deployment](#9-verify-deployment)
10. [Firewall Configuration](#10-firewall-configuration)
11. [Persistent Storage & Backups](#11-persistent-storage--backups)
12. [Updating the Application](#12-updating-the-application)
13. [Monitoring & Logs](#13-monitoring--logs)
14. [Scaling](#14-scaling)
15. [Troubleshooting](#15-troubleshooting)
16. [Known Issues (Do Not Fix)](#16-known-issues-do-not-fix)

---

## 1. Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 1 vCPU  | 2 vCPU      |
| RAM      | 1 GB    | 2 GB        |
| Storage  | 20 GB   | 40 GB SSD   |
| OS       | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Open ports | 22 (SSH), 80 (HTTP), 443 (HTTPS) | Same |

**External services required before deployment:**

- MongoDB Atlas account (free tier works)
- OpenAI API key (billing enabled)
- Spotify Developer App (with refresh token)
- Stripe account (with webhook endpoint configured)
- Email account on Hostinger (SMTP credentials)
- Domain name pointed to your server IP

---

## 2. Install Docker & Docker Compose

```bash
# Update packages
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

# Allow current user to run docker without sudo
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 3. Clone the Repository

```bash
# Clone to /srv (standard Linux location for service data)
sudo mkdir -p /srv/smn
sudo chown $USER:$USER /srv/smn
cd /srv/smn

git clone https://github.com/YOUR_ORG/rory-ai-custom-playlist.git .
```

---

## 4. Configure Environment Files

```bash
# Copy example env files
cp backend/.env.example  backend/.env
cp ai/.env.example       ai/.env
cp frontend/.env.example frontend/.env

# Edit backend env
nano backend/.env
```

Fill in **every** value. Key production values:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/smn_db
JWT_SECRET=<64 random chars — run: openssl rand -base64 48>
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com
AI_ENDPOINT=http://ai:8000
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
EMAIL_USER=info@yourdomain.com
EMAIL_PASS=your_hostinger_smtp_password
```

```bash
# Edit AI service env
nano ai/.env
```

```env
OPENAI_API_KEY=sk-...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
```

```bash
# Edit frontend env — leave VITE_BACKEND_URL empty in production
nano frontend/.env
```

```env
# Empty — nginx routes /api/* to backend internally
VITE_BACKEND_URL=
```

---

## 5. Configure Stripe Webhook

In **Stripe Dashboard** → Developers → Webhooks → Add endpoint:

- **Endpoint URL:** `https://yourdomain.com/api/v1/stripe/payment/webhook`
- **Events to listen to:** `checkout.session.completed`
- Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET` in `backend/.env`

> The nginx config (`nginx/nginx.conf`) already sets `proxy_request_buffering off`
> for this exact route, which is required for Stripe signature verification.

---

## 6. Build & Start Services

```bash
cd /srv/smn

# Make the entrypoint script executable
chmod +x backend/docker-entrypoint.sh

# Build all images and start in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# Watch startup logs
docker compose -f docker-compose.prod.yml logs -f
```

Expected startup order (enforced by `depends_on` + `healthcheck`):

```
ai       → healthy
backend  → healthy  (depends on ai)
frontend → healthy
nginx    → healthy  (depends on backend + frontend)
```

Verify all containers are running:

```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 7. Domain & Nginx (Host-Level SSL)

> The Dockerised nginx handles HTTP (port 80). For HTTPS (port 443),
> install Certbot directly on the host and terminate TLS there,
> OR use a cloud load balancer (AWS ALB, Cloudflare, etc.).

### Option A: Certbot on the host (recommended for VPS)

```bash
# Install Certbot
sudo apt-get install -y certbot

# Stop Docker nginx temporarily to free port 80 for Certbot
docker compose -f docker-compose.prod.yml stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Restart nginx
docker compose -f docker-compose.prod.yml start nginx
```

Then update `nginx/nginx.conf` to add SSL:

```nginx
# Add inside the server block (or add a second server block for 443):
listen 443 ssl;
ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

And mount the certs in `docker-compose.prod.yml` under the `nginx` service volumes:

```yaml
volumes:
  - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

Then update nginx to expose 443:

```yaml
ports:
  - "80:80"
  - "443:443"
```

Rebuild nginx:

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps nginx
```

### Option B: Cloudflare Proxy (simplest)

1. Point your domain's nameservers to Cloudflare
2. Enable **Proxy** (orange cloud) for the A record pointing to your server IP
3. In Cloudflare SSL/TLS settings, set mode to **Full**
4. No Certbot needed — Cloudflare handles TLS termination

---

## 8. Let's Encrypt SSL Certificate

Auto-renewal via cron:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
# Add line:
0 3 * * * certbot renew --quiet && docker compose -f /srv/smn/docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 9. Verify Deployment

```bash
# Backend health check
curl https://yourdomain.com/health
# Expected: {"status":"OK","message":"API is running"}

# AI service health (via backend — not directly exposed)
# Check via backend logs:
docker compose -f docker-compose.prod.yml logs backend | grep "MongoDB connected"

# Frontend
curl -I https://yourdomain.com/
# Expected: HTTP/1.1 200 OK

# Nginx health
curl https://yourdomain.com/health
# Expected: {"status":"ok","service":"nginx"}
```

---

## 10. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important — do this before enabling UFW)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to internal Docker ports from outside
# (Docker manages iptables — these ports should not be exposed anyway)
# 3000 (backend), 8000 (ai), 27017 (mongo) are only on Docker network

# Check status
sudo ufw status verbose
```

---

## 11. Persistent Storage & Backups

### Docker Volumes

The production compose uses a named volume for uploaded files:

```
smn_uploads_prod  →  /app/uploads  (admin + user profile images)
```

### Backup Uploads

```bash
# Backup uploads volume to a tar archive
docker run --rm \
  -v smn_uploads_prod:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/uploads_backup_$(date +%Y%m%d).tar.gz -C /data .

# Restore uploads
docker run --rm \
  -v smn_uploads_prod:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/uploads_backup_YYYYMMDD.tar.gz -C /data
```

### MongoDB Backup (Atlas)

MongoDB Atlas provides automated backups on paid tiers.

For manual backup using `mongodump`:

```bash
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/smn_db" \
    --out=./backup_$(date +%Y%m%d)
```

---

## 12. Updating the Application

```bash
cd /srv/smn

# Pull latest code
git pull origin main

# Rebuild changed services and restart (zero-downtime not guaranteed)
docker compose -f docker-compose.prod.yml up -d --build --no-deps backend
docker compose -f docker-compose.prod.yml up -d --build --no-deps ai
docker compose -f docker-compose.prod.yml up -d --build --no-deps frontend

# Reload nginx after frontend rebuild
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 13. Monitoring & Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f ai
docker compose -f docker-compose.prod.yml logs -f nginx

# Container resource usage
docker stats

# Container health status
docker compose -f docker-compose.prod.yml ps
```

Log files are stored by Docker's json-file driver with rotation (max 10MB × 5 files per service, configured in docker-compose.prod.yml).

---

## 14. Scaling

The AI service is stateless and safe to run multiple replicas:

```bash
# Scale AI service to 3 replicas
docker compose -f docker-compose.prod.yml up -d --scale ai=3
```

> Update `nginx/nginx.conf` to use upstream load balancing if scaling backend:
> ```nginx
> upstream backend {
>     server backend_1:3000;
>     server backend_2:3000;
> }
> ```

---

## 15. Troubleshooting

### Container won't start

```bash
docker compose -f docker-compose.prod.yml logs <service_name>
```

### Backend can't connect to MongoDB

- Check `MONGO_URI` in `backend/.env`
- Ensure MongoDB Atlas IP whitelist includes your server's public IP
- Test: `docker compose -f docker-compose.prod.yml exec backend node -e "require('./src/config/dbConnect.js').default()"`

### AI service not reachable

```bash
# Ping from backend container
docker compose -f docker-compose.prod.yml exec backend wget -qO- http://ai:8000/
```

### Frontend shows blank page / 404

- Ensure `VITE_BACKEND_URL` is empty in `frontend/.env` for production
- Rebuild frontend: `docker compose -f docker-compose.prod.yml up -d --build frontend`

### Stripe webhook fails

- Verify `STRIPE_WEBHOOK_SECRET` matches the value in Stripe Dashboard
- Verify endpoint URL: `https://yourdomain.com/api/v1/stripe/payment/webhook`
- Check nginx is NOT buffering the body (nginx.conf has `proxy_request_buffering off` for this route)
- Test: `stripe listen --forward-to https://yourdomain.com/api/v1/stripe/payment/webhook`

### Uploads not persisting

- The `smn_uploads_prod` named volume must exist
- Check: `docker volume ls | grep smn_uploads`
- Create manually if missing: `docker volume create smn_uploads_prod`

---

## 16. Known Issues (Do Not Fix)

The following issues exist in the application code but are **out of scope** for
this Dockerization. They are documented for awareness only.

| # | Severity | Description | Location |
|---|----------|-------------|----------|
| 1 | Critical | `GET /api/v1/auth/me` endpoint does not exist — called by `AuthContext.jsx` on every page load | `backend/src/routes/auth.routes.js` |
| 2 | High | Stripe webhook processes AI+Spotify generation synchronously — risks 30s timeout and duplicate premium playlists | `backend/src/controllers/payment.controller.js` |
| 3 | High | `console.log("Upgrade Payload:", ...)` left in production API code | `frontend/src/api/playlistApi.js:15` |
| 4 | High | Duplicate payload fields (`quizId` + `quiz_id`) sent on playlist upgrade | `frontend/src/api/playlistApi.js:17–22` |
| 5 | High | No rate limiting middleware in Express app (nginx provides basic protection) | `backend/src/app.js` |
| 6 | Medium | SMTP host hardcoded to `smtp.hostinger.com:587` — not configurable via env | `backend/src/utils/email.js:5` |
| 7 | Medium | `upgradePlaylist` deletion logic is commented out — old records not cleaned | `backend/src/services/playlist.service.js:28–33` |
| 8 | Medium | `ALLOWED_ORIGIN` constant defined but not used in CORS middleware | `backend/src/config/constant.js:6` |
| 9 | Low | `App.jsx` is an empty file (0 bytes) | `frontend/src/App.jsx` |

These issues should be addressed separately in a code review cycle.

---

*Soundtrack My Night — Deployment Guide v1.0*
