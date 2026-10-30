import type { Payment, PaymentStatus } from "@prisma/client";

/**
 * What the frontend sees of a payment. Provider identifiers and the raw
 * iyzico payload stay server-side — they're for audits and refunds, not UI.
 */
export interface PaymentDto {
  id: string;
  bookingId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  paidAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export function toPaymentDto(p: Payment): PaymentDto {
  return {
    id: p.id,
    bookingId: p.bookingId,
    status: p.status,
    amountCents: p.amountCents,
    currency: p.currency,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    errorMessage: p.errorMessage,
    createdAt: p.createdAt.toISOString(),
  };
}

/** Returned by POST /payments/checkout/:bookingId. */
export interface CheckoutSessionDto {
  paymentId: string;
  /** iyzico's hosted page — the frontend sends the browser here. */
  paymentPageUrl: string | null;
  /** Embeddable alternative, unused by the current UI but handed through. */
  checkoutFormContent: string | null;
}
