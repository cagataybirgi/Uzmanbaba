import type { RequestHandler } from "express";
import { AppError } from "../errors.js";
import { prisma } from "../prisma.js";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt.js";

// Augment Express's Request type so handlers can read `req.auth` with full
// type safety. (Declaration merging — Express looks at this automatically.)
declare module "express-serve-static-core" {
  interface Request {
    auth?: JwtPayload;
  }
}

/**
 * Extracts a Bearer token from Authorization, verifies its signature, and
 * checks the embedded token version against the user's current one. The
 * version check is what makes revocation work with stateless JWTs: bumping
 * User.tokenVersion (password change/reset) instantly invalidates every
 * previously issued token. A deleted user fails the lookup the same way.
 *
 * Cost: one indexed single-column SELECT per authenticated request.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header("authorization") ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw AppError.unauthorized("Oturum açmanız gerekiyor.");
    }
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });
    if (!user || user.tokenVersion !== (payload.ver ?? 0)) {
      throw AppError.unauthorized("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
    }

    req.auth = payload;
    next();
  } catch (err) {
    next(err);
  }
};
