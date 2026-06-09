import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Single global setup wires the test DB before any test runs.
    globalSetup: ["./tests/setup.ts"],

    // Tests touch a real Postgres — they must run sequentially or they'll
    // step on each other's truncates. `fileParallelism: false` keeps test
    // files serial; within a file, tests are already sequential.
    fileParallelism: false,
    pool: "forks",

    // Plenty of headroom for the migrate + first-connection round on cold
    // CI runs.
    testTimeout: 20_000,
    hookTimeout: 30_000,

    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
