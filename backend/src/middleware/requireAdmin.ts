import type { RequestHandler } from "express";
import { AppError } from "../errors.js";
import { prisma } from "../prisma.js";

/**
 * Lets only platform staff through. Must run after requireAuth.
 *
 * Reads isAdmin from the database on every request rather than from the
 * JWT, so revoking admin (npm run admin:grant -- <email> --revoke) takes
 * effect immediately, without waiting for old tokens to expire.
 */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) throw AppError.unauthorized("Oturum açmanız gerekiyor.");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) throw AppError.forbidden();
    next();
  } catch (err) {
    next(err);
  }
};
