import { execSync } from "node:child_process";

/**
 * Global setup. Runs once before any test file.
 *
 * - Forces NODE_ENV=test and a deterministic JWT secret so config validation
 *   passes regardless of the developer's shell env.
 * - Points DATABASE_URL at TEST_DATABASE_URL (must be different from the dev
 *   DB so nobody's hand-typed seed data gets wiped).
 * - Runs `prisma migrate deploy` so the committed migrations are the single
 *   source of truth for the test schema, same as production.
 */
export default async function setup() {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? "test-only-secret-at-least-32-characters-long-yes";
  process.env.PUBLIC_BASE_URL =
    process.env.PUBLIC_BASE_URL ?? "http://localhost:4000";
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  // Mail sender stays in dev-mode (logs to console) — tests don't assert on
  // SMTP and we don't want them hitting a real provider.
  process.env.SMTP_HOST = "";

  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    throw new Error(
      "TEST_DATABASE_URL must be set. Example: " +
        'postgresql://postgres:postgres@localhost:5432/uzmanbaba_test?schema=public',
    );
  }
  process.env.DATABASE_URL = testDbUrl;

  // Apply the committed migrations. Using `migrate deploy` (not `db push`)
  // means the suite also verifies that the production migration path works
  // — if someone edits schema.prisma without creating a migration, tests
  // fail here instead of production failing later.
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDbUrl },
  });
}
