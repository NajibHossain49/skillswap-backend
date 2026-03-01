# SkillSwap Backend

A modular, production-ready backend system for a peer-to-peer skill exchange platform. Built with **Node.js**, **Express**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**.

---

🔗 **Frontend Repository:**
SkillSwap Frontend (Next.js + TypeScript + Tailwind CSS + eg,..)
👉 [https://github.com/NajibHossain49/skillswap-frontend.git](https://github.com/NajibHossain49/skillswap-frontend.git)

⚠️ The backend must be running on `http://localhost:3001` for the frontend to function correctly.


## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Docker](#docker)
- [Architecture](#architecture)

---

## Features

- **JWT Authentication** with access + refresh token rotation
- **Role-Based Access Control (RBAC)** — ADMIN, MENTOR, LEARNER
- **Modular Architecture** — each module is self-contained
- **Zod** runtime validation on all inputs
- **Prisma ORM** with full type safety
- **Structured logging** with Pino
- **Centralized error handling**
- **Helmet + CORS** security middleware
- **Full test suite** with Vitest
- **Docker** support

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | v22+ | Runtime |
| Express | v4.21 | HTTP framework |
| TypeScript | v5.6 | Type safety |
| Prisma | v5.22 | ORM & migrations |
| PostgreSQL | v17 | Database |
| Zod | v3.23 | Runtime validation |
| JWT | v9.0 | Authentication |
| bcrypt | v5.1 | Password hashing |
| Pino | v9.5 | Structured logging |
| Helmet | v8.0 | Security headers |
| Vitest | v2.1 | Testing |

---

## Project Structure

```
skillswap/
├── prisma/
│   └── schema.prisma            # Database schema
├── src/
│   ├── config/
│   │   └── index.ts             # Env config with Zod validation
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication + RBAC
│   │   ├── errorHandler.ts      # Global error handler
│   │   ├── requestLogger.ts     # Structured request logging
│   │   └── validate.ts          # Zod request validation
│   ├── modules/
│   │   ├── auth/                # Registration, login, token management
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── auth.service.ts
│   │   ├── users/               # User profile management
│   │   │   ├── user.controller.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.schema.ts
│   │   │   └── user.service.ts
│   │   ├── skills/              # Skill CRUD
│   │   │   ├── skill.controller.ts
│   │   │   ├── skill.routes.ts
│   │   │   ├── skill.schema.ts
│   │   │   └── skill.service.ts
│   │   ├── sessions/            # Session booking + feedback
│   │   │   ├── session.controller.ts
│   │   │   ├── session.routes.ts
│   │   │   ├── session.schema.ts
│   │   │   └── session.service.ts
│   │   └── admin/               # Admin dashboard + stats
│   │       ├── admin.controller.ts
│   │       ├── admin.routes.ts
│   │       └── admin.service.ts
│   ├── prisma/
│   │   ├── client.ts            # Prisma singleton
│   │   └── seed.ts              # Database seeder
│   ├── tests/                   # Unit tests
│   │   ├── setup.ts
│   │   ├── jwt.test.ts
│   │   ├── auth.service.test.ts
│   │   ├── skill.service.test.ts
│   │   └── response.test.ts
│   ├── utils/
│   │   ├── errors.ts            # Custom error classes
│   │   ├── jwt.ts               # JWT helpers
│   │   ├── logger.ts            # Pino logger
│   │   └── response.ts          # Standardized API responses
│   ├── app.ts                   # Express app setup
│   └── server.ts                # Entry point
├── .env.example
├── .gitignore
├── .prettierrc
├── docker-compose.yml
├── Dockerfile
├── eslint.config.js
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Getting Started

### Prerequisites
- Node.js v22+
- PostgreSQL v14+
- npm v10+

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Generate Prisma client

```bash
npm run db:generate
```

### 5. Seed the database (optional)

```bash
npm run db:seed
```

**Seeded accounts:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@skillswap.com | Adm!n-SkillSwap-2026 |
| Mentor | michael.kovacs@skillswap.com | Mentor2026!! |
| Learner | alex.k@skillswap.com | Learner2026!! |

### 6. Start development server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment |
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | **Yes** | — | Access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | **Yes** | — | Refresh token secret (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiry |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin |

---

## API Reference

All responses follow this format:
```json
{
  "success": true,
  "message": "Description",
  "data": {}
}
```

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/refresh` | Public | Refresh tokens |
| POST | `/api/auth/logout` | Public | Logout (revoke token) |
| POST | `/api/auth/logout-all` | Private | Logout all devices |
| GET | `/api/auth/me` | Private | Get token info |

**Register example:**
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Secret@123",
  "role": "LEARNER"
}
```

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users/profile` | Private | My profile |
| PATCH | `/api/users/profile` | Private | Update my profile |
| GET | `/api/users` | Admin | All users |
| GET | `/api/users/:id` | Admin | User by ID |
| PATCH | `/api/users/:id/role` | Admin | Update user role |
| PATCH | `/api/users/:id/deactivate` | Admin | Deactivate user |
| PATCH | `/api/users/:id/activate` | Admin | Activate user |
| DELETE | `/api/users/:id` | Admin | Delete user |

### Skills

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/skills` | Public | Browse skills (paginated) |
| GET | `/api/skills/categories` | Public | List categories |
| GET | `/api/skills/:id` | Public | Skill details |
| POST | `/api/skills` | Mentor/Admin | Create skill |
| PATCH | `/api/skills/:id` | Mentor (owner)/Admin | Update skill |
| DELETE | `/api/skills/:id` | Mentor (owner)/Admin | Delete skill |

**Create skill example:**
```json
POST /api/skills
Authorization: Bearer <token>
{
  "title": "Python for Beginners",
  "description": "Learn Python from the ground up with practical examples",
  "category": "Programming"
}
```

### Sessions

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/sessions` | Private | Browse sessions |
| POST | `/api/sessions` | Mentor/Admin | Create session |
| GET | `/api/sessions/stats` | Mentor/Admin | Mentor statistics |
| GET | `/api/sessions/:id` | Private | Session details |
| POST | `/api/sessions/:id/book` | Learner | Book a session |
| PATCH | `/api/sessions/:id/status` | Private | Update status |
| POST | `/api/sessions/:id/feedback` | Learner | Submit feedback |
| GET | `/api/sessions/:id/feedback` | Private | Get feedback |

**Create session example:**
```json
POST /api/sessions
Authorization: Bearer <mentor-token>
{
  "skillId": "uuid-of-skill",
  "title": "Introduction to TypeScript",
  "description": "First session on TypeScript basics",
  "scheduledAt": "2025-03-01T14:00:00.000Z",
  "duration": 60
}
```

**Session status transitions:**
```
PENDING → SCHEDULED | CANCELLED
SCHEDULED → COMPLETED | CANCELLED
```

### Admin

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/dashboard` | Admin | Platform statistics |
| GET | `/api/admin/activity?days=30` | Admin | Activity metrics |

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

Tests cover:
- JWT token generation and verification
- Auth service (register, login)
- Skill service (CRUD, ownership checks)
- Response utility helpers

---

## Docker

### Development with Docker Compose

```bash
# Start database + app
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

### Build Docker image

```bash
docker build -t skillswap-backend .
docker run -p 3000:3000 --env-file .env skillswap-backend
```

---

## Architecture

### Authentication Flow

```
Client → POST /api/auth/login
       → Returns: { accessToken, refreshToken }
       
Client → GET /api/... + Authorization: Bearer <accessToken>
       → Middleware verifies token → Attaches user to req
       
Client → POST /api/auth/refresh + { refreshToken }
       → Old token revoked → New pair issued (rotation)
```

### RBAC Permission Matrix

| Endpoint Type | Admin | Mentor | Learner |
|---------------|-------|--------|---------|
| User management | ✅ Full | ❌ | ❌ |
| Create skills | ✅ | ✅ | ❌ |
| Update own skills | ✅ Any | ✅ Own | ❌ |
| Create sessions | ✅ | ✅ | ❌ |
| Book sessions | ❌ | ❌ | ✅ |
| Admin dashboard | ✅ | ❌ | ❌ |

### Data Model

```
User ──< Session (as mentor) >── Skill
     ──< Session (as learner)
     ──< RefreshToken
     ──< Feedback (as learner)

Session ──< Feedback (1:1)
Skill ──< Session
```

---

## Security Practices

- Passwords hashed with bcrypt (12 salt rounds)
- JWT secrets validated to be at least 32 characters
- Refresh token rotation on every use
- Token revocation on logout
- Helmet sets security headers
- CORS configured
- No sensitive data in logs
- Environment validation at startup
