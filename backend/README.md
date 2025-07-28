# Soundtrack My Night — Backend API

REST API for the **Soundtrack My Night** playlist quiz platform.  
Built with **Node.js**, **Express 5**, **MongoDB (Mongoose)**, and **Stripe** for payments.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Response Format](#response-format)
- [Authentication](#authentication)
- [API Reference](#api-reference)
  - [Health](#health)
  - [Auth](#auth)
  - [Quiz](#quiz)
  - [Playlists](#playlists)
  - [Payments (Stripe Webhook)](#payments-stripe-webhook)
  - [Admin](#admin)

---

## Getting Started

```bash
# Install dependencies
npm install

# Development (with hot-reload)
npm run dev

# Production
npm start
```

The server starts on the port defined by `PORT` (default `3000`).

---

## Environment Variables

Create a `.env` file in the project root:

| Variable                | Description                          |
| ----------------------- | ------------------------------------ |
| `PORT`                  | Server port (default `3000`)         |
| `MONGO_URI`             | MongoDB connection string            |
| `JWT_SECRET`            | Secret key for JWT signing           |
| `JWT_EXPIRES_IN`        | JWT expiration (e.g. `30d`)          |
| `FRONTEND_URL`          | Frontend origin URL                  |
| `EMAIL_USER`            | SMTP email address                   |
| `EMAIL_PASS`            | SMTP email password / app password   |
| `STRIPE_SECRET_KEY`     | Stripe secret key                    |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret        |
| `AI_ENDPOINT`           | AI playlist generation service URL   |

---

## Response Format

All endpoints return a consistent JSON envelope:

**Success**

```json
{
  "success": true,
  "message": "...",
  "data": { }
}
```

**Error**

```json
{
  "success": false,
  "message": "..."
}
```

---

## Authentication

Protected routes require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <token>
```

- **User routes** use `authMiddleware` (roles: `user`)
- **Admin routes** use `adminAuthMiddleware` (role: `admin`)

Tokens are issued via the [Login](#2-login) endpoint.

---

## API Reference

Base URL: `/api/v1`

---

### Health

| Method | Endpoint  | Description          |
| ------ | --------- | -------------------- |
| GET    | `/`       | Welcome message      |
| GET    | `/health` | API health check     |

---

### Auth

Base path: `/api/v1/auth`

#### 1. Register

```
POST /api/v1/auth/register
```

| Field      | Type   | Required | Description        |
| ---------- | ------ | -------- | ------------------ |
| `name`     | string | Yes      | User's full name   |
| `email`    | string | Yes      | User's email       |
| `password` | string | Yes      | User's password    |

**Request Body**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response** `201 Created`

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

#### 2. Login

Unified login for both **user** and **admin** accounts. The role is determined from the database.

```
POST /api/v1/auth/login
```

| Field      | Type   | Required | Description     |
| ---------- | ------ | -------- | --------------- |
| `email`    | string | Yes      | Account email   |
| `password` | string | Yes      | Account password|

**Request Body**

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isPremium": false,
      "createdAt": "2026-01-15T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJI..."
  }
}
```

> For admin accounts, the message will be `"Admin logged in successfully"` and `role` will be `"admin"`.

---

#### 3. Forgot Password

Sends a 6-digit OTP to the user's email. Works for both user and admin.

```
POST /api/v1/auth/forgot-password
```

| Field   | Type   | Required | Description          |
| ------- | ------ | -------- | -------------------- |
| `email` | string | Yes      | Registered email     |

**Request Body**

```json
{
  "email": "john@example.com"
}
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

---

#### 4. Verify OTP

Verifies the OTP sent via email.

```
POST /api/v1/auth/verify-otp
```

| Field   | Type   | Required | Description              |
| ------- | ------ | -------- | ------------------------ |
| `email` | string | Yes      | Registered email         |
| `otp`   | string | Yes      | 6-digit OTP from email   |

**Request Body**

```json
{
  "email": "john@example.com",
  "otp": "482916"
}
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

---

#### 5. Reset Password

Resets the password after OTP verification.

```
POST /api/v1/auth/reset-password
```

| Field         | Type   | Required | Description     |
| ------------- | ------ | -------- | --------------- |
| `email`       | string | Yes      | Registered email|
| `newPassword` | string | Yes      | New password    |

**Request Body**

```json
{
  "email": "john@example.com",
  "newPassword": "newSecurePassword456"
}
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### Quiz

Base path: `/api/v1/quiz`

#### 1. Submit Guest Quiz

Processes a quiz for a guest (no auth required). Generates a free playlist and sends it via email.

```
POST /api/v1/quiz/guest/submit
```

| Field     | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| `email`   | string | Yes      | Guest email to send playlist |
| `answers` | object | Yes      | Quiz answers object          |

**Request Body**

```json
{
  "email": "guest@example.com",
  "answers": {
    "mood": "chill",
    "genre": "jazz",
    "occasion": "dinner"
  }
}
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Playlist sent to email!"
}
```

---

#### 2. Submit User Quiz

Processes a quiz for an authenticated user. For `"free"` type, generates immediately. For `"paid"` type, creates a Stripe checkout session.

```
POST /api/v1/quiz/user/submit
```

**Auth:** Bearer Token (User)

| Field       | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| `answers`   | object | Yes      | Quiz answers object                |
| `user_type` | string | Yes      | `"free"` or `"paid"`              |

**Request Body**

```json
{
  "answers": {
    "mood": "energetic",
    "genre": "pop",
    "occasion": "wedding"
  },
  "user_type": "free"
}
```

**Response (free)** `200 OK`

```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "type": "default",
    "playlist": { },
    "quizId": "..."
  }
}
```

**Response (paid)** `200 OK`

```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "type": "premium_payment",
    "checkoutUrl": "https://checkout.stripe.com/...",
    "quizId": "..."
  }
}
```

---

### Playlists

Base path: `/api/v1/playlists`

#### 1. Get Guest Playlist

Fetches a playlist by quiz ID (no auth required).

```
GET /api/v1/playlists/guest/playlist/:id
```

| Param | Type   | Required | Description |
| ----- | ------ | -------- | ----------- |
| `id`  | string | Yes      | Quiz ID     |

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Guest playlist fetched successfully",
  "data": {
    "_id": "...",
    "quizId": "...",
    "title": "Groovy Sunset Vibes",
    "description": "...",
    "tracks": [],
    "spotify_url": "https://open.spotify.com/...",
    "song_count": 15,
    "playlist_type": "default"
  }
}
```

---

#### 2. Get User Playlists

Fetches all playlists for the authenticated user.

```
GET /api/v1/playlists/user/playlist
```

**Auth:** Bearer Token (User)

**Response** `200 OK`

```json
{
  "success": true,
  "message": "User playlist fetched successfully",
  "data": [
    {
      "_id": "...",
      "title": "Groovy Sunset Vibes",
      "playlist_type": "default",
      "song_count": 15
    }
  ]
}
```

---

#### 3. Upgrade Playlist

Upgrades a free playlist to premium. Deletes the old quiz/playlist and initiates a paid quiz flow (returns Stripe checkout URL).

```
POST /api/v1/playlists/upgrade
```

**Auth:** Bearer Token (User)

| Field        | Type   | Required | Description              |
| ------------ | ------ | -------- | ------------------------ |
| `quizId`     | string | Yes      | Original quiz ID         |
| `playlistId` | string | Yes      | Original playlist ID     |

**Request Body**

```json
{
  "quizId": "64abc...",
  "playlistId": "64def..."
}
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "type": "premium_payment",
    "checkoutUrl": "https://checkout.stripe.com/...",
    "quizId": "..."
  }
}
```

---

### Payments (Stripe Webhook)

```
POST /api/v1/stripe/payment/webhook
```

> This endpoint is called by **Stripe** and uses the raw request body for signature verification. Do not call this manually.

| Header             | Description                      |
| ------------------ | -------------------------------- |
| `stripe-signature` | Stripe webhook signature header  |

Handles `checkout.session.completed` events to generate premium playlists after successful payment.

---

### Admin

Base path: `/api/v1/admin`

All admin routes require **Admin Bearer Token** (`Authorization: Bearer <admin_token>`).

---

#### 1. Get Dashboard

Returns platform overview stats and the 5 most recent playlist activities.

```
GET /api/v1/admin/dashboard
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Dashboard fetched successfully",
  "data": {
    "totals": {
      "totalUsers": 2847,
      "totalPlaylists": 1392,
      "totalQuizzes": 1500,
      "paidUsers": 643,
      "freeUsers": 2204
    },
    "recentActivity": [
      {
        "user": "rakibul@example.com",
        "playlistTitle": "Groovy Sunset Vibes",
        "type": "Free",
        "date": "2026-02-03T14:28:47.857Z",
        "playlistId": "..."
      }
    ]
  }
}
```

---

#### 2. Get Users

Returns all non-admin users with quiz completion date, playlist count, and paid/free status.

```
GET /api/v1/admin/users
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": [
    {
      "_id": "...",
      "email": "sarah@example.com",
      "name": "Sarah Johnson",
      "createdAt": "2026-01-24T10:00:00.000Z",
      "quizCompletedAt": "2026-01-24T12:00:00.000Z",
      "playlistCount": 3,
      "status": "Paid"
    }
  ]
}
```

---

#### 3. Delete User

Deletes a user by ID.

```
DELETE /api/v1/admin/users/:id
```

| Param | Type   | Required | Description |
| ----- | ------ | -------- | ----------- |
| `id`  | string | Yes      | User ID     |

**Response** `200 OK`

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

#### 4. Get Playlists

Returns all playlists with user email, type, and date.

```
GET /api/v1/admin/playlists
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Playlists fetched successfully",
  "data": [
    {
      "user": "rakibul@example.com",
      "playlistTitle": "Groovy Sunset Vibes",
      "type": "Free",
      "date": "2026-02-03T14:28:47.857Z",
      "playlistId": "..."
    }
  ]
}
```

---

#### 5. Delete Playlist

Deletes a playlist by ID.

```
DELETE /api/v1/admin/playlists/:id
```

| Param | Type   | Required | Description |
| ----- | ------ | -------- | ----------- |
| `id`  | string | Yes      | Playlist ID |

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Playlist deleted successfully"
}
```

---

#### 6. Update Admin Profile

Updates the admin's name and/or profile image. Accepts `multipart/form-data`.

```
PATCH /api/v1/admin/profile
```

**Content-Type:** `multipart/form-data`

| Field          | Type   | Required | Description                          |
| -------------- | ------ | -------- | ------------------------------------ |
| `name`         | string | No       | New display name                     |
| `profileImage` | file   | No       | Profile image (JPEG, PNG, max 2 MB)  |

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "...",
    "name": "Admin",
    "email": "admin@gmail.com",
    "profileImage": "/uploads/admin/1707564000000-photo.jpg",
    "role": "admin"
  }
}
```

> The uploaded image is served statically at `GET /uploads/admin/<filename>`.

---

#### 7. Change Admin Password

Changes the admin's password after verifying the current one.

```
PATCH /api/v1/admin/change-password
```

| Field             | Type   | Required | Description      |
| ----------------- | ------ | -------- | ---------------- |
| `currentPassword` | string | Yes      | Current password |
| `newPassword`     | string | Yes      | New password     |

**Request Body**

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Project Structure

```
src/
├── app.js                   # Express app setup, CORS, static files
├── server.js                # Server bootstrap
├── config/
│   ├── constant.js          # Environment variable constants
│   └── dbConnect.js         # MongoDB connection
├── controllers/
│   ├── adminDashobard.controller.js
│   ├── payment.controller.js
│   ├── playlist.controller.js
│   ├── quiz.controller.js
│   └── user.controller.js
├── middlewares/
│   ├── adminAuth.js         # Admin JWT auth middleware
│   ├── auth.js              # User JWT auth middleware
│   └── upload.js            # Multer file upload config
├── models/
│   ├── Playlist.js
│   ├── Quiz.js
│   └── User.js
├── routes/
│   ├── admin.routes.js
│   ├── auth.routes.js
│   ├── index.js
│   ├── payment.routes.js
│   ├── playlist.routes.js
│   └── quiz.routes.js
├── services/
│   ├── adminDashboard.service.js
│   ├── playlist.service.js
│   ├── quiz.service.js
│   └── user.service.js
└── utils/
    ├── email.js             # Nodemailer email sender
    └── response.js          # Unified response helpers
```

---

## Tech Stack

| Layer       | Technology            |
| ----------- | --------------------- |
| Runtime     | Node.js               |
| Framework   | Express 5             |
| Database    | MongoDB + Mongoose    |
| Auth        | JWT + bcryptjs        |
| Payments    | Stripe                |
| Email       | Nodemailer            |
| File Upload | Multer                |
| AI          | External AI endpoint  |
