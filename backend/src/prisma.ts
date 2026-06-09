import { PrismaClient } from "@prisma/client";
import { config } from "./config.js";

/**
 * Single, shared Prisma client.
 *
 * tsx watch reloads modules on file change, which would otherwise create a
 * fresh PrismaClient (and a new connection pool) on every edit. Stashing it
 * on `globalThis` survives the reload during development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDev ? ["warn", "error"] : ["error"],
  });

if (config.isDev) {
  globalForPrisma.prisma = prisma;
}
