import type { RequestHandler } from "express";
import { AppError } from "../errors.js";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt.js";

// Augment Express's Request type so handlers can read `req.auth` with full
// type safety. (Declaration merging — Express looks at this automatically.)
declare module "express-serve-static-core" {
  interface Request {
    auth?: JwtPayload;
  }
}

/**
 * Extracts a Bearer token from Authorization, verifies it, and attaches the
 * decoded payload to `req.auth`. Throws 401 otherwise. Use on any route that
 * must know who the caller is.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(AppError.unauthorized("Oturum açmanız gerekiyor."));
  }
  req.auth = verifyAccessToken(token);
  next();
};
