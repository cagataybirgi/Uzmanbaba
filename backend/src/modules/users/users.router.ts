import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { prisma } from "../../prisma.js";
import { AppError } from "../../errors.js";
import {
  avatarUpload,
  deleteLocalUpload,
  fileHasImageSignature,
  mapMulterError,
} from "../../utils/upload.js";
import { avatarUploadLimiter } from "../../middleware/rateLimit.js";
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
// multipart/form-data with a single `file` field. Multer enforces size + the
// declared MIME type and writes to disk; we then verify the file's actual
// bytes are a real image before keeping it.
usersRouter.post(
  "/me/avatar",
  requireAuth,
  avatarUploadLimiter,
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
    // Content check: the declared MIME type is spoofable, so confirm the
    // bytes on disk are actually a JPEG/PNG/WebP. Reject + clean up if not.
    const looksLikeImage = await fileHasImageSignature(req.file.path);
    if (!looksLikeImage) {
      await deleteLocalUpload(req.file.path);
      throw new AppError("Yüklenen dosya geçerli bir görsel değil.", {
        status: 400,
        code: "invalid_file_content",
      });
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
