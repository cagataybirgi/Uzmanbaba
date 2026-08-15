import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resendVerificationLimiter,
  verifyEmailLimiter,
} from "../../middleware/rateLimit.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";
import * as authService from "./auth.service.js";
import { changePasswordSchema } from "../users/users.schemas.js";
import { changePassword as changePasswordService } from "../users/users.service.js";

export const authRouter = Router();

/**
 * Async handlers throw freely; Express 4 doesn't auto-forward thrown errors
 * from promises, so we wrap with this tiny helper.
 */
const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// ── POST /auth/register ─────────────────────────────────────────────────────
authRouter.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  }),
);

// ── POST /auth/login ────────────────────────────────────────────────────────
authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  }),
);

// ── POST /auth/verify-email ─────────────────────────────────────────────────
authRouter.post(
  "/verify-email",
  verifyEmailLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = verifyEmailSchema.parse(req.body);
    const user = await authService.verifyEmail(req.auth!.sub, input);
    res.status(200).json({ ok: true, user });
  }),
);

// ── POST /auth/resend-verification ──────────────────────────────────────────
authRouter.post(
  "/resend-verification",
  resendVerificationLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.resendVerification(req.auth!.sub);
    res.status(200).json({ ok: true });
  }),
);

// ── POST /auth/forgot-password ──────────────────────────────────────────────
authRouter.post(
  "/forgot-password",
  forgotPasswordLimiter,
  asyncHandler(async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(input);
    // Always 200 to avoid leaking which emails exist.
    res.status(200).json({ ok: true });
  }),
);

// ── POST /auth/reset-password ───────────────────────────────────────────────
authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(input);
    res.status(200).json({ ok: true });
  }),
);

// ── POST /auth/change-password ──────────────────────────────────────────────
// Returns a fresh token: the version bump revokes all prior JWTs including
// the one used for this request, so the client must swap to the new one.
authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const { token } = await changePasswordService(req.auth!.sub, input);
    res.status(200).json({ ok: true, token });
  }),
);

// ── POST /auth/logout ───────────────────────────────────────────────────────
// Stateless JWT — no server side to invalidate. The endpoint exists so the
// frontend has a single integration point and so we can add server-side
// session tracking later without changing the contract.
authRouter.post("/logout", (_req, res) => {
  res.status(200).json({ ok: true });
});

// ── GET /auth/me ────────────────────────────────────────────────────────────
// Used by the frontend to rehydrate the current user after a refresh.
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.auth!.sub);
    res.status(200).json({ user });
  }),
);
