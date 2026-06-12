# UzmanBaba — Backend

Node.js + Express + Prisma + PostgreSQL backend for UzmanBaba.

Full API for the marketplace: auth (register/login/verify/reset), user
profiles + avatar upload, professional listing/search/detail, the booking
lifecycle (create → confirm → complete / cancel), and reviews with
recomputed ratings. The React frontend is fully wired against it — the
shared `api` client lives at `src/app/lib/api.ts` and every page reads from
these endpoints.

## Endpoints

All endpoints are mounted under `/api`.

| Method | Path                              | Auth | Description                              |
| ------ | --------------------------------- | ---- | ---------------------------------------- |
| POST   | `/api/auth/register`              |  —   | Create account, issue JWT + verify code  |
| POST   | `/api/auth/login`                 |  —   | Verify credentials, issue JWT            |
| POST   | `/api/auth/verify-email`          |  ✔   | Consume the 6-digit code                 |
| POST   | `/api/auth/resend-verification`   |  ✔   | Issue a fresh verification code          |
| POST   | `/api/auth/forgot-password`       |  —   | Email a password-reset link              |
| POST   | `/api/auth/reset-password`        |  —   | Consume reset token, set new password    |
| POST   | `/api/auth/change-password`       |  ✔   | Change password (current + new)          |
| POST   | `/api/auth/logout`                |  —   | No-op for stateless JWT (kept for parity)|
| GET    | `/api/auth/me`                    |  ✔   | Re-hydrate the signed-in user            |
| GET    | `/api/users/me`                   |  ✔   | Alias of `/auth/me`                      |
| PATCH  | `/api/users/me`                   |  ✔   | Update profile (name, phone, bio, notifications, …) |
| DELETE | `/api/users/me`                   |  ✔   | Delete account (requires current password)|
| POST   | `/api/users/me/avatar`            |  ✔   | Upload a profile picture (multipart)     |
| GET    | `/api/professionals`              |  —   | List/search/sort/paginate professionals  |
| GET    | `/api/professionals/featured`     |  —   | Top professionals for the Home page      |
| GET    | `/api/professionals/:id`          |  —   | Professional detail                      |
| POST   | `/api/bookings`                   |  ✔   | Create a booking for the current user    |
| GET    | `/api/bookings/me`                |  ✔   | Current user's bookings as a customer    |
| GET    | `/api/bookings/professional/me`   |  ✔   | Current user's incoming bookings (as pro)|
| PATCH  | `/api/bookings/:id/cancel`        |  ✔   | Cancel a booking (customer or pro)       |
| PATCH  | `/api/bookings/:id/confirm`       |  ✔   | Pro accepts a pending booking            |
| PATCH  | `/api/bookings/:id/complete`      |  ✔   | Pro marks a booking complete             |
| POST   | `/api/reviews`                    |  ✔   | Review a completed booking (1–5 + comment)|
| GET    | `/api/professionals/:id/reviews`  |  —   | Public list of a pro's reviews           |
| GET    | `/health`                         |  —   | Liveness check                           |

### Reviews — request shapes

`POST /api/reviews`:

```json
{ "bookingId": "uuid", "rating": 5, "comment": "Çok hızlıydı." }
```

Constraints enforced server-side:

- Only the customer who owns the booking can submit a review.
- The booking must be in `completed` state.
- At most one review per booking (unique on `bookingId`).
- After insert, the professional's `rating` (avg) and `reviewsCount` are
  recomputed in the same transaction — they self-heal if anything ever drifts.

### Bookings — request shapes

`POST /api/bookings`:

```json
{
  "professionalId": "uuid",
  "scheduledAt":    "2026-06-20T10:00:00.000Z",
  "address":        "Bağdat Caddesi No:42",
  "description":    "Mutfak lavabosu sızdırıyor"
}
```

`GET /api/bookings/me?status=pending&page=1&pageSize=20` returns the paginated
shape used by the dashboard. Each item embeds thin `customer` and
`professional` summaries so the list can render without a follow-up fetch per
row.

`GET /api/bookings/professional/me` accepts the same query params and returns
the same shape — but scoped to bookings where the caller is the professional.
The frontend uses this for the "Gelen Talepler" tab.

### Booking lifecycle

```
pending ──(POST /bookings) ─── customer creates
   │
   ├── (PATCH /:id/confirm)  ──► confirmed   (pro accepts)
   │                                │
   │                                ▼
   ├── (PATCH /:id/complete) ──► completed   (pro marks done — also bumps
   │                                          customer.completedJobs and
   │                                          professional.completedJobs,
   │                                          decrements customer.pendingJobs)
   │
   └── (PATCH /:id/cancel)   ──► cancelled   (either party — decrements
                                              customer.pendingJobs if it was
                                              still active)
```

