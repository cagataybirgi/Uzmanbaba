import type { Booking, Payment, PaymentStatus, Prisma, User } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { config } from "../../config.js";
import { AppError } from "../../errors.js";
import { logger } from "../../logger.js";
import {
  formatAmount,
  initializeCheckoutForm,
  paymentsConfigured,
  retrieveCheckoutForm,
  toCents,
  type CheckoutInitResult,
  type CheckoutRetrieveResult,
} from "../../utils/iyzico.js";
import {
  toPaymentDto,
  type CheckoutSessionDto,
  type PaymentDto,
} from "./payments.dto.js";
import { paymentRefunder } from "./payments.refunds.js";
import {
  notifyBookingPaid,
  notifyPaymentRefunded,
} from "../bookings/bookings.notifications.js";

/* ═══════════════════════════════════════════════════════════════════════════
 * Checkout flow
 *
 *   1. startCheckout   — customer clicks "Öde". We snapshot the amount into a
 *                        Payment row, ask iyzico for a hosted page, hand the
 *                        URL back. Nothing about money is trusted from the
 *                        client: the amount comes from Booking.priceCents.
 *   2. (customer pays on iyzico's page)
 *   3. handleCallback  — iyzico POSTs the token back through the customer's
 *                        browser. We never believe that POST on its own: we
 *                        call iyzico server-to-server (`retrieve`) and only
 *                        then flip the Payment and Booking.
 *   4. getPayment      — the result page reads the outcome from OUR database.
 *                        If the callback never landed (tab closed, network),
 *                        this call reconciles against iyzico itself, so a
 *                        successful charge can't be lost.
 * ═══════════════════════════════════════════════════════════════════════ */

const PAYMENT_INCLUDE = { booking: true } as const;
type PaymentWithBooking = Payment & { booking: Booking };

/** iyzico: "Gönderilen tokena ait ödeme bilgisi bulunamadı" — form not finished. */
const STILL_OPEN_ERROR_CODE = "5122";

const PROVIDER_ERROR = (message: string) =>
  new AppError(message, { status: 502, code: "payment_provider_error" });

/* ─── start ─────────────────────────────────────────────────────────────── */

export async function startCheckout(
  userId: string,
  bookingId: string,
  clientIp: string,
): Promise<CheckoutSessionDto> {
  if (!paymentsConfigured()) {
    throw new AppError("Ödeme sistemi henüz yapılandırılmadı.", {
      status: 503,
      code: "payments_unavailable",
    });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, professional: true },
  });
  if (!booking) throw AppError.notFound("Rezervasyon bulunamadı.");
  if (booking.customerId !== userId) {
    throw AppError.forbidden("Bu rezervasyon için ödeme yapamazsınız.");
  }
  if (booking.paidAt) {
    throw AppError.conflict("Bu rezervasyon zaten ödendi.");
  }
  // Completed counts too: a professional who finishes the job before the
  // customer pays must not leave the booking unpayable forever.
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    throw AppError.badRequest(
      "Ödeme için rezervasyonun uzman tarafından onaylanmış olması gerekir.",
    );
  }
  if (booking.priceCents === null || booking.priceCents <= 0) {
    throw AppError.badRequest("Uzman henüz bu iş için fiyat belirlemedi.");
  }
  const amountCents = booking.priceCents;

  // A fresh attempt supersedes any earlier one still sitting in `pending`
  // (customer closed the form, came back). Reconcile still honours a late
  // success on the old token — see reconcile() — so nothing paid is lost.
  const payment = await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { bookingId, status: "pending" },
      data: { status: "failed", errorCode: "superseded" },
    });
    return tx.payment.create({
      data: { bookingId, amountCents, currency: "TRY" },
    });
  });

  let result: CheckoutInitResult;
  try {
    result = await initializeCheckoutForm(
      buildInitRequest(payment, booking, clientIp),
    );
  } catch (err) {
    await markFailed(payment.id, "provider_unreachable", String(err));
    logger.error("iyzico checkout init threw", {
      paymentId: payment.id,
      err: String(err),
    });
    throw PROVIDER_ERROR("Ödeme sağlayıcısına ulaşılamadı. Lütfen tekrar deneyin.");
  }

  if (result.status !== "success" || !result.token) {
    await markFailed(payment.id, result.errorCode, result.errorMessage);
    logger.warn("iyzico checkout init rejected", {
      paymentId: payment.id,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });
    throw PROVIDER_ERROR(result.errorMessage ?? "Ödeme başlatılamadı.");
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { token: result.token },
  });

  return {
    paymentId: payment.id,
    paymentPageUrl: result.paymentPageUrl ?? null,
    checkoutFormContent: result.checkoutFormContent ?? null,
  };
}

