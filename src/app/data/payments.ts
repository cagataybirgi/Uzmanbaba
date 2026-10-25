import { api } from "../lib/api";

/* ─── types ──────────────────────────────────────────────────────────────── */

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunding" | "refunded";

export interface Payment {
  id: string;
  bookingId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  paidAt: string | null;
  /** iyzico's reason when status is "failed"; Turkish, safe to show. */
  errorMessage: string | null;
  createdAt: string;
}

export interface CheckoutSession {
  paymentId: string;
  /** iyzico's hosted page. Send the browser here with window.location. */
  paymentPageUrl: string | null;
  checkoutFormContent: string | null;
}

/* ─── calls ──────────────────────────────────────────────────────────────── */

/**
 * Starts a checkout for a confirmed, quoted booking. The amount is decided
 * server-side from the booking; nothing about money is sent from here.
 */
export function startCheckout(bookingId: string): Promise<CheckoutSession> {
  return api
    .post<{ session: CheckoutSession }>(
      `/payments/checkout/${encodeURIComponent(bookingId)}`,
    )
    .then((r) => r.session);
}

/** Outcome of a payment, as recorded by our backend (never by the URL). */
export function getPayment(id: string): Promise<Payment> {
  return api
    .get<{ item: Payment }>(`/payments/${encodeURIComponent(id)}`)
    .then((r) => r.item);
}
