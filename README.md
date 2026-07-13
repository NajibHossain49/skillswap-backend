# SkillSwap Backend

Backend API for **SkillSwap** — a one-way skill-booking platform (despite the name, there is no bartering). Learners spend **credits** to book sessions with approved **mentors**. It ships with a credit economy, mentor approval + moderation, JWT auth with refresh-token rotation & reuse detection, scheduled maintenance jobs, and generated OpenAPI docs.

- **Runtime:** Node.js + Express (TypeScript)
- **Database:** PostgreSQL via Prisma (`@prisma/adapter-pg`)
- **Auth:** JWT access/refresh tokens (rotating families, reuse detection), bcrypt
- **Validation:** Zod (also the source of the OpenAPI spec)
- **Tests:** Vitest (unit, mocked Prisma) + Supertest (integration, real DB)

---

## Table of contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Deploy to Vercel](#deploy-to-vercel)
- [API reference](#api-reference)
- [Scheduled jobs](#scheduled-jobs)
- [API docs (Swagger)](#api-docs-swagger)
- [Caching](#caching)
- [Database schema](#database-schema)
- [Testing](#testing)
- [Project layout](#project-layout)

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # then edit values (at minimum DATABASE_URL + JWT secrets)

# 3. Apply migrations and generate the Prisma client
npm run db:migrate      # dev: create/apply migrations
npm run db:generate

# 4. (optional) Seed demo data
npm run db:seed

# 5. Run the dev server (hot reload)
npm run dev
```

The server starts on `http://localhost:$PORT` (default `3000`). Health check: `GET /health`. Interactive docs: `GET /api/docs`.

---

## Environment variables

Parsed and validated at boot in `src/config/index.ts` — an invalid or missing required variable aborts startup.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test`. |
| `PORT` | no | `3000` | HTTP port. |
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string. On serverless use the Neon **pooled** endpoint (host contains `-pooler`) with `?sslmode=require&connection_limit=1`. |
| `DIRECT_URL` | no* | — | Non-pooled Postgres endpoint used only by `prisma migrate deploy`. On Neon this is the host **without** `-pooler`. Required to run migrations on Vercel. |
| `JWT_ACCESS_SECRET` | **yes** | — | Access-token secret (min 32 chars). |
| `JWT_REFRESH_SECRET` | **yes** | — | Refresh-token secret (min 32 chars). |
| `JWT_ACCESS_EXPIRES_IN` | no | `15m` | Access-token lifetime. |
| `JWT_REFRESH_EXPIRES_IN` | no | `7d` | Refresh-token lifetime. |
| `CORS_ORIGIN` | no* | `*` | Comma-separated allowlist (localhost auto-allowed in dev). **Required** in production — must not be unset, `*`, or contain `localhost`. |
| `UPSTASH_REDIS_REST_URL` | no* | — | Upstash Redis REST URL backing the distributed rate limiter. **Required** in production (serverless has no shared in-memory store). |
| `UPSTASH_REDIS_REST_TOKEN` | no* | — | Upstash Redis REST token. **Required** in production. |
| `RESEND_API_KEY` | no | — | Resend key; when unset, emails are logged instead of sent. |
| `EMAIL_FROM` | no | — | From address for outbound email. |
| `APP_URL` | no* | `http://localhost:3001` | Frontend base URL used in email/notification links. **Required** in production — must not be unset or contain `localhost`. |
| `BCRYPT_ROUNDS` | no | `12` | bcrypt cost factor. |
| `CRON_SECRET` | no* | — | Shared secret for `POST /api/internal/cron/:job`. **Required** in production. |
| `ENABLE_CRON` | no | `true` off prod | `true`/`false`. Run in-process node-cron. Automatically disabled on Vercel (`process.env.VERCEL`) and in tests. |
| `ENABLE_DOCS` | no | `true` off prod | `true`/`false`. Serve Swagger UI + spec. |
| `DOCS_USER` / `DOCS_PASSWORD` | no | — | If both set, protects `/api/docs` with HTTP Basic Auth. |

\* Optional in development, but **required in production** — `src/config/index.ts` runs a
startup assertion (only when `NODE_ENV=production`) that refuses to boot if `CORS_ORIGIN`
is unset/`*`/localhost, `APP_URL` is unset or contains localhost, `CRON_SECRET` is missing,
the Upstash rate-limit vars are missing, or `DATABASE_URL` is not the pooled (`-pooler`)
endpoint.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server with hot reload (`tsx watch`). |
| `npm run build` | `prisma generate && tsc` → compile to `dist/`. |
| `npm run vercel-build` | Vercel build hook: `prisma generate && prisma migrate deploy && tsc`. Applies pending migrations (never `migrate dev`, which can prompt/reset). |
| `npm start` | Run the compiled server. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` / `lint:fix` | ESLint. |
| `npm run format` | Prettier. |
| `npm test` | Unit tests (watch, mocked Prisma). |
| `npm run test:run` | Unit tests once (CI). |
| `npm run test:coverage` | Unit tests with coverage. |
| `npm run test:integration` | Integration tests against a **real DB** (Supertest). |
| `npm run db:migrate` | Create & apply a dev migration. |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:push` | Push schema without a migration. |
| `npm run db:studio` | Prisma Studio. |
| `npm run db:seed` | Seed demo data. |

---

## Deploy to Vercel

The app runs on Vercel as a serverless function. `api/index.ts` (project root) exports the
Express app directly as the handler, and `vercel.json` rewrites **every** path (`/health`,
`/api/*`) to `/api` so the Express router sees them. `src/server.ts` is untouched and still
powers `npm run dev` and the Docker image (`app.listen`).

### 1. Import the project

Point Vercel at this repository. The build hook is `vercel-build`
(`prisma generate && prisma migrate deploy && tsc`), so pending migrations are applied on
every deploy using the **direct** database connection. Node 20+ is enforced via
`engines.node`.

### 2. Get the Neon connection strings

In the Neon console → **Connection Details**, copy two URLs:

- **Pooled** (`DATABASE_URL`) — the host **contains `-pooler`**. Append
  `?sslmode=require&connection_limit=1`. Used at runtime; `connection_limit=1` + the pooled
  host keep many concurrent lambdas from exhausting the database. Example:
  `postgresql://user:pass@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=1`
- **Direct** (`DIRECT_URL`) — the same host **without `-pooler`**. Used only by
  `prisma migrate deploy` (migrations can't run through the pooler). Example:
  `postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 3. Set environment variables (Vercel → Settings → Environment Variables)

Set these for the **Production** environment (and Preview if you deploy previews):

| Variable | Scope | Notes |
| --- | --- | --- |
| `NODE_ENV` | Production | `production`. Enables the startup safety assertion. |
| `DATABASE_URL` | Production | Neon **pooled** URL (`-pooler`) + `?sslmode=require&connection_limit=1`. |
| `DIRECT_URL` | Production | Neon **direct** URL (no `-pooler`). Needed for `migrate deploy`. |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Production | ≥ 32 chars each. |
| `CORS_ORIGIN` | Production | Explicit frontend origin(s), comma-separated. Never `*` or localhost. |
| `CRON_SECRET` | Production | Strong random secret guarding the cron endpoints. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Production | Required — without them rate limiting silently no-ops on serverless. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Production | Optional; emails are logged when unset. |
| `APP_URL` | Production | Frontend base URL used in email/notification links. |
| `ENABLE_DOCS` (+ `DOCS_USER` / `DOCS_PASSWORD`) | Production | Optional; serve Swagger UI in prod. |

`VERCEL` is injected automatically by the platform — the code uses it to keep node-cron
disabled on serverless, so you do **not** need to set `ENABLE_CRON`.

If any production-critical variable is missing or unsafe, the app **refuses to boot** with a
clear error (see `assertProductionConfig` in `src/config/index.ts`) rather than shipping a
silently insecure deployment.

### 4. Cron jobs on Vercel Hobby

Vercel's **Hobby plan allows at most 2 cron jobs, each running at most once per day.** Only
the two daily jobs live in `vercel.json`:

| Job | Schedule (vercel.json) |
| --- | --- |
| `cleanupExpiredTokens` | `0 3 * * *` (daily 03:00) |
| `autoCompleteSessions` | `0 4 * * *` (daily 04:00) |

The other two jobs need finer granularity than Hobby crons allow, so they are driven by an
**external scheduler** — a GitHub Actions workflow (`.github/workflows/cron.yml`) that runs
every 15 minutes and `curl`s the internal endpoints:

- `sessionReminders` — needs 15-minute granularity.
- `expireStaleBookings` — runs frequently to release held credits.

Add these **GitHub repository secrets** (Settings → Secrets and variables → Actions):

- `DEPLOY_URL` — the deployment base URL, e.g. `https://your-app.vercel.app`.
- `CRON_SECRET` — the **same** value as the Vercel `CRON_SECRET`.

The workflow sends the secret in the `x-cron-secret` header, matching `verifyCronSecret`.

> **Upgrading to Vercel Pro** raises the cron limits (up to 40 jobs, any granularity). Once
> on Pro you can move `sessionReminders` (`*/15 * * * *`) and `expireStaleBookings` back into
> `vercel.json`'s `crons` array and delete `.github/workflows/cron.yml`.

---

## API reference

Base path: `/api`. Standard response envelope: `{ success, message, data?, errors? }`.

**Access legend:** `Public` (no auth) · `Auth` (any logged-in user) · `Learner` / `Mentor` / `Admin` (role-gated) · `Approved Mentor` (mentor whose application is approved, or admin) · `Cron secret` (`x-cron-secret` header).

### Auth — `/api/auth`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/register` | Public | Register (always as `LEARNER`). |
| POST | `/login` | Public | Login; returns token pair. |
| POST | `/refresh` | Public | Rotate refresh token (reuse detection). |
| POST | `/logout` | Public | Revoke a refresh token. |
| POST | `/logout-all` | Auth | Revoke all sessions. |
| GET | `/me` | Auth | Current token identity. |
| POST | `/change-password` | Auth (strict) | Change password; revokes sessions. |
| POST | `/forgot-password` | Public | Request reset link (generic response). |
| POST | `/reset-password` | Public | Reset password with token. |
| POST | `/verify-email` | Public | Verify email with token. |
| POST | `/resend-verification` | Auth | Resend verification email. |
| GET | `/sessions` | Auth | List active device sessions. |
| DELETE | `/sessions/:id` | Auth | Revoke a device session. |

### Users — `/api/users`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/profile` | Auth | Get own profile. |
| PATCH | `/profile` | Auth | Update own profile. |
| GET | `/` | Admin | List users. |
| GET | `/:id` | Admin | Get user by id. |
| PATCH | `/:id/role` | Admin | Change role *(audited)*. |
| PATCH | `/:id/deactivate` | Admin | Deactivate user *(audited)*. |
| PATCH | `/:id/activate` | Admin | Activate user *(audited)*. |
| DELETE | `/:id` | Admin | Soft-delete user *(audited)*. |

### Skills — `/api/skills`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Public | List/search skills. |
| GET | `/categories` | Public | Distinct categories *(cached 60s)*. |
| GET | `/:id` | Public | Get skill. |
| POST | `/` | Approved Mentor | Create skill. |
| PATCH | `/:id` | Owner Mentor / Admin | Update skill. |
| DELETE | `/:id` | Owner Mentor / Admin | Soft-delete skill. |

### Sessions — `/api/sessions`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Auth | List sessions (role-scoped). |
| GET | `/stats` | Mentor / Admin | Mentor session stats. |
| POST | `/` | Approved Mentor | Create an open session. |
| GET | `/:id` | Participant / Admin | Get session. |
| POST | `/:id/book` | Learner | Book an open session (atomic, credit-checked). |
| PATCH | `/:id/status` | Participant / Admin | Transition status (settles credits). |
| POST | `/:id/feedback` | Learner | Leave feedback. |
| GET | `/:id/feedback` | Participant / Admin | Get feedback. |

### Bookings — `/api/bookings`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | Learner | Create a booking request. |
| GET | `/` | Auth | List requests (role-scoped). |
| GET | `/:id` | Participant / Admin | Get request. |
| PATCH | `/:id/accept` | Mentor | Accept → creates a session. |
| PATCH | `/:id/reject` | Mentor | Reject request. |
| PATCH | `/:id/cancel` | Learner | Cancel request. |

### Availability — `/api/availability`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/me` | Mentor | Own availability rules. |
| POST | `/` | Mentor | Create a slot rule. |
| PATCH | `/:id` | Mentor (owner) | Update a slot rule. |
| DELETE | `/:id` | Mentor (owner) | Delete a slot rule. |
| GET | `/mentor/:mentorId` | Public | A mentor's weekly rules. |
| GET | `/mentor/:mentorId/slots` | Public | Concrete bookable slots for a date. |

### Mentors — `/api/mentors`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Public | Mentor discovery (filter/search/sort). |
| GET | `/:id` | Public | Public mentor profile. |
| GET | `/:id/reviews` | Public | Paginated reviews. |
| POST | `/apply` | Auth | Apply to become a mentor → `PENDING`. |

### Credits — `/api/credits`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/balance` | Auth | Current credit balance. |
| GET | `/transactions` | Auth | Credit ledger (paginated). |

### Notifications — `/api/notifications`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Auth | List notifications. |
| GET | `/unread-count` | Auth | Unread count. |
| PATCH | `/read-all` | Auth | Mark all read. |
| PATCH | `/:id/read` | Auth (owner) | Mark one read. |
| DELETE | `/:id` | Auth (owner) | Delete one. |

### Reports — `/api/reports`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | Auth | File a report (cannot report yourself). |
| GET | `/` | Admin | List reports (`?status`). |
| GET | `/:id` | Admin | Get a report. |
| PATCH | `/:id/resolve` | Admin | Resolve/dismiss *(audited)*. |

### Admin — `/api/admin`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/dashboard` | Admin | Platform stats *(cached 60s)*: users/sessions, open reports, pending mentors, credits in circulation, 7-day signup trend. |
| GET | `/activity` | Admin | Activity over the last N days. |
| GET | `/audit-logs` | Admin | Audit trail (`?actorId&entity`). |
| POST | `/credits/adjust` | Admin | Manual balance adjustment *(audited)*. |
| GET | `/mentor-applications` | Admin | List applications (defaults `PENDING`). |
| PATCH | `/mentor-applications/:userId` | Admin | Approve/reject *(audited)*. |

### Internal (cron) — `/api/internal`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST/GET | `/cron/:job` | Cron secret | Invoke a scheduled job by name. |

---

## Scheduled jobs

Job runners live in `src/jobs/`. They run **two** ways from the same code:

1. **In-process** via `node-cron` (local / single instance) — enabled when `ENABLE_CRON=true`.
2. **HTTP-triggered** via `POST /api/internal/cron/:job` for serverless platforms (e.g. Vercel Cron). The endpoint checks the `x-cron-secret` header (or `Authorization: Bearer <secret>`) against `CRON_SECRET` using `crypto.timingSafeEqual`.

On serverless the in-process scheduler is automatically disabled (`process.env.VERCEL` is set), and the schedule is split across two triggers because of the [Vercel Hobby cron limits](#4-cron-jobs-on-vercel-hobby): the two **daily** jobs (`cleanupExpiredTokens`, `autoCompleteSessions`) run from `vercel.json`, while the two **frequent** jobs (`sessionReminders`, `expireStaleBookings`) are driven by `.github/workflows/cron.yml` every 15 minutes.

| Job | Schedule | What it does |
| --- | --- | --- |
| `cleanupExpiredTokens` | daily `03:00` | Delete expired refresh tokens (and revoked ones >30d old); delete used/expired verification tokens. |
| `sessionReminders` | every 15 min | For `SCHEDULED` sessions starting in ~1 hour, notify both parties. Idempotent via `Session.reminderSentAt`. |
| `autoCompleteSessions` | hourly | `SCHEDULED` sessions whose end passed >24h ago → `COMPLETED`, settling held credits to the mentor. |
| `expireStaleBookings` | hourly | `PENDING` booking requests past their proposed time → `EXPIRED`, refunding any held credits. |

Trigger manually:

```bash
curl -X POST http://localhost:3000/api/internal/cron/sessionReminders \
  -H "x-cron-secret: $CRON_SECRET"
```

---

## API docs (Swagger)

The OpenAPI 3 spec is **generated from the existing Zod schemas** (`src/docs/openapi.ts`) — request bodies mirror real validation, and a `bearerAuth` security scheme is declared.

- **Swagger UI:** `GET /api/docs`
- **Raw spec:** `GET /api/docs.json`

Docs are on by default outside production. In production set `ENABLE_DOCS=true` to serve them, and optionally `DOCS_USER` + `DOCS_PASSWORD` to require HTTP Basic Auth.

---

## Caching

A small TTL cache (`src/utils/cache.ts`) fronts two hot reads (60s TTL):

- `GET /api/skills/categories` — busted on skill create/update/delete.
- `GET /api/admin/dashboard`.

The `Cache` interface is intentionally minimal so it can be swapped for Redis without touching call sites.

---

## Database schema

```mermaid
erDiagram
    User ||--o{ Skill : "creates"
    User ||--o{ Session : "mentors"
    User ||--o{ Session : "learns"
    User ||--o{ RefreshToken : "has"
    User ||--o{ VerificationToken : "has"
    User ||--o{ Notification : "receives"
    User ||--o{ Availability : "defines"
    User ||--o{ CreditTransaction : "ledger"
    User ||--o{ Feedback : "writes"
    User ||--o{ BookingRequest : "sends"
    User ||--o{ BookingRequest : "receives"

    Skill ||--o{ Session : "for"
    Skill ||--o{ BookingRequest : "for"

    Session ||--o| Feedback : "has"
    Session ||--o| BookingRequest : "created from"

    User {
      string id PK
      string email UK
      string name
      Role role
      MentorStatus mentorStatus
      int creditBalance
      float ratingAvg
      int ratingCount
      datetime deletedAt
    }
    Skill {
      string id PK
      string title
      string category
      int creditCost
      string createdById FK
      datetime deletedAt
    }
    Session {
      string id PK
      string mentorId FK
      string learnerId FK
      string skillId FK
      datetime scheduledAt
      int duration
      SessionStatus status
      datetime reminderSentAt
      datetime deletedAt
    }
    BookingRequest {
      string id PK
      string learnerId FK
      string mentorId FK
      string skillId FK
      datetime proposedAt
      BookingRequestStatus status
      string sessionId FK
    }
    CreditTransaction {
      string id PK
      string userId FK
      int amount
      int balanceAfter
      CreditTxnType type
      string sessionId
    }
    Feedback {
      string id PK
      string sessionId FK
      string learnerId FK
      int rating
    }
    Report {
      string id PK
      string reporterId
      ReportReason reason
      ReportStatus status
    }
    AuditLog {
      string id PK
      string actorId
      string action
      string entity
      string entityId
    }
```

Key enums: `Role` (`ADMIN`/`MENTOR`/`LEARNER`), `MentorStatus` (`NONE`/`PENDING`/`APPROVED`/`REJECTED`), `SessionStatus`, `BookingRequestStatus`, `CreditTxnType`, `ReportReason`, `ReportStatus`. Users, skills and sessions are **soft-deleted** (`deletedAt`) so history is preserved and FK constraints are never violated.

---

## Testing

**Unit tests** (mocked Prisma, no DB) — the default suite, safe in CI:

```bash
npm run test:run
```

**Integration tests** (Supertest against a **real** PostgreSQL) — gated behind `RUN_INTEGRATION`, run sequentially, and clean up everything they create:

```bash
npm run test:integration
```

Integration coverage focuses on critical paths: the register → login → refresh → reuse-detection flow, account lockout, RBAC enforcement, the concurrent-booking race condition (exactly one winner), insufficient-credit rejection (no partial ledger row), and pagination clamping.

> Point `DATABASE_URL` at a disposable database before running integration tests. Rate limiters are bypassed during the run (`DISABLE_RATE_LIMIT=true`) so the DB-backed lockout logic can be tested deterministically.

---

## Project layout

```
src/
  app.ts            # Express app: middleware, routes, docs
  server.ts         # Bootstrap: DB connect, cron, graceful shutdown
  config/           # Env parsing/validation
  docs/             # OpenAPI generation + Swagger mount
  jobs/             # Scheduled job runners + node-cron scheduler
  middleware/       # auth, rate limiting, audit log, cron auth, errors
  modules/          # Feature modules (routes/controller/service/schema)
    auth/ users/ skills/ sessions/ bookings/ availability/
    mentors/ credits/ notifications/ reports/ admin/ internal/
  services/         # Cross-cutting services (credit, notification, email)
  utils/            # cache, errors, jwt, crypto, response, prisma-filters
  prisma/           # Prisma client + seed
  tests/            # Unit tests + tests/integration/ (Supertest)
api/                # Vercel serverless entrypoint (exports the Express app)
prisma/             # schema.prisma + migrations
vercel.json         # Vercel build, rewrites, function config + daily crons
.vercelignore       # Files excluded from the Vercel deployment bundle
.github/workflows/  # cron.yml — external 15-min scheduler for Hobby plan
```
