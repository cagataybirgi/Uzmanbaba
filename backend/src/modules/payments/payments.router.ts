import express, {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { config } from "../../config.js";
import { logger } from "../../logger.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  paymentCallbackLimiter,
  paymentCheckoutLimiter,
} from "../../middleware/rateLimit.js";
import { callbackBody, checkoutParams, paymentParams } from "./payments.schemas.js";
import * as svc from "./payments.service.js";

export const paymentsRouter = Router();

/**
 * The iyzico return leg, mounted by app.ts at /api/payments/callback ahead
 * of the CORS middleware — see the note there for why.
 */
export const paymentsCallbackRouter = Router();

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };

/** Where the customer lands after iyzico hands them back to us. */
function resultUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${config.APP_URL}/odeme/sonuc${qs ? `?${qs}` : ""}`;
}

// ── POST /payments/checkout/:bookingId ──────────────────────────────────────
// Customer starts paying for a confirmed, quoted booking. Returns the hosted
// page URL; the browser is sent there by the frontend.
paymentsRouter.post(
  "/checkout/:bookingId",
  requireAuth,
  paymentCheckoutLimiter,
  asyncHandler(async (req, res) => {
    const { bookingId } = checkoutParams.parse(req.params);
    const session = await svc.startCheckout(
      req.auth!.sub,
      bookingId,
      req.ip ?? "",
    );
    res.status(201).json({ session });
  }),
);

// ── POST /payments/callback ─────────────────────────────────────────────────
// iyzico posts `token` here as a form submission FROM THE CUSTOMER'S BROWSER
// once the hosted page finishes (success or failure). Consequences:
//   - there's no Bearer token, so no requireAuth;
//   - the body is application/x-www-form-urlencoded, not JSON;
//   - it arrives with a foreign Origin, so it lives outside CORS (app.ts).
// Nothing in this request is trusted: the service calls iyzico back to learn
// the real outcome. Whatever happens, the customer is redirected to the
// result page — an API error body would be a dead end for them.
paymentsCallbackRouter.post(
  "/",
  paymentCallbackLimiter,
  express.urlencoded({ extended: false, limit: "10kb" }),
  async (req, res) => {
    const parsed = callbackBody.safeParse(req.body);
    if (!parsed.success) {
      res.redirect(303, resultUrl({ status: "error" }));
      return;
    }
    try {
      const payment = await svc.handleCallback(parsed.data.token);
      res.redirect(303, resultUrl({ payment: payment.id }));
    } catch (err) {
      logger.error("payment callback failed", { err: String(err) });
      res.redirect(303, resultUrl({ status: "error" }));
    }
  },
);

// A customer who lands here with GET (typed the URL, refreshed a POST result)
// gets sent to the result page rather than a 404.
paymentsCallbackRouter.get("/", (_req, res) => {
  res.redirect(303, resultUrl({ status: "error" }));
});

// ── GET /payments/:id ───────────────────────────────────────────────────────
// The result page reads the outcome from here (never from the URL). Also the
// self-healing path: a pending payment is reconciled against iyzico.
paymentsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = paymentParams.parse(req.params);
    const item = await svc.getPayment(req.auth!.sub, id);
    res.status(200).json({ item });
  }),
);