function buildInitRequest(
  payment: Payment,
  booking: Booking & { customer: User; professional: User },
  clientIp: string,
) {
  const amount = formatAmount(payment.amountCents);
  const { name, surname } = splitName(booking.customer.name);
  const city = booking.customer.location.trim() || "Belirtilmedi";
  const gsm = normalizePhone(booking.customer.phone);

  return {
    locale: "TR" as const,
    conversationId: payment.id,
    price: amount,
    paidPrice: amount,
    currency: "TRY" as const,
    basketId: booking.id,
    paymentGroup: "PRODUCT" as const,
    callbackUrl: `${config.PUBLIC_BASE_URL}/api/payments/callback`,
    // Single payment only. Installments would make paidPrice diverge from
    // price and the amount check in reconcile() would need to allow for it.
    enabledInstallments: [1],
    buyer: {
      id: booking.customerId,
      name,
      surname,
      email: booking.customer.email,
      ...(gsm ? { gsmNumber: gsm } : {}),
      // iyzico insists on an 11-digit TCKN for Turkish buyers. We don't
      // collect it (and shouldn't, for a service booking), so send the
      // documented placeholder. Revisit if the live account is configured
      // to enforce identity checks.
      identityNumber: "11111111111",
      registrationAddress: booking.address,
      ip: normalizeIp(clientIp),
      city,
      country: "Turkey",
    },
    shippingAddress: {
      contactName: booking.customer.name,
      city,
      country: "Turkey",
      address: booking.address,
    },
    billingAddress: {
      contactName: booking.customer.name,
      city,
      country: "Turkey",
      address: booking.address,
    },
    basketItems: [
      {
        id: booking.id,
        name: booking.service,
        category1: "Hizmet",
        category2: booking.professional.specialty ?? "Uzman Hizmeti",
        itemType: "VIRTUAL" as const,
        price: amount,
      },
    ],
  };
}

/* ─── callback + reconcile ──────────────────────────────────────────────── */

/**
 * Entry point for iyzico's browser POST. Looks the token up and reconciles.
 * Returns the payment (whatever its outcome) so the router can send the
 * customer to the right result page; throws only when the token is unknown.
 */
export async function handleCallback(token: string): Promise<PaymentDto> {
  const payment = await prisma.payment.findUnique({
    where: { token },
    include: PAYMENT_INCLUDE,
  });
  if (!payment) throw AppError.notFound("Ödeme kaydı bulunamadı.");
  const settled = await reconcile(payment);
  return toPaymentDto(settled);
}

/** Statuses reconcile may still move. Anything else has already been settled. */
const UNSETTLED: PaymentStatus[] = ["pending", "failed"];

/**
 * Asks iyzico for the truth about a payment and records it. Idempotent: a
 * payment that already succeeded (or is being refunded) is returned
 * untouched, so a double-posted callback or a refreshed result page can't
 * re-run the state change. Two calls racing past that check are handled by
 * the guarded writes below: only one of them records the outcome.
 */
