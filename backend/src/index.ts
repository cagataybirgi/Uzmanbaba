import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

/**
 * Entry point: boots HTTP listener, sets up graceful shutdown.
 *
 * Shutdown order matters — stop accepting new requests first, then let
 * in-flight requests drain, then close the DB connection pool. Otherwise
 * an in-flight request can hit a closed pool and 500.
 */
async function main() {
  const app = buildApp();
  const server = app.listen(config.PORT, () => {
    logger.info("server_listening", {
      port: config.PORT,
      env: config.NODE_ENV,
      corsOrigins: config.corsOrigins,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info("shutdown_start", { signal });
    server.close(async (err) => {
      if (err) logger.error("server_close_error", { err: String(err) });
      try {
        await prisma.$disconnect();
      } catch (e) {
        logger.error("prisma_disconnect_error", { err: String(e) });
      }
      logger.info("shutdown_complete");
      process.exit(err ? 1 : 0);
    });

    // Hard kill if the graceful path takes too long.
    setTimeout(() => {
      logger.warn("forced_exit");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled_rejection", { reason: String(reason) });
  });
  process.on("uncaughtException", (err) => {
    logger.error("uncaught_exception", { err: String(err) });
    process.exit(1);
  });
}

main().catch((err) => {
  logger.error("fatal_boot_error", { err: String(err) });
  process.exit(1);
});
