import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { AppError } from "../errors.js";

/**
 * Local-disk uploads.
 *
 * Files go under `<repo>/backend/uploads/<bucket>/<uuid>.<ext>` and are served
 * back through Express's static middleware at `/uploads/...`. This is fine
 * for single-instance dev/staging; for production swap the storage engine
 * for an S3/R2 client (the upload endpoint surface won't change).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute path on disk where uploads live. Created on first import. */
export const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(path.join(UPLOADS_ROOT, "avatars"), { recursive: true });

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_AVATAR_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXT_FROM_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(UPLOADS_ROOT, "avatars"));
  },
  filename: (_req, file, cb) => {
    // We control the filename so path-traversal in `originalname` can't bite
    // us — `randomUUID` produces a deterministic-shape, safe basename.
    const ext = EXT_FROM_MIME[file.mimetype] ?? "bin";
    cb(null, `${randomUUID()}.${ext}`);
  },
});

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
      // Multer surfaces the error through next(err); the central error
      // handler maps AppError to a 4xx JSON response.
      cb(
        new AppError("Yalnızca JPEG, PNG veya WebP yükleyebilirsiniz.", {
          status: 400,
          code: "invalid_file_type",
        }),
      );
      return;
    }
    cb(null, true);
  },
});

/**
 * Resolve a stored relative path like `/uploads/avatars/xxx.jpg` to its
 * absolute filesystem path. Returns `null` for anything else (external URLs,
 * non-upload paths) so callers can no-op on those without a separate check.
 */
export function localPathFromAvatarUrl(avatar: string): string | null {
  if (!avatar.startsWith("/uploads/")) return null;
  // Resolve relative to UPLOADS_ROOT, then verify the result is still inside
  // UPLOADS_ROOT — guards against weird DB values that try to escape via
  // path traversal sequences.
  const trimmed = avatar.replace(/^\/uploads\//, "");
  const resolved = path.resolve(UPLOADS_ROOT, trimmed);
  if (!resolved.startsWith(UPLOADS_ROOT)) return null;
  return resolved;
}

/**
 * Best-effort delete. Logs are kept lightweight (caller logs the context) so
 * an orphaned file in storage isn't worth taking down the request over.
 */
export async function deleteLocalUpload(absPath: string): Promise<void> {
  try {
    await fs.promises.unlink(absPath);
  } catch {
    /* file already gone, permissions, etc. — not worth surfacing */
  }
}

/**
 * Maps multer's error codes onto our user-facing messages. Call this in the
 * route's error handler so the wire response stays consistent.
 */
export function mapMulterError(err: unknown): AppError | null {
  if (!(err instanceof multer.MulterError)) return null;
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError("Dosya çok büyük (en fazla 2 MB).", {
      status: 400,
      code: "file_too_large",
    });
  }
  return new AppError("Dosya yüklenemedi.", {
    status: 400,
    code: "upload_failed",
  });
}
