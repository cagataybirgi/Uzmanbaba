import type { BookingStatus, Payment, Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { logger } from "../../logger.js";
import { AppError } from "../../errors.js";
import { BOOKING_STATUSES } from "../bookings/bookings.schemas.js";
import { BOOKING_PAYMENTS_INCLUDE } from "../bookings/bookings.dto.js";
import { paymentRefunder, type RefundResult } from "../payments/payments.refunds.js";
import {
  attentionReason,
  toAdminBookingDto,
  toAdminPaymentDto,
  toAdminUserDto,
  type AdminBookingDto,
  type AdminPaymentDto,
  type AdminSummaryDto,
  type AdminUserDto,
  type Paginated,
} from "./admin.dto.js";
import type {
  ListBookingsQuery,
  ListPaymentsQuery,
  ListUsersQuery,
  ResolvePaymentInput,
} from "./admin.schemas.js";

/**
 * A refund call can legitimately take a while (iyzico's transport retries
 * plus a 20 s timeout). A `refunding` row younger than this may still be in
 * flight, so the admin can't resolve it yet — doing so could send the money
 * back twice.
 */
export const STUCK_AFTER_MS = 5 * 60_000;

/** Payments someone has to act on. Mirrors attentionReason in admin.dto. */
const ATTENTION_WHERE: Prisma.PaymentWhereInput = {
  OR: [
    { status: "refunding" },
    { status: "succeeded", booking: { status: "cancelled" } },
  ],
};

const PAYMENT_INCLUDE = {
  booking: { include: { customer: true, professional: true } },
} as const;

function paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

/* ─── summary ───────────────────────────────────────────────────────────── */

export async function getSummary(): Promise<AdminSummaryDto> {
  const [users, professionals, byStatus, refunding, heldOnCancelled] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { accountType: "professional" } }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.count({ where: { status: "refunding" } }),
    prisma.payment.count({ where: { status: "succeeded", booking: { status: "cancelled" } } }),
  ]);

  const bookings = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<
    BookingStatus,
    number
  >;
  for (const row of byStatus) bookings[row.status] = row._count._all;

  return {
    users: { total: users, professionals },
    bookings,
    attention: { refund_unknown: refunding, refund_failed: heldOnCancelled },
  };
}

/* ─── lists ─────────────────────────────────────────────────────────────── */

export async function listUsers(query: ListUsersQuery): Promise<Paginated<AdminUserDto>> {
  const where: Prisma.UserWhereInput = {};
  if (query.accountType) where.accountType = query.accountType;
  if (query.q) where.OR = [{ name: contains(query.q) }, { email: contains(query.q) }];

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { _count: { select: { bookingsAsCustomer: true, bookingsAsProfessional: true } } },
    }),
  ]);
  return paginate(rows.map(toAdminUserDto), total, query.page, query.pageSize);
}

export async function listBookings(query: ListBookingsQuery): Promise<Paginated<AdminBookingDto>> {
  const where: Prisma.BookingWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    const person = { OR: [{ name: contains(query.q) }, { email: contains(query.q) }] };
    where.OR = [{ customer: person }, { professional: person }, { service: contains(query.q) }];
  }

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { customer: true, professional: true, payments: BOOKING_PAYMENTS_INCLUDE },
    }),
  ]);
  return paginate(rows.map(toAdminBookingDto), total, query.page, query.pageSize);
}

export async function listPayments(query: ListPaymentsQuery): Promise<Paginated<AdminPaymentDto>> {
  const where: Prisma.PaymentWhereInput = query.attention ? { ...ATTENTION_WHERE } : {};
  if (query.status) where.status = query.status;

  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      // Oldest first when triaging, so nothing waits forever; newest first otherwise.
      orderBy: { updatedAt: query.attention ? "asc" : "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: PAYMENT_INCLUDE,
    }),
  ]);
  return paginate(rows.map(toAdminPaymentDto), total, query.page, query.pageSize);
}

/* ─── resolving a payment ───────────────────────────────────────────────── */

/**
 * Keeps an audit trail of admin decisions inside rawResult, next to the
 * iyzico payloads they were made about.
 */
function withAdminAction(
  payment: Payment,
  entry: Record<string, unknown>,
): Prisma.InputJsonValue {
  const previous =
    payment.rawResult && typeof payment.rawResult === "object" && !Array.isArray(payment.rawResult)
      ? (payment.rawResult as Record<string, unknown>)
      : {};
  const actions = Array.isArray(previous.adminActions) ? previous.adminActions : [];
  return { ...previous, adminActions: [...actions, entry] } as Prisma.InputJsonValue;
}

export interface ResolvePaymentResult {
  item: AdminPaymentDto;
  /** Set for retry_refund: what the new refund attempt did. */
  refund?: RefundResult;
}

/**
 * Settles a payment from the "needs attention" list, once the admin has
 * looked at the iyzico panel:
 *
 *   - mark_refunded: the money already went back (the lost call did reach
 *     iyzico, or the admin refunded by hand in the panel). Only records it.
 *   - retry_refund: the panel shows no refund. Puts the row back to
 *     succeeded and runs the normal refunder again.
 *
 * Both moves are guarded on the status the admin saw, so two admins (or an
 * admin and a late refunder) can't act on the same row twice.
 */
export async function resolvePayment(
  adminId: string,
  paymentId: string,
  input: ResolvePaymentInput,
): Promise<ResolvePaymentResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { select: { status: true } } },
  });
  if (!payment) throw AppError.notFound("Ödeme bulunamadı.");

  const reason = attentionReason(payment, payment.booking.status);
  if (!reason) {
    throw AppError.conflict("Bu ödeme için yapılacak bir işlem yok.");
  }
  if (
    payment.status === "refunding" &&
    Date.now() - payment.updatedAt.getTime() < STUCK_AFTER_MS
  ) {
    throw AppError.conflict(
      "İade hâlâ işleniyor olabilir. Birkaç dakika sonra tekrar deneyin.",
    );
  }

  const audit = withAdminAction(payment, {
    action: input.action,
    note: input.note ?? null,
    by: adminId,
    at: new Date().toISOString(),
    fromStatus: payment.status,
  });
  const log = { paymentId, bookingId: payment.bookingId, adminId, action: input.action, reason };

  if (input.action === "mark_refunded") {
    const done = await prisma.payment.updateMany({
      where: { id: paymentId, status: payment.status },
      data: {
        status: "refunded",
        refundedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        rawResult: audit,
      },
    });
    if (done.count === 0) throw AppError.conflict("Ödeme bu sırada değişti. Sayfayı yenileyin.");
    logger.info("admin marked payment refunded", log);
    return { item: await loadAdminPayment(paymentId) };
  }

  // retry_refund. A stuck row goes back to succeeded first — the refunder
  // only ever claims succeeded rows, which is what keeps it single-shot.
  const reset = await prisma.payment.updateMany({
    where: { id: paymentId, status: payment.status },
    data: { status: "succeeded", rawResult: audit },
  });
  if (reset.count === 0) throw AppError.conflict("Ödeme bu sırada değişti. Sayfayı yenileyin.");

  const fresh = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  const refund = await paymentRefunder.refundPayment(fresh, {
    reason: "admin_retry",
    requestedBy: adminId,
  });
  logger.info("admin retried refund", { ...log, outcome: refund.outcome });
  return { item: await loadAdminPayment(paymentId), refund };
}

async function loadAdminPayment(id: string): Promise<AdminPaymentDto> {
  const row = await prisma.payment.findUniqueOrThrow({ where: { id }, include: PAYMENT_INCLUDE });
  return toAdminPaymentDto(row);
}
