import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors.js";
import { logger } from "../logger.js";
import { config } from "../config.js";

/**
 * 404 handler — mounted after all routes. Throws a NotFound so the central
 * error handler can render the response in the same shape as everything else.
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Endpoint bulunamadı: ${req.method} ${req.path}`));
};

/**
 * Central error handler.
 *
 * Always returns: { error: { code, message, details? } }
 *
 * - AppError       → its own status + code
 * - ZodError       → 400 with field-level details
 * - everything else → 500 with a generic message in production (no stack leak)
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_error",
        message: "Girdi doğrulaması başarısız.",
        details: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
    return;
  }

  // Unknown error — log the full thing server-side, hide details from client.
  logger.error("unhandled_error", {
    path: req.path,
    method: req.method,
    err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
  });

  res.status(500).json({
    error: {
      code: "internal_error",
      message: config.isProd ? "Beklenmedik bir hata oluştu." : String(err),
    },
  });
};
