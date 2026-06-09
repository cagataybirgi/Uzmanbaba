import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { prisma } from "../../prisma.js";
import { AppError } from "../../errors.js";
import { avatarUpload, mapMulterError } from "../../utils/upload.js";
import { toUserDto } from "../auth/auth.dto.js";
import { deleteMeSchema, updateMeSchema } from "./users.schemas.js";
import * as svc from "./users.service.js";

export const usersRouter = Router();

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// ── GET /users/me ───────────────────────────────────────────────────────────
// Convenience alias of GET /auth/me — same data, mounted under the more
// semantic /users path so frontend code that uses both auth + profile endpoints
// doesn't have to remember which lives where.
usersRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
    if (!user) throw AppError.unauthorized();
    res.status(200).json({ user: toUserDto(user) });
  }),
);

// ── PATCH /users/me ─────────────────────────────────────────────────────────
usersRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateMeSchema.parse(req.body);
    const user = await svc.updateMe(req.auth!.sub, input);
    res.status(200).json({ user });
  }),
);

// ── POST /users/me/avatar ───────────────────────────────────────────────────
// multipart/form-data with a single `file` field. Multer validates size +
// MIME, writes the file to disk, and exposes it on `req.file`.
usersRouter.post(
  "/me/avatar",
  requireAuth,
  // We wrap multer in a custom middleware so its errors (size, MIME) get
  // mapped to our standard AppError shape instead of leaking raw multer codes.
  (req, res, next) => {
    avatarUpload.single("file")(req, res, (err) => {
      if (!err) return next();
      const mapped = mapMulterError(err);
      next(mapped ?? err);
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest("Dosya bulunamadı.");
    }
    // Store a relative URL — the DTO layer prefixes the public origin
    // when serializing, and a future move to S3 only changes that one spot.
    const relativeUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await svc.setAvatar(req.auth!.sub, relativeUrl);
    res.status(200).json({ user });
  }),
);

// ── DELETE /users/me ────────────────────────────────────────────────────────
// Body carries the current password as a re-auth check. We use POST-style
// JSON for the body because some intermediaries (browsers, proxies) won't
// forward a body on DELETE — Express handles it fine.
usersRouter.delete(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = deleteMeSchema.parse(req.body);
    await svc.deleteMe(req.auth!.sub, input);
    res.status(204).end();
  }),
);
