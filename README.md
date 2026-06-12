# UzmanBaba

Turkish local-services marketplace — customers find verified professionals
(plumbers, cleaners, electricians, …), book them, and review the work.

Originally scaffolded from [Figma Make](https://www.figma.com/design/BuMb7IV6pfTlb7UNtjryVb/UzmanBaba);
now a full-stack app:

- **Frontend** — React 18 + Vite + Tailwind (this directory, `src/`)
- **Backend** — Node.js + Express + Prisma + PostgreSQL (`backend/`,
  see [backend/README.md](backend/README.md) for the API reference,
  Docker setup, and tests)

## Quick start

```bash
# 1. Backend (needs Postgres — see backend/README.md for a docker one-liner)
cd backend
npm install
cp .env.example .env        # set DATABASE_URL + JWT_SECRET
npm run db:migrate
npm run db:seed             # optional: sample professionals
npm run dev                 # API on http://localhost:4000

# 2. Frontend (separate shell, repo root)
npm install
echo VITE_API_URL=http://localhost:4000/api > .env.local
npm run dev                 # app on http://localhost:5173
```

In development, verification codes and password-reset links are printed to
the backend console instead of being emailed (configure SMTP in
`backend/.env` to send real mail).

## What's implemented

- Auth: register, login, e-mail verification (6-digit code), forgot/reset
  password, change password, account deletion
- Professional search with city/text filters, sorting, pagination; featured
  list on the home page; public detail pages with reviews
- Booking lifecycle: create → confirm → complete / cancel, with separate
  customer ("Rezervasyonlarım") and professional ("Gelen Talepler")
  dashboard views
- Reviews (one per completed booking) that recompute the professional's
  rating
- Profile editing, avatar upload, notification preferences