async function reconcile(payment: PaymentWithBooking): Promise<Payment> {
  if (!UNSETTLED.includes(payment.status)) return payment;
  if (!payment.token) return payment;

  let result: CheckoutRetrieveResult;
  try {
    result = await retrieveCheckoutForm(payment.token, payment.id);
  } catch (err) {
    logger.error("iyzico retrieve threw", {
      paymentId: payment.id,
      err: String(err),
    });
    throw PROVIDER_ERROR("Ödeme sonucu doğrulanamadı. Lütfen biraz sonra tekrar deneyin.");
  }

  const raw = result as unknown as Prisma.InputJsonValue;

  // iyzico echoes our conversationId; a mismatch means the token and the row
  // don't belong together. Treat as failed and shout — it's either a bug
  // here or someone replaying tokens.
  if (result.conversationId && result.conversationId !== payment.id) {
    logger.error("iyzico conversationId mismatch", {
      paymentId: payment.id,
      got: result.conversationId,
    });
    return markFailed(payment.id, "conversation_mismatch", "Ödeme eşleşmedi.", raw);
  }

  const charged = result.status === "success" && result.paymentStatus === "SUCCESS";
  if (!charged) {
    // 5122 = "no payment info for this token": the hosted form is still
    // open (or was abandoned), nobody has been charged or declined. That is
    // not an outcome, so the row stays pending — a later checkout will
    // supersede it, and the result page shows "still waiting" if reached.
    if (result.errorCode === STILL_OPEN_ERROR_CODE) return payment;
    return markFailed(
      payment.id,
      result.errorCode ?? result.paymentStatus ?? "not_paid",
      result.errorMessage ?? "Ödeme tamamlanmadı.",
      raw,
    );
  }

  // The charge went through — now make sure it's for what we asked. `price`
  // is what we sent; iyzico echoes it. `paidPrice` can differ only with
  // installments, which we disabled, so it's checked too.
  const priceCents = toCents(result.price);
  const paidCents = toCents(result.paidPrice ?? result.price);
  if (priceCents !== payment.amountCents || paidCents !== payment.amountCents) {
    logger.error("iyzico amount mismatch on a successful charge", {
      paymentId: payment.id,
      expected: payment.amountCents,
      priceCents,
      paidCents,
      providerPaymentId: result.paymentId,
    });
    // Money moved for the wrong amount. Keep the provider id on the row so
    // it can be refunded from the iyzico panel; don't mark the booking paid.
    return prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        errorCode: "amount_mismatch",
        errorMessage: "Ödeme tutarı beklenenle eşleşmedi.",
        providerPaymentId: result.paymentId ?? null,
        rawResult: raw,
      },
    });
  }

  const transactionId =
    result.itemTransactions?.[0]?.paymentTransactionId ??
    result.paymentItems?.[0]?.paymentTransactionId ??
    null;

  const settled = await prisma.$transaction(async (tx) => {
    const paidAt = new Date();
    // The claim. A second reconcile of the same token (iyzico posting the
    // callback twice, the result page asking at the same moment) waits on
    // this row, then finds it already succeeded and backs off. Without the
    // guard it would go on to see booking.paidAt set, take its own payment
    // for a double charge and refund the customer's only payment.
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: UNSETTLED } },
      data: {
        status: "succeeded",
        paidAt,
        providerPaymentId: result.paymentId ?? null,
        providerTransactionId: transactionId,
        errorCode: null,
        errorMessage: null,
        rawResult: raw,
      },
    });
    if (claimed.count === 0) return null;
    const updated = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    // Guarded so a second successful payment (two tabs, two tokens) can't
    // overwrite the first one's timestamp — and so we notice it happened.
    const res = await tx.booking.updateMany({
      where: { id: payment.bookingId, paidAt: null },
      data: { paidAt },
    });
    let refundReason: string | null = null;
    if (res.count === 0) {
      logger.error("booking was already paid — double charge, refunding this one", {
        bookingId: payment.bookingId,
        paymentId: payment.id,
        providerPaymentId: result.paymentId,
      });
      refundReason = "double_charge";
    }
    // The hosted form stays payable for its whole token lifetime, so a
    // customer can finish paying after either side cancelled. The money is
    // real; record it, and make sure someone sees it needs to go back.
    const booking = await tx.booking.findUnique({
      where: { id: payment.bookingId },
      select: { status: true },
    });
    if (booking?.status === "cancelled") {
      logger.error("payment landed on a cancelled booking — refunding", {
        bookingId: payment.bookingId,
        paymentId: payment.id,
        providerPaymentId: result.paymentId,
        amountCents: payment.amountCents,
      });
      refundReason = "paid_after_cancel";
    }
    return { updated, refundReason };
  });

  // Lost the claim: the other call recorded this payment. Report its result.
  if (!settled) {
    return (await prisma.payment.findUnique({ where: { id: payment.id } }))!;
  }
  const { updated, refundReason } = settled;

  // After the commit: the refunder needs the row to read as succeeded.
  if (refundReason) {
    const refund = await paymentRefunder.refundPayment(updated, { reason: refundReason });
    if (refund.outcome === "refunded") {
      notifyPaymentRefunded(updated.id);
      return (await prisma.payment.findUnique({ where: { id: updated.id } }))!;
    }
    return updated;
  }
  notifyBookingPaid(payment.bookingId, payment.amountCents);
  return updated;
}

/* ─── read ──────────────────────────────────────────────────────────────── */

export async function getPayment(
  userId: string,
  paymentId: string,
): Promise<PaymentDto> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: PAYMENT_INCLUDE,
  });
  if (!payment) throw AppError.notFound("Ödeme kaydı bulunamadı.");
  if (payment.booking.customerId !== userId) {
    throw AppError.forbidden("Bu ödemeyi görüntüleyemezsiniz.");
  }

  // Still pending when the result page asks means the callback didn't make
  // it to us. Ask iyzico directly rather than leave the customer guessing.
  const settled =
    payment.status === "pending" && payment.token
      ? await reconcile(payment)
      : payment;
  return toPaymentDto(settled);
}

/* ─── helpers ───────────────────────────────────────────────────────────── */

/**
 * Records a failed attempt — unless a concurrent call already settled the
 * payment, in which case its outcome stands and is returned as is. A late
 * failure must never overwrite a success that is already on the row.
 */
async function markFailed(
  id: string,
  errorCode: string | undefined,
  errorMessage: string | undefined,
  rawResult?: Prisma.InputJsonValue,
): Promise<Payment> {
  await prisma.payment.updateMany({
    where: { id, status: { in: UNSETTLED } },
    data: {
      status: "failed",
      errorCode: errorCode ?? "unknown",
      errorMessage: errorMessage ?? null,
      ...(rawResult !== undefined ? { rawResult } : {}),
    },
  });
  return prisma.payment.findUniqueOrThrow({ where: { id } });
}

function splitName(full: string): { name: string; surname: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "Müşteri", surname: "-" };
  if (parts.length === 1) return { name: parts[0]!, surname: "-" };
  return { name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1]! };
}

/** "+90 555 000 11 22" → "+905550001122"; anything without digits → null. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return raw.trim().startsWith("+") ? `+${digits}` : digits;
}

/** Express reports IPv4 clients as "::ffff:1.2.3.4" and localhost as "::1". */
function normalizeIp(ip: string): string {
  const v4 = ip.replace(/^::ffff:/i, "");
  return v4 === "::1" || v4 === "" ? "127.0.0.1" : v4;
}
