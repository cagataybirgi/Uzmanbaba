import { Router, type Request, type Response, type NextFunction } from "express";
import { listProfessionalsQuery } from "./professionals.schemas.js";
import * as svc from "./professionals.service.js";
import { listProfessionalReviewsQuery } from "../reviews/reviews.schemas.js";
import { listProfessionalReviews } from "../reviews/reviews.service.js";

export const professionalsRouter = Router();

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// ── GET /professionals ───────────────────────────────────────────────────────
professionalsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listProfessionalsQuery.parse(req.query);
    const result = await svc.listProfessionals(query);
    res.status(200).json(result);
  }),
);

// ── GET /professionals/featured ──────────────────────────────────────────────
// Listed before `/:id` so the literal path wins over the param route.
professionalsRouter.get(
  "/featured",
  asyncHandler(async (req, res) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 12
      ? Math.floor(limitRaw)
      : 3;
    const items = await svc.listFeatured(limit);
    res.status(200).json({ items });
  }),
);

// ── GET /professionals/:id/reviews ──────────────────────────────────────────
// Mounted before the bare /:id so the literal sub-path doesn't get caught by
// the param route's handler in some Express versions.
professionalsRouter.get(
  "/:id/reviews",
  asyncHandler(async (req, res) => {
    const query = listProfessionalReviewsQuery.parse(req.query);
    // `!`: the route pattern guarantees the param; noUncheckedIndexedAccess
    // just can't see that.
    const result = await listProfessionalReviews(req.params.id!, query);
    res.status(200).json(result);
  }),
);

// ── GET /professionals/:id ───────────────────────────────────────────────────
professionalsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await svc.getProfessional(req.params.id!);
    res.status(200).json({ item });
  }),
);
