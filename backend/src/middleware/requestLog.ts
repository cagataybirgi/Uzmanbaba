import type { RequestHandler } from "express";
import { logger } from "../logger.js";

/**
 * Per-request access log.
 *
 * Records start time on entry and emits a single structured line on
 * `res.finish`, which fires after the response has been flushed to the
 * socket. Logging on `finish` (rather than wrapping `res.end`) means the
 * status + content-length we see are the ones actually sent.
 *
 * Static and health probes (`/health`, `/uploads/...`) are skipped to keep
 * the log noise-free; flip `SKIP` if you want full traffic.
 */
const SKIP = /^(\/health|\/uploads\/)/;

export const requestLog: RequestHandler = (req, res, next) => {
  if (SKIP.test(req.path)) return next();

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    // ns → ms with one decimal place; fast enough to do inline.
    const durMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    logger.info("req", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Math.round(durMs * 10) / 10,
      ip: req.ip,
      // Authenticated requests: the JWT was already verified upstream, so
      // `req.auth.sub` is present and tying log lines to a user is safe.
      ...(req.auth ? { uid: req.auth.sub } : {}),
    });
  });

  next();
};
