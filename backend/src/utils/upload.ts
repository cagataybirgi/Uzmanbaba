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
 * Content-based image check. Multer's fileFilter only sees the client-declared
 * MIME type, which is trivially spoofable — a `.exe` renamed and sent with
 * `Content-Type: image/png` sails through. This inspects the actual leading
 * bytes of the written file against known image magic numbers, so we store
 * real images only. Call it AFTER multer has written the file to disk.
 */
export async function fileHasImageSignature(absPath: string): Promise<boolean> {
  let handle: fs.promises.FileHandle | undefined;
  try {
    handle = await fs.promises.open(absPath, "r");
    const buf = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buf, 0, 12, 0);
    const b = buf.subarray(0, bytesRead);
    // JPEG: FF D8 FF
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      b.length >= 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
    ) {
      return true;
    }
    // WEBP: "RIFF" .... "WEBP"
    if (
      b.length >= 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    await handle?.close();
  }
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
