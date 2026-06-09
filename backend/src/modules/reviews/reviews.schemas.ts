import { z } from "zod";

export const createReviewSchema = z.object({
  bookingId: z.string().uuid("Geçersiz rezervasyon."),
  rating: z
    .number({ required_error: "Puan zorunlu." })
    .int("Puan tam sayı olmalı.")
    .min(1, "Puan 1 ile 5 arasında olmalı.")
    .max(5, "Puan 1 ile 5 arasında olmalı."),
  comment: z.string().trim().max(2000).optional(),
});

export const listProfessionalReviewsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ListProfessionalReviewsQuery = z.infer<
  typeof listProfessionalReviewsQuery
>;
