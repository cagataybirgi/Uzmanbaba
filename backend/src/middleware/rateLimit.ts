import rateLimit from "express-rate-limit";

/**
 * Rate limiters for the noisy auth endpoints.
 *
 * Numbers are deliberately tight on the credential endpoints (login, forgot-
 * password) to slow down brute-force / enumeration. Register is slightly
 * looser so legitimate signup bursts (e.g., demo day) don't hit the wall.
 *
 * The error response shape matches the global error handler so the frontend
 * doesn't need a special case for 429s.
 */

const baseConfig = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  message: {
    error: {
      code: "too_many_requests",
      message: "Çok fazla istek. Lütfen sonra tekrar deneyin.",
    },
  },
};

export const loginLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
});

export const registerLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
});

export const forgotPasswordLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
});

export const verifyEmailLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

export const resendVerificationLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000,
  limit: 5,
});
