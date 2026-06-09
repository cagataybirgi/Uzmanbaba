import { z } from "zod";

export const SORT_VALUES = ["rating", "nearest", "availability"] as const;

/**
 * Query schema for GET /professionals.
 *
 * - All fields optional; sensible defaults applied.
 * - `q` is trimmed and lower-bounded at 1 char so empty strings don't waste
 *   a useless ILIKE.
 * - `pageSize` capped at 50 to keep the endpoint cheap.
 */
export const listProfessionalsQuery = z.object({
  q: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  city: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .optional(),
  sort: z.enum(SORT_VALUES).default("rating"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(6),
});

export type ListProfessionalsQuery = z.infer<typeof listProfessionalsQuery>;
