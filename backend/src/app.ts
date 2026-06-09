import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config.js";
import { UPLOADS_ROOT } from "./utils/upload.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { professionalsRouter } from "./modules/professionals/professionals.router.js";
import { bookingsRouter } from "./modules/bookings/bookings.router.js";
import { usersRouter } from "./modules/users/users.router.js";
import { reviewsRouter } from "./modules/reviews/reviews.router.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLog } from "./middleware/requestLog.js";

/**
 * Builds and returns the configured Express app.
 *
 * Kept separate from index.ts so tests can import the app without booting
 * an HTTP listener.
 */
export function buildApp(): Express {
  const app = express();

  // Behind a reverse proxy (Nginx, fly.io, etc.) so req.ip reflects the real
  // client IP — needed for accurate rate-limit keying.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // Default `same-origin` would block <img src="http://localhost:4000/uploads/...">
      // when rendered from the frontend's origin. The API is meant to be
      // cross-origin accessed, so relax CORP at the helmet level.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin requests have no Origin header (curl, server-to-server).
        if (!origin) return cb(null, true);
        if (config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin not allowed (${origin})`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(requestLog);

  // ── Static uploads ───────────────────────────────────────────────────────
  // Served from /uploads/* so they have the same origin as the API and the
  // DTO layer can build absolute URLs against PUBLIC_BASE_URL.
  app.use(
    "/uploads",
    express.static(UPLOADS_ROOT, {
      // Avatars rarely change after upload (we always allocate a fresh UUID
      // filename) so they can be cached aggressively.
      maxAge: "7d",
      fallthrough: false,
    }),
  );

  // ── Health ───────────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, env: config.NODE_ENV });
  });

  // ── Routes ───────────────────────────────────────────────────────────────
  // The frontend's API_BASE default is "/api", so we mount everything under
  // /api to make a reverse-proxy or Vite-proxy setup match without changes.
  app.use("/api/auth", authRouter);
  app.use("/api/professionals", professionalsRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/reviews", reviewsRouter);

  // ── 404 + error handler (must be last) ──────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
