import { toast as sonnerToast } from "sonner";
import { ApiError } from "./api";

/**
 * Thin wrapper around sonner so call sites stay consistent.
 *
 * - `success`/`error`/`info`/`warning` are passthroughs with a longer default
 *   duration than sonner's 4s — Turkish copy tends to be longer than the
 *   English defaults the lib was tuned for.
 * - `apiError(err, fallback)` is the project's bread-and-butter helper:
 *   pulls `err.message` from an ApiError, falls back to a user-friendly
 *   default for everything else. One-liner at the call site:
 *
 *       catch (err) { toast.apiError(err, "Kaydedilemedi."); }
 */

const DEFAULT_DURATION = 4000;

export const toast = {
  success: (message: string, opts?: Parameters<typeof sonnerToast.success>[1]) =>
    sonnerToast.success(message, { duration: DEFAULT_DURATION, ...opts }),

  error: (message: string, opts?: Parameters<typeof sonnerToast.error>[1]) =>
    sonnerToast.error(message, { duration: DEFAULT_DURATION + 1000, ...opts }),

  info: (message: string, opts?: Parameters<typeof sonnerToast.info>[1]) =>
    sonnerToast.info(message, { duration: DEFAULT_DURATION, ...opts }),

  warning: (message: string, opts?: Parameters<typeof sonnerToast.warning>[1]) =>
    sonnerToast.warning(message, { duration: DEFAULT_DURATION, ...opts }),

  apiError: (err: unknown, fallback = "Bir hata oluştu.") => {
    const message = err instanceof ApiError ? err.message : fallback;
    return sonnerToast.error(message, { duration: DEFAULT_DURATION + 1000 });
  },
};
