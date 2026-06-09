# syntax=docker/dockerfile:1.7
# ─── Builder ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install every dep, including dev — needed for tsc and prisma generate.
# Lockfile is copied first so `npm ci` can be cached across rebuilds when
# only source files change.
COPY package.json package-lock.json* ./
RUN npm ci

# Prisma client is generated against the schema; copy schema before generate.
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript.
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# ─── Runner ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Only production deps in the runtime layer — keeps the image smaller and
# the runtime surface area minimal.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Bring over the generated Prisma client + the schema (the CLI reads it at
# `prisma migrate deploy` time during release).
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Compiled JS.
COPY --from=builder /app/dist ./dist

# Uploads dir. Mounted as a volume in production so files persist across
# container restarts; the chown lets the non-root `node` user write to it.
RUN mkdir -p uploads/avatars && chown -R node:node uploads

USER node
EXPOSE 4000

# Default command. Run migrations as a separate `docker compose run backend
# npm run db:deploy` step so app crashes don't take down a half-migrated DB.
CMD ["node", "dist/index.js"]
