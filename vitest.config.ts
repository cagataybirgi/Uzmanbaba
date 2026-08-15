import { defineConfig } from "vitest/config";

// Frontend unit tests only. The backend has its own vitest setup under
// backend/ (integration tests against a real Postgres) — keep them separate
// so `npm test` at the root never needs a database.
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", "backend"],
  },
});
