# 🎧 Soundtrack My Night

> **AI-powered custom playlist generator for events.**  
> Answer a 10-step quiz about your event — get a curated Spotify playlist in seconds.  
> Free: 15 songs · Premium: 50 songs · Powered by OpenAI + Spotify Web API.

[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.12-teal?logo=fastapi)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](https://docker.com)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Quick Start (Local / No Docker)](#quick-start-local--no-docker)
- [Environment Setup](#environment-setup)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Payment Flow](#payment-flow)
- [AI Service](#ai-service)
- [File Uploads](#file-uploads)
- [Email System](#email-system)
- [Docker Reference](#docker-reference)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)
- [Known Issues](#known-issues)
- [Security Notes](#security-notes)
- [Performance Notes](#performance-notes)

---

## Project Overview

**Soundtrack My Night** is a full-stack SaaS platform built for Irish wedding/event DJ Rory Clerkin. Users complete a 10-step music preferences quiz. The AI microservice calculates a *vibe fingerprint* (Energy, Modern, Groove, Luxe, Nostalgia scores), sends the fingerprint to OpenAI `gpt-4o-mini`, and creates a real Spotify playlist. Guests receive a link via email; registered users can view all their playlists in a dashboard.

**Business model:**
- Free quiz -> 15-song Spotify playlist -> sent via email
- Paid upgrade (EUR 9 via Stripe) -> 50-song premium playlist -> saved to account

---

## Features

| Feature | Description |
|---------|-------------|
| AI Playlist Generation | OpenAI gpt-4o-mini curates songs based on vibe fingerprint |
| Spotify Integration | Real Spotify playlists created and linked in the UI |
| Email Delivery | HTML transactional emails with playlist links via Nodemailer |
| Stripe Payments | Secure checkout for EUR 9 premium 50-song upgrade |
| JWT Auth | Register / login / forgot-password / OTP reset |
| User Dashboard | View all generated playlists per account |
| Admin Panel | Manage users, playlists, profile; view stats |
| File Uploads | Admin and user profile image upload via Multer |
| Cookie Consent | GDPR-compliant cookie consent management |
| Responsive UI | React + Tailwind CSS v4 with mobile-first design |

---

## Architecture

```
Browser
   |
   v
[nginx :80]  <-- Reverse proxy (production only)
   |
   |-- /api/*      -->  [backend :3000]  Node.js + Express 5
   |                        |
   |                        |-- MongoDB Atlas (Mongoose)
   |                        |-- Stripe (payments)
   |                        |-- Nodemailer (email)
   |                        `-- [ai :8000]  FastAPI
   |                                |
   |                                |-- OpenAI gpt-4o-mini
   |                                `-- Spotify Web API
   |
   `-- /*          -->  [frontend :80]  React 19 + Vite (nginx SPA)
```

**Data flow for a free guest quiz:**
1. Browser -> `POST /api/v1/quiz/guest/submit`
2. Backend -> `POST http://ai:8000/generate-playlist`
3. AI: calculates vibe fingerprint -> calls OpenAI -> calls Spotify
4. AI -> returns playlist JSON
5. Backend -> saves Quiz + Playlist to MongoDB
6. Backend -> sends HTML email with playlist link
7. User opens link -> `GET /api/v1/playlists/guest/playlist/:id`

**Data flow for a paid upgrade:**
1. User clicks Upgrade -> `POST /api/v1/playlists/upgrade`
2. Backend -> creates Stripe Checkout session
3. User pays on Stripe
4. Stripe -> `POST /api/v1/stripe/payment/webhook` (raw body)
5. Backend -> calls AI service for 50-song playlist
6. Backend -> saves premium Playlist to MongoDB

---

## Tech Stack

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Express | 5.x |
| Database | MongoDB + Mongoose | 7 + 9.x |
| Auth | JWT + bcryptjs | 9.x + 3.x |
| Payments | Stripe | 20.x |
| Email | Nodemailer | 7.x |
| File Upload | Multer | 2.x |
| HTTP Client | Axios | 1.x |

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.x |
| Build Tool | Vite | 7.x |
| Styling | Tailwind CSS | 4.x |
| Router | React Router | 7.x |
| HTTP Client | Axios | 1.x |

### AI Service

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Python | 3.12 |
| Framework | FastAPI | Latest |
| Server | Uvicorn | Latest |
| AI | OpenAI SDK | Latest |
| Music | Spotify Web API (requests) | - |

---

## Folder Structure

```
project_22_ai_custom_playlist/
+-- backend/                    # Node.js Express API
|   +-- src/
|   |   +-- app.js              # Express setup, CORS, static files, routes
|   |   +-- server.js           # Server bootstrap (DB connect -> listen)
|   |   +-- config/
|   |   |   +-- constant.js     # Environment variable constants
|   |   |   `-- dbConnect.js    # MongoDB connection (exits on failure)
|   |   +-- controllers/        # Request handlers (thin layer)
|   |   +-- middlewares/        # auth.js, adminAuth.js, upload.js
|   |   +-- models/             # Mongoose schemas: User, Quiz, Playlist
|   |   +-- routes/             # Express routers per resource
|   |   +-- services/           # Business logic layer
|   |   `-- utils/              # email.js, response.js
|   +-- Dockerfile              # Multi-stage: development + production
|   +-- docker-entrypoint.sh    # Waits for MongoDB before starting (dev)
|   +-- .env.example            # All backend env vars documented
|   `-- package.json
|
+-- ai/                         # FastAPI AI microservice
|   +-- app.py                  # FastAPI app + vibe calculation engine
|   +-- openai_service.py       # OpenAI gpt-4o-mini playlist generation
|   +-- spotify_service.py      # Spotify Auth + playlist creation
|   +-- requirements.txt
|   +-- Dockerfile              # Python 3.12-slim, non-root
|   `-- .env.example
|
+-- frontend/                   # React 19 + Vite SPA
|   +-- src/
|   |   +-- main.jsx            # App entry: providers + RouterProvider
|   |   +-- routes/router.jsx   # All routes (public / auth / admin)
|   |   +-- api/                # Axios instance + per-resource API calls
|   |   +-- context/            # AuthContext, QuizContext, AudioPlayer, Cookie
|   |   +-- layouts/            # PublicLayout, AuthLayout, QuizLayout, PlaylistLayout
|   |   +-- pages/              # Auth, Home, Quiz, Playlist, Payment, Policies
|   |   +-- components/         # Shared UI components
|   |   `-- admin/              # Admin dashboard pages and components
|   +-- Dockerfile              # Vite build -> nginx:alpine SPA serving
|   +-- nginx.conf              # SPA try_files config for React Router
|   +-- .env.example
|   `-- package.json
|
+-- nginx/
|   `-- nginx.conf              # Production reverse proxy
|
+-- docker-compose.yml          # Development (hot-reload, local MongoDB)
+-- docker-compose.prod.yml     # Production (built images, nginx, named volumes)
+-- .dockerignore
+-- .env.example                # Combined reference for all services
+-- README.md
`-- DEPLOYMENT.md               # Full VPS deployment guide
```

---

## Prerequisites

### For Docker (recommended)

- Docker Desktop >= 24 or Docker Engine + Compose plugin
- Git

### For local (no Docker)

- Node.js 20 LTS
- Python 3.12+
- MongoDB Community Server or Atlas connection string
- npm >= 10

---

## Quick Start (Docker)

### Development

```bash
# 1. Clone
git clone https://github.com/YOUR_ORG/rory-ai-custom-playlist.git
cd rory-ai-custom-playlist

# 2. Copy and fill env files
cp backend/.env.example  backend/.env
cp ai/.env.example       ai/.env
cp frontend/.env.example frontend/.env

# 3. Make entrypoint executable (Linux/Mac)
chmod +x backend/docker-entrypoint.sh

# 4. Build and start all services
docker compose up --build

# Services available at:
#   Frontend -> http://localhost:5173
#   Backend  -> http://localhost:3000
#   AI       -> http://localhost:8000
#   MongoDB  -> localhost:27017
```

### Production

```bash
cp backend/.env.example  backend/.env   # Use Atlas URI, live Stripe keys, real domain
cp ai/.env.example       ai/.env
cp frontend/.env.example frontend/.env  # VITE_BACKEND_URL= (empty for nginx proxy)

docker compose -f docker-compose.prod.yml up -d --build

curl http://localhost/health
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full SSL, domain, and VPS setup.

---

## Quick Start (Local / No Docker)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
# Starts on http://localhost:3000
```

### AI Service

```bash
cd ai
cp .env.example .env
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
# Available at http://localhost:8000
# Swagger UI at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_BACKEND_URL=http://localhost:3000
npm install
npm run dev
# Starts on http://localhost:5173
```

---

## Environment Setup

| File | Purpose |
|------|---------|
| `backend/.env.example` | Server port, MongoDB, JWT, Stripe, email, AI endpoint |
| `ai/.env.example` | OpenAI API key, Spotify Client ID/Secret/Refresh Token |
| `frontend/.env.example` | Backend API base URL (build-time only) |

**Required variables (application will fail without these):**

| Variable | Service |
|----------|---------|
| `MONGO_URI` | backend |
| `JWT_SECRET` | backend |
| `STRIPE_SECRET_KEY` | backend |
| `STRIPE_WEBHOOK_SECRET` | backend |
| `FRONTEND_URL` | backend |
| `AI_ENDPOINT` | backend |
| `EMAIL_USER` | backend |
| `EMAIL_PASS` | backend |
| `OPENAI_API_KEY` | ai |
| `SPOTIFY_CLIENT_ID` | ai |
| `SPOTIFY_CLIENT_SECRET` | ai |
| `SPOTIFY_REFRESH_TOKEN` | ai |

---

## Development Workflow

```bash
# Start all services with hot-reload
docker compose up --build

# Start a specific service
docker compose up backend --build

# View logs
docker compose logs -f backend
docker compose logs -f ai

# Stop all
docker compose down

# Stop and wipe local MongoDB data
docker compose down -v

# Rebuild a single service
docker compose up --build backend
```

---

## Production Deployment

Full guide: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

```bash
docker compose -f docker-compose.prod.yml up -d --build

# Update after code change
docker compose -f docker-compose.prod.yml up -d --build --no-deps backend
docker compose -f docker-compose.prod.yml restart nginx
```

---

## API Overview

Base URL: `/api/v1`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Backend health check |
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Login (user or admin) |
| POST | `/auth/forgot-password` | None | Send OTP to email |
| POST | `/auth/verify-otp` | None | Verify OTP |
| POST | `/auth/reset-password` | None | Reset password after OTP |
| PATCH | `/auth/change-password` | User JWT | Change own password |
| PATCH | `/auth/update-profile` | User JWT | Update name/photo |
| POST | `/quiz/guest/submit` | None | Submit guest quiz |
| POST | `/quiz/user/submit` | User JWT | Submit user quiz |
| GET | `/playlists/guest/playlist/:id` | None | Get playlist by quiz ID |
| GET | `/playlists/user/playlist` | User JWT | Get all user playlists |
| POST | `/playlists/upgrade` | User JWT | Upgrade free to paid |
| POST | `/stripe/payment/webhook` | Stripe Sig | Stripe webhook |
| GET | `/admin/dashboard` | Admin JWT | Platform stats |
| GET | `/admin/users` | Admin JWT | List all users |
| DELETE | `/admin/users/:id` | Admin JWT | Delete user |
| GET | `/admin/playlists` | Admin JWT | List all playlists |
| DELETE | `/admin/playlists/:id` | Admin JWT | Delete playlist |
| PATCH | `/admin/profile` | Admin JWT | Update admin profile |
| PATCH | `/admin/change-password` | Admin JWT | Change admin password |

---

## Authentication

- JWT-based, stateless
- Tokens issued on login for both users and admins
- Role determined from the database: `user` | `admin` | `guest`
- Tokens stored in `localStorage` by the frontend
- Cookie set as `httpOnly` (secure in production)
- Token expiry: `JWT_EXPIRES_IN` env var (default `30d`)

---

## Payment Flow

1. User submits quiz with `user_type: "paid"`
2. Backend creates Stripe Checkout Session (EUR 9)
3. Frontend redirects to Stripe hosted checkout
4. User pays -> Stripe fires `checkout.session.completed`
5. Webhook handler calls AI service for 50-song playlist
6. Playlist saved as `playlist_type: "premium"` in MongoDB
7. User redirected to `/success?session_id=...`

**Webhook URL:** `POST /api/v1/stripe/payment/webhook`

---

## AI Service

**Endpoint:** `POST /generate-playlist`

Processing steps:
1. Calculates vibe fingerprint (E/M/G/L/N scores + archetype)
2. Calls OpenAI `gpt-4o-mini` -> gets structured track list
3. Searches each track on Spotify API
4. Filters banned artists (whole-word matching)
5. Creates Spotify playlist with verified tracks

| `user_type` | AI generates | Final playlist |
|-------------|-------------|----------------|
| `free` | 25 candidates | 15 tracks |
| `paid` | 65 candidates | 50 tracks |

---

## File Uploads

- Multer disk storage: `uploads/admin/` and `uploads/user/`
- Max size: 2 MB, images only
- Served by Express static at `/uploads/<admin|user>/<filename>`
- In production Docker: stored in `smn_uploads_prod` named volume

---

## Email System

- Provider: Hostinger SMTP (`smtp.hostinger.com:587`)
- Library: Nodemailer
- From: `info@soundtrackmynight.com` (hardcoded in `email.js`)
- Templates: inline branded HTML

Emails sent:
1. OTP email (password reset, 10-minute expiry)
2. Playlist ready email (to guest after quiz, includes playlist link + upgrade CTA)

---

## Docker Reference

### Commands

| Command | Description |
|---------|-------------|
| `docker compose up --build` | Start dev environment |
| `docker compose down` | Stop dev environment |
| `docker compose down -v` | Stop + wipe volumes |
| `docker compose logs -f [service]` | Follow logs |
| `docker compose -f docker-compose.prod.yml up -d --build` | Start production |
| `docker compose -f docker-compose.prod.yml ps` | Production status |
| `docker stats` | Live resource usage |

### Ports

| Service | Dev (host) | Prod (host) |
|---------|-----------|-------------|
| nginx | none | 80, 443 |
| backend | 3000 | internal |
| ai | 8000 | internal |
| frontend | 5173 | internal |
| mongodb | 27017 | N/A (Atlas) |

---

## Scripts Reference

### Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | nodemon hot-reload |
| `npm start` | `node src/server.js` |

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production bundle |
| `npm run lint` | ESLint |

### AI Service

| Command | Description |
|---------|-------------|
| `uvicorn app:app --reload --port 8000` | Development |
| `uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1` | Production |

---

## Troubleshooting

**"MONGO_URI is not set"** - Fill `MONGO_URI` in `backend/.env`. App exits on startup if missing.

**All API requests are 404** - Check `VITE_BACKEND_URL` in `frontend/.env`. Must be `http://localhost:3000` for local dev, empty for production nginx.

**AI service crashes** - Check `OPENAI_API_KEY` is valid and has billing enabled.

**Spotify playlist creation fails** - The `SPOTIFY_REFRESH_TOKEN` must be a user-level OAuth token (not client credentials) with scopes `playlist-modify-public playlist-modify-private`.

**Stripe webhook returns 400** - Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard. Nginx must pass raw body (`proxy_request_buffering off` is already set).

**Profile images lost after restart** - In production, uploads live in `smn_uploads_prod` Docker volume. Never run `docker compose down -v` on production.

---

## Known Issues

These exist in application code and are not fixed in this release.

| Severity | Issue |
|----------|-------|
| Critical | `GET /api/v1/auth/me` is missing - called by `AuthContext.jsx` on every page load |
| High | Stripe webhook processes AI+Spotify synchronously (30s timeout risk -> duplicate playlists) |
| High | `console.log("Upgrade Payload:", ...)` exposed in production browser console |
| High | No Express-level rate limiting (nginx provides basic protection) |
| Medium | SMTP host hardcoded in `email.js` - not configurable via env |
| Medium | `upgradePlaylist` deletion logic commented out - old records accumulate |
| Low | `App.jsx` is empty (0 bytes) |

---

## Security Notes

- JWT secrets must be at least 64 random characters
- Stripe webhook signature verified on every request
- bcryptjs cost factor 12 for password hashing
- `httpOnly` cookie set in addition to JWT in response body
- Admin routes verified at both JWT level (role claim) and DB level
- File uploads: MIME type filter + 2MB size limit
- CORS: explicit origin whitelist (not wildcard)
- Nginx: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` headers set
- Non-root user inside all Docker containers

---

## Performance Notes

- MongoDB `.lean()` used where full Mongoose docs are not needed (admin service)
- `Promise.all` for parallel queries in admin dashboard
- AI service uses `run_in_threadpool` for synchronous OpenAI/Spotify calls
- Vite build output is fingerprinted for long-term browser caching
- nginx gzip compression enabled for text assets
- Docker layer caching: manifests copied before source code

---

*Soundtrack My Night - Rory Clerkin - soundtrackmynight.com*
