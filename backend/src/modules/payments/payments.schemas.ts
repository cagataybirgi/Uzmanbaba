import { z } from "zod";

export const checkoutParams = z.object({
  bookingId: z.string().uuid("Geçersiz rezervasyon."),
});

export const paymentParams = z.object({
  id: z.string().uuid("Geçersiz ödeme."),
});

// iyzico posts the checkout token back as a form field. Bound the length so a
// junk body can't turn into a wide DB lookup.
export const callbackBody = z.object({
  token: z.string().trim().min(1).max(200),
});

export type CheckoutParams = z.infer<typeof checkoutParams>;
export type PaymentParams = z.infer<typeof paymentParams>;
export type CallbackBody = z.infer<typeof callbackBody>;
