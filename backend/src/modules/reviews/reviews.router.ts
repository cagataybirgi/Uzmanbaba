import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { createReviewSchema } from "./reviews.schemas.js";
import * as svc from "./reviews.service.js";

export const reviewsRouter = Router();

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// ── POST /reviews ───────────────────────────────────────────────────────────
reviewsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createReviewSchema.parse(req.body);
    const item = await svc.createReview(req.auth!.sub, input);
    res.status(201).json({ item });
  }),
);
