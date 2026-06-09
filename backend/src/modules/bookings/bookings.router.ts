import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  createBookingSchema,
  listMyBookingsQuery,
} from "./bookings.schemas.js";
import * as svc from "./bookings.service.js";

export const bookingsRouter = Router();

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// ── POST /bookings ──────────────────────────────────────────────────────────
bookingsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createBookingSchema.parse(req.body);
    const item = await svc.createBooking(req.auth!.sub, input);
    res.status(201).json({ item });
  }),
);

// ── GET /bookings/me ────────────────────────────────────────────────────────
bookingsRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = listMyBookingsQuery.parse(req.query);
    const result = await svc.listMyBookings(req.auth!.sub, query);
    res.status(200).json(result);
  }),
);

// ── GET /bookings/professional/me ───────────────────────────────────────────
// Listed before /:id-style paths so the literal segment wins.
bookingsRouter.get(
  "/professional/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = listMyBookingsQuery.parse(req.query);
    const result = await svc.listProfessionalBookings(req.auth!.sub, query);
    res.status(200).json(result);
  }),
);

// ── PATCH /bookings/:id/cancel ──────────────────────────────────────────────
bookingsRouter.patch(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await svc.cancelBooking(req.auth!.sub, req.params.id);
    res.status(200).json({ item });
  }),
);

// ── PATCH /bookings/:id/confirm ─────────────────────────────────────────────
bookingsRouter.patch(
  "/:id/confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await svc.confirmBooking(req.auth!.sub, req.params.id);
    res.status(200).json({ item });
  }),
);

// ── PATCH /bookings/:id/complete ────────────────────────────────────────────
bookingsRouter.patch(
  "/:id/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await svc.completeBooking(req.auth!.sub, req.params.id);
    res.status(200).json({ item });
  }),
);
