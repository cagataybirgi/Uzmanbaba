import { z } from "zod";

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export const createBookingSchema = z.object({
  professionalId: z.string().uuid("Geçersiz uzman."),
  scheduledAt: z
    .string({ required_error: "Tarih zorunlu." })
    .datetime({ message: "Geçersiz tarih." })
    // Schedule must be in the (near) future. 1-minute grace so server/client
    // clock drift doesn't reject submissions that are "now".
    .refine((s) => new Date(s).getTime() > Date.now() - 60_000, {
      message: "Geçmişe randevu alınamaz.",
    }),
  address: z
    .string({ required_error: "Adres zorunlu." })
    .trim()
    .min(5, "Geçerli bir adres girin.")
    .max(500),
  description: z
    .string({ required_error: "İş tanımı zorunlu." })
    .trim()
    .min(5, "İşi biraz daha açıkla.")
    .max(2000),
});

export const listMyBookingsQuery = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ListMyBookingsQuery = z.infer<typeof listMyBookingsQuery>;