Authorization is enforced server-side: `confirm` and `complete` reject if the
caller isn't the booking's professional; `cancel` is open to both parties.

### Professionals — query params

`GET /api/professionals` accepts:

| Param      | Type   | Default  | Notes                                          |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `q`        | string | —        | Free-text search on name + specialty           |
| `city`     | string | —        | Matches the city prefix of `location`          |
| `sort`     | enum   | `rating` | `rating` \| `nearest` \| `availability`        |
| `page`     | int    | `1`      | 1-indexed                                      |
| `pageSize` | int    | `6`      | Max `50`                                       |

Returns:

```json
{
  "items":     [/* ProfessionalDto */],
  "total":     42,
  "page":      1,
  "pageSize":  6,
  "totalPages": 7
}
```

### Response shapes

Success (login / register):

```json
{
  "token": "<jwt>",
  "user": {
    "id": "uuid", "name": "...", "email": "...", "phone": "...",
    "accountType": "customer", "emailVerified": false,
    "avatar": "...", "location": "Ankara, TR",
    "specialty": "...", "bio": "...",
    "joinDate": "Mayıs 2026",
    "rating": null, "completedJobs": 0, "pendingJobs": 0,
    "notifications": { "email": true, "sms": true, "push": false }
  }
}
```

`PATCH /api/users/me` accepts a partial `notifications` object — any combination
of `email`, `sms`, `push` (booleans). Omitted keys are left untouched.

`DELETE /api/users/me` body:

```json
{ "password": "current-password" }
```

Verifies the password (defence against stolen-session deletion), then
hard-deletes the user; cascade FKs drop their bookings, reviews, verification
rows, and reset tokens with them.

Errors always look like:

```json
{ "error": { "code": "invalid_credentials", "message": "...", "details": [] } }
```

## Setup

### 1. Install

```bash
cd backend
npm install
```

### 2. Configure env

```bash
cp .env.example .env
# edit DATABASE_URL and JWT_SECRET at minimum
```

Generate a strong `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Start Postgres

Local docker (one-liner):

```bash
docker run --name uzmanbaba-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=uzmanbaba \
  -p 5432:5432 -d postgres:16
```

### 4. Migrate

```bash
npm run db:migrate    # creates tables, generates client
```

### 5. Seed (optional, dev only)

```bash
npm run db:seed       # upserts 6 sample professionals
```

The seeded accounts share the password `Password123!` if you want to log in
as one to test the professional flow.

### 6. Run

```bash
npm run dev           # tsx watch, hot reload on file change
# or
npm run build && npm start
```

The API will be at `http://localhost:4000`.

## File uploads

`POST /api/users/me/avatar` accepts a `multipart/form-data` request with a
single `file` field (JPEG, PNG, or WebP, max 2 MB). The image is written to
disk under `backend/uploads/avatars/<uuid>.<ext>`, served back through
Express's static middleware at `/uploads/...`, and the user's `avatar` URL
is updated to point at the new file. The previous avatar — if it was a
locally-uploaded one — is best-effort deleted in the same call.

The DTO layer converts stored relative paths (`/uploads/avatars/...`) to
absolute URLs using `PUBLIC_BASE_URL`, so the frontend gets
`http://localhost:4000/uploads/avatars/<uuid>.jpg` in API responses and can
render them directly via `<img>`.

**Production note:** local disk is fine for single-instance dev and staging
but breaks on multi-instance deploys and ephemeral filesystems. To swap to
S3/R2:

1. Replace `multer.diskStorage` in `src/utils/upload.ts` with `multer-s3`
   (or your provider's equivalent), pointing at your bucket.
2. Have the upload return the public URL of the object, and pass that to
   `setAvatar` instead of the `/uploads/...` relative path.
3. Drop the static `/uploads` serving in `app.ts` and remove `PUBLIC_BASE_URL`
   prefixing from the DTO files (the bucket URL is already absolute).

The endpoint contract on the wire stays the same.

## Email

In development, leave `SMTP_HOST` blank in `.env`. Verification codes and
password-reset links will be **logged to the console** instead of being
emailed. Set `SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_PORT/SMTP_SECURE` to send
through a real provider (e.g. SendGrid, Postmark, Resend SMTP, Mailgun).

## Wiring the frontend

The frontend is already wired — every page goes through the shared client at
`src/app/lib/api.ts`, which reads `VITE_API_URL` and defaults to `/api`.
Pick one of two ways to point it at this backend:

### Option A — env var (no proxy)

```env
# at the project root (not /backend)
VITE_API_URL=http://localhost:4000/api
```

The client builds absolute URLs against this origin; CORS on the backend
already allows `http://localhost:5173`.

### Option B — Vite proxy

Add a `server.proxy` block to `vite.config.ts`:

```ts
export default defineConfig({
  // ...
  server: {
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
```

With this, the client's default `/api` base just works — no env var needed.
(The `/uploads` entry keeps locally-uploaded avatars rendering through the
same origin.)

## Project layout

```
backend/
├── Dockerfile                  # multi-stage build, non-root runtime
├── docker-compose.yml          # backend + Postgres + named volumes
├── prisma/
│   ├── schema.prisma           # User, Booking, Review, EmailVerification, PasswordReset
│   └── seed.ts                 # sample professionals (npm run db:seed)
├── tests/                      # vitest + supertest integration tests
│   ├── setup.ts                # prisma db push against TEST_DATABASE_URL
│   ├── helpers.ts              # app singleton, resetDb, register helpers
│   ├── auth.test.ts
│   ├── professionals.test.ts
│   └── bookings.test.ts
└── src/
    ├── index.ts                # boot + graceful shutdown
    ├── app.ts                  # express factory (helmet, cors, static /uploads)
    ├── config.ts               # zod-validated env
    ├── prisma.ts               # shared PrismaClient
    ├── logger.ts               # tiny structured logger
    ├── errors.ts               # AppError class
    ├── middleware/
    │   ├── errorHandler.ts
    │   ├── requireAuth.ts
    │   ├── requestLog.ts       # structured access log
    │   └── rateLimit.ts
    ├── utils/
    │   ├── password.ts         # bcrypt
    │   ├── jwt.ts              # sign / verify
    │   ├── token.ts            # numeric code + opaque token + sha256
    │   ├── upload.ts           # multer disk storage for avatars
    │   └── email.ts            # nodemailer (or console fallback)
    └── modules/                # each: router / service / schemas / dto
        ├── auth/               # register, login, verify, reset, change-password
        ├── users/              # profile patch, avatar upload, account deletion
        ├── professionals/      # listing, search, featured, detail
        ├── bookings/           # lifecycle: create/confirm/complete/cancel
        └── reviews/            # one per booking, recomputes pro rating
```

## Running with Docker

A `Dockerfile` (multi-stage, non-root runtime user) and `docker-compose.yml`
(backend + Postgres + named volumes for data and uploads) live in this
directory.

```bash
# bring everything up
docker compose up -d --build

# first run: apply migrations
docker compose run --rm backend npm run db:deploy

# optional: seed the sample professionals
docker compose run --rm backend npm run db:seed

# tail logs
docker compose logs -f backend
```

The backend container is published on `:4000`, Postgres on `:5432`. Avatars
land on a named volume (`avatars`) so they survive container rebuilds; drop
them with `docker compose down -v`.

For production, swap the `JWT_SECRET`, `CORS_ORIGIN`, `PUBLIC_BASE_URL`,
SMTP block, and consider migrating uploads from local disk to S3/R2 (see
"File uploads" above).

## Tests

`vitest` + `supertest` run integration tests against a real Postgres. They
take a fresh DB and truncate between every test, so they need their own
connection string — set `TEST_DATABASE_URL` separately from `DATABASE_URL`.

```bash
# one-time: create the test DB
createdb uzmanbaba_test
# or: docker compose exec db createdb -U postgres uzmanbaba_test

# run the suite
npm test

# watch mode while developing
npm run test:watch
```

The setup script runs `prisma db push` against the test DB on every test
run, so it always reflects the current schema with no migration history to
keep in sync.

## Security choices worth knowing

- **Passwords**: bcrypt with 12 rounds.
- **JWT**: HS256, configurable expiry (default 7d). Stateless — `logout`
  is client-side only. Add a token-revocation table later if you need
  server-side invalidation.
- **Login enumeration**: identical error + timing for "wrong email" vs
  "wrong password". `/forgot-password` always returns 200, regardless of
  whether the email exists.
- **Email codes**: 6-digit numeric, 15-min TTL, rate-limited, replaced on
  resend. Stored as plain digits (short-lived, low-value alone).
- **Password reset tokens**: 32-byte random, SHA-256 hashed at rest,
  one-shot (`consumedAt`), 1-hour TTL.
- **Rate limiting**: per-IP on `/login`, `/register`, `/forgot-password`,
  `/verify-email`, `/resend-verification`. Tune in `middleware/rateLimit.ts`.
- **CORS**: explicit allow-list from `CORS_ORIGIN`.
- **Helmet**: standard security headers.
