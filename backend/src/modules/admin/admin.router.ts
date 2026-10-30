import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import {
  listBookingsQuery,
  listPaymentsQuery,
  listUsersQuery,
  paymentIdParams,
  resolvePaymentBody,
} from "./admin.schemas.js";
import * as svc from "./admin.service.js";

/** Staff-only endpoints. Every route below is behind requireAuth + requireAdmin. */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// ── GET /admin/summary ──────────────────────────────────────────────────────
adminRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    res.status(200).json({ summary: await svc.getSummary() });
  }),
);

// ── GET /admin/users ────────────────────────────────────────────────────────
adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const query = listUsersQuery.parse(req.query);
    res.status(200).json(await svc.listUsers(query));
  }),
);

// ── GET /admin/bookings ─────────────────────────────────────────────────────
adminRouter.get(
  "/bookings",
  asyncHandler(async (req, res) => {
    const query = listBookingsQuery.parse(req.query);
    res.status(200).json(await svc.listBookings(query));
  }),
);

// ── GET /admin/payments ─────────────────────────────────────────────────────
// ?attention=true narrows to the payments someone has to act on.
adminRouter.get(
  "/payments",
  asyncHandler(async (req, res) => {
    const query = listPaymentsQuery.parse(req.query);
    res.status(200).json(await svc.listPayments(query));
  }),
);

// ── POST /admin/payments/:id/resolve ────────────────────────────────────────
// Body: { action: "mark_refunded" | "retry_refund", note? }
adminRouter.post(
  "/payments/:id/resolve",
  asyncHandler(async (req, res) => {
    const { id } = paymentIdParams.parse(req.params);
    const input = resolvePaymentBody.parse(req.body);
    res.status(200).json(await svc.resolvePayment(req.auth!.sub, id, input));
  }),
);
