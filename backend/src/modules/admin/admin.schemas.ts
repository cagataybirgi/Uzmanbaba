import { z } from "zod";
import { BOOKING_STATUSES } from "../bookings/bookings.schemas.js";

export const PAYMENT_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "refunding",
  "refunded",
] as const;

const page = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
};

/** Free-text search; blank means "no filter". */
const q = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((s) => (s ? s : undefined));

export const listUsersQuery = z.object({
  q,
  accountType: z.enum(["customer", "professional"]).optional(),
  ...page,
});

export const listBookingsQuery = z.object({
  q,
  status: z.enum(BOOKING_STATUSES).optional(),
  ...page,
});

export const listPaymentsQuery = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  // Query strings only carry text, so "true" is the only way to turn it on.
  attention: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  ...page,
});

export const paymentIdParams = z.object({
  id: z.string().uuid("Geçersiz ödeme."),
});

/**
 * What the admin found in the iyzico panel for a payment that needs a hand:
 *   - mark_refunded: iyzico shows the money went back; just record it.
 *   - retry_refund:  iyzico shows no refund; send it again.
 */
export const resolvePaymentBody = z.object({
  action: z.enum(["mark_refunded", "retry_refund"]),
  note: z.string().trim().max(500).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuery>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuery>;
export type ResolvePaymentInput = z.infer<typeof resolvePaymentBody>;
