import type { Payment, Prisma, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../prisma.js";
import { logger } from "../../logger.js";
import {
  cancelPayment,
  refundPayment,
  type ReversalResult,
} from "../../utils/iyzico.js";

/* ═══════════════════════════════════════════════════════════════════════════
 * Automatic refunds
 *
 * Gives a succeeded payment's money back to the customer. Each refund:
 *
 *   1. claims the row (succeeded → refunding) with a guarded update, so two
 *      cancellations racing each other can't both send money back;
 *   2. tries iyzico's *cancel* first — it voids the charge outright and
 *      keeps no fee, but only works before end-of-day settlement;
 *   3. falls back to *refund* on the item's paymentTransactionId when
 *      cancel is refused (the charge was already settled);
 *   4. records the outcome: refunded, or back to succeeded with the error
 *      when iyzico said no. Either way the row tells the truth.
 *
 * A transport failure (timeout, connection dropped mid-request) is the one
 * case where we can't know whether iyzico acted. The row then stays in
 * `refunding` and an error is logged: someone has to look at the iyzico
 * panel before anything is retried. Guessing either way risks paying twice
 * or never.
 *
 * Refunds are always for the full amount. Partial refunds and fee rules wait
 * for a written refund policy.
 * ═══════════════════════════════════════════════════════════════════════ */

export type RefundOutcome =
  /** Money is on its way back. */
  | "refunded"
  /** Already refunded (or being refunded) by an earlier call. Nothing sent. */
  | "already_refunded"
  /** iyzico refused both cancel and refund. Row is back to succeeded. */
  | "failed"
  /** The call broke mid-flight; check the iyzico panel. Row stays refunding. */
  | "unknown"
  /** Nothing to refund: never charged, or charged without the ids we need. */
  | "not_refundable";

export interface RefundResult {
  paymentId: string;
  outcome: RefundOutcome;
  /** "cancel" or "refund" — which iyzico call moved the money. */
  method?: "cancel" | "refund";
  errorCode?: string;
  errorMessage?: string;
}

export interface RefundOptions {
  /** Why the money goes back. Logged; never sent to the customer. */
  reason: string;
  /** Who triggered it (user id), for the log. */
  requestedBy?: string;
  /** Customer-facing IP, if the caller has one. iyzico treats it as optional. */
  ip?: string;
}

/** The two iyzico calls we need. Swappable so tests can stub them. */
export interface RefundGateway {
  cancel(
    paymentId: string,
    conversationId: string,
    ip?: string,
  ): Promise<ReversalResult>;
  refund(
    paymentTransactionId: string,
    cents: number,
    conversationId: string,
    ip?: string,
  ): Promise<ReversalResult>;
}

const iyzicoGateway: RefundGateway = {
  cancel: (...args) => cancelPayment(...args),
  refund: (...args) => refundPayment(...args),
};

export class PaymentRefunder {
  constructor(
    private readonly db: PrismaClient = defaultPrisma,
    private readonly gateway: RefundGateway = iyzicoGateway,
  ) {}

  /**
   * Refunds every succeeded payment on a booking. Normally that's one; a
   * double charge (two tabs, two tokens) leaves two, and both go back.
   * Never throws for iyzico trouble — the results say what happened.
   */
  async refundBooking(bookingId: string, options: RefundOptions): Promise<RefundResult[]> {
    const payments = await this.db.payment.findMany({
      where: { bookingId, status: "succeeded" },
      orderBy: { createdAt: "asc" },
    });
    const results: RefundResult[] = [];
    // One at a time: each is a separate money movement, and a sequential log
    // is far easier to reconcile against the iyzico panel.
    for (const payment of payments) {
      results.push(await this.refundPayment(payment, options));
    }
    return results;
  }

  /** Refunds one payment in full. Idempotent; never throws for iyzico trouble. */
  async refundPayment(payment: Payment, options: RefundOptions): Promise<RefundResult> {
    const base = { paymentId: payment.id };
    const log = {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      amountCents: payment.amountCents,
      reason: options.reason,
      requestedBy: options.requestedBy,
    };

    if (payment.status === "refunded" || payment.status === "refunding") {
      return { ...base, outcome: "already_refunded" };
    }
    if (payment.status !== "succeeded") {
      return { ...base, outcome: "not_refundable" };
    }
    if (!payment.providerPaymentId && !payment.providerTransactionId) {
      logger.error("refund impossible: payment has no iyzico ids — refund manually", log);
      return { ...base, outcome: "not_refundable" };
    }

    // The claim. Whoever flips succeeded → refunding owns the refund; anyone
    // else sees count === 0 and backs off.
    const claimed = await this.db.payment.updateMany({
      where: { id: payment.id, status: "succeeded" },
      data: { status: "refunding" },
    });
    if (claimed.count === 0) {
      return { ...base, outcome: "already_refunded" };
    }

    let method: "cancel" | "refund";
    let result: ReversalResult;
    try {
      ({ method, result } = await this.reverse(payment, options.ip));
    } catch (err) {
      logger.error("refund call failed mid-flight — check the iyzico panel", {
        ...log,
        err: String(err),
      });
      await this.db.payment.update({
        where: { id: payment.id },
        data: {
          errorCode: "refund_unknown",
          errorMessage: "İade sonucu doğrulanamadı.",
        },
      });
      return { ...base, outcome: "unknown" };
    }

    if (result.status !== "success") {
      logger.error("iyzico refused the refund — refund manually", {
        ...log,
        method,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });
      await this.db.payment.update({
        where: { id: payment.id },
        data: {
          status: "succeeded",
          errorCode: result.errorCode ?? "refund_failed",
          errorMessage: result.errorMessage ?? "İade başarısız oldu.",
        },
      });
      return {
        ...base,
        outcome: "failed",
        method,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      };
    }

    // Keep the original retrieve payload and add the reversal next to it,
    // so a dispute can see both the charge and its undoing.
    const previous =
      payment.rawResult && typeof payment.rawResult === "object" && !Array.isArray(payment.rawResult)
        ? payment.rawResult
        : {};
    await this.db.payment.update({
      where: { id: payment.id },
      data: {
        status: "refunded",
        refundedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        rawResult: { ...previous, refund: { method, ...result } } as Prisma.InputJsonValue,
      },
    });
    logger.info("payment refunded", { ...log, method });
    return { ...base, outcome: "refunded", method };
  }

  /**
   * Cancel first (free, same day only), refund if iyzico won't cancel. A
   * refused cancel moves no money, so falling through to refund is safe.
   */
  private async reverse(
    payment: Payment,
    ip: string | undefined,
  ): Promise<{ method: "cancel" | "refund"; result: ReversalResult }> {
    if (payment.providerPaymentId) {
      const cancelled = await this.gateway.cancel(payment.providerPaymentId, payment.id, ip);
      if (cancelled.status === "success" || !payment.providerTransactionId) {
        return { method: "cancel", result: cancelled };
      }
      logger.info("iyzico cancel refused, falling back to refund", {
        paymentId: payment.id,
        errorCode: cancelled.errorCode,
        errorMessage: cancelled.errorMessage,
      });
    }
    const refunded = await this.gateway.refund(
      payment.providerTransactionId!,
      payment.amountCents,
      payment.id,
      ip,
    );
    return { method: "refund", result: refunded };
  }
}

export const paymentRefunder = new PaymentRefunder();
