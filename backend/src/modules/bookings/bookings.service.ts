import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { AppError } from "../../errors.js";
import {
  BOOKING_PAYMENTS_INCLUDE,
  toBookingDto,
  type BookingDto,
  type ListBookingsResponse,
} from "./bookings.dto.js";
import { logger } from "../../logger.js";
import { paymentRefunder } from "../payments/payments.refunds.js";
import {
  notifyBookingCancelled,
  notifyBookingConfirmed,
  notifyBookingQuoted,
  notifyBookingRequested,
  notifyPaymentRefunded,
} from "./bookings.notifications.js";
import type {
  CreateBookingInput,
  ListMyBookingsQuery,
  QuoteBookingInput,
} from "./bookings.schemas.js";

/* ─── create ──────────────────────────────────────────────────────────────── */

export async function createBooking(
  customerId: string,
  input: CreateBookingInput,
): Promise<BookingDto> {
  // Customer can't book themselves.
  if (customerId === input.professionalId) {
    throw AppError.badRequest("Kendinize rezervasyon oluşturamazsınız.");
  }

  const professional = await prisma.user.findFirst({
    where: { id: input.professionalId, accountType: "professional" },
  });
  if (!professional) {
    throw AppError.notFound("Uzman bulunamadı.");
  }

  // Snapshot the specialty so a later rename of the professional doesn't
  // mutate the historical record on the customer's invoice.
  const service = professional.specialty ?? "Uzman Hizmeti";

  const created = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        customerId,
        professionalId: input.professionalId,
        service,
        scheduledAt: new Date(input.scheduledAt),
        address: input.address,
        description: input.description,
        status: "pending",
      },
      include: { customer: true, professional: true, review: true, payments: BOOKING_PAYMENTS_INCLUDE },
    });

    // Keep the customer's pendingJobs counter in step. We only bump it on
    // create and decrement on cancel — the dashboard displays it as
    // "currently active". Drift is bounded by the matching decrement path.
    await tx.user.update({
      where: { id: customerId },
      data: { pendingJobs: { increment: 1 } },
    });

    return booking;
  });

  notifyBookingRequested(created.id);
  return toBookingDto(created);
}

/* ─── list (current user's bookings, as customer) ────────────────────────── */

export async function listMyBookings(
  customerId: string,
  query: ListMyBookingsQuery,
): Promise<ListBookingsResponse> {
  const where: Prisma.BookingWhereInput = { customerId };
  if (query.status) where.status = query.status;

  const skip = (query.page - 1) * query.pageSize;

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip,
      take: query.pageSize,
      include: { customer: true, professional: true, review: true, payments: BOOKING_PAYMENTS_INCLUDE },
    }),
  ]);

  return {
    items: rows.map(toBookingDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/* ─── list (current user's bookings, as professional) ───────────────────── */

export async function listProfessionalBookings(
  professionalId: string,
  query: ListMyBookingsQuery,
): Promise<ListBookingsResponse> {
  const where: Prisma.BookingWhereInput = { professionalId };
  if (query.status) where.status = query.status;

  const skip = (query.page - 1) * query.pageSize;

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip,
      take: query.pageSize,
      include: { customer: true, professional: true, review: true, payments: BOOKING_PAYMENTS_INCLUDE },
    }),
  ]);

  return {
    items: rows.map(toBookingDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/* ─── shared helpers ──────────────────────────────────────────────────────── */

const BOOKING_INCLUDE = {
  customer: true,
  professional: true,
  review: true,
  payments: BOOKING_PAYMENTS_INCLUDE,
} as const;

/* ─── cancel ──────────────────────────────────────────────────────────────── */

export async function cancelBooking(
  userId: string,
  bookingId: string,
): Promise<BookingDto> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: BOOKING_INCLUDE,
  });
  if (!booking) throw AppError.notFound("Rezervasyon bulunamadı.");

  // Either party may cancel their own booking.
  if (booking.customerId !== userId && booking.professionalId !== userId) {
    throw AppError.forbidden("Bu rezervasyonu iptal edemezsiniz.");
  }

  if (booking.status === "cancelled") return toBookingDto(booking);
  if (booking.status === "completed") {
    throw AppError.badRequest("Tamamlanan rezervasyon iptal edilemez.");
  }

  // Refund policy (/iade-politikasi): every cancellation before the job
  // starts is a full refund. Once the appointment time has passed on a paid
  // booking, the work may have been done, so the customer can no longer
  // undo it with one click: it goes through support instead. The
  // professional can still cancel, which gives the customer their money
  // back.
  const cancelledBy = booking.customerId === userId ? "customer" : "professional";
  if (
    cancelledBy === "customer" &&
    booking.paidAt &&
    booking.scheduledAt.getTime() <= Date.now()
  ) {
    throw AppError.badRequest(
      "Randevu saati geçmiş, ödenmiş bir rezervasyonu iptal edemezsin. Bir sorun varsa destek ekibimize yaz.",
    );
  }

  const { updated, won } = await prisma.$transaction(async (tx) => {
    // Atomic guard: the status predicate is part of the WHERE, so of two
    // concurrent transitions only one gets count === 1. Without it, both
    // could pass the read-check above and each decrement pendingJobs.
    const res = await tx.booking.updateMany({
      where: { id: bookingId, status: { in: ["pending", "confirmed"] } },
      data: { status: "cancelled", cancelledBy, cancelledAt: new Date() },
    });
    if (res.count === 1) {
      await tx.user.update({
        where: { id: booking.customerId },
        data: { pendingJobs: { decrement: 1 } },
      });
    }
    const updated = await tx.booking.findUnique({
      where: { id: bookingId },
      include: BOOKING_INCLUDE,
    });
    return { updated, won: res.count === 1 };
  });
  // Only the request that actually flipped the status tells the other side.
  if (won) notifyBookingCancelled(bookingId);

  // Cancelling is allowed after payment; the money goes back in full. Done
  // after the commit so a rolled-back cancel can never have refunded. The
  // refunder never throws for iyzico trouble and logs anything that needs a
  // human, so the cancellation itself always stands.
  if (booking.paidAt) {
    const refunds = await paymentRefunder.refundBooking(bookingId, {
      reason: "booking_cancelled",
      requestedBy: userId,
    });
    for (const refund of refunds) {
      if (refund.outcome === "refunded") notifyPaymentRefunded(refund.paymentId);
    }
    // Re-read so the response already carries the refund state.
    const refunded = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: BOOKING_INCLUDE,
    });
    return toBookingDto(refunded!);
  }

  return toBookingDto(updated!);
}

/* ─── confirm (professional only) ─────────────────────────────────────────── */

export async function confirmBooking(
  userId: string,
  bookingId: string,
): Promise<BookingDto> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: BOOKING_INCLUDE,
  });
  if (!booking) throw AppError.notFound("Rezervasyon bulunamadı.");

  if (booking.professionalId !== userId) {
    throw AppError.forbidden("Bu rezervasyonu onaylayamazsınız.");
  }

  if (booking.status === "confirmed") return toBookingDto(booking);
  if (booking.status !== "pending") {
    throw AppError.badRequest("Yalnızca bekleyen rezervasyonlar onaylanabilir.");
  }

  // Guarded transition — a concurrent confirm/cancel can't both win.
  const res = await prisma.booking.updateMany({
    where: { id: bookingId, status: "pending" },
    data: { status: "confirmed" },
  });
  if (res.count === 1) notifyBookingConfirmed(bookingId);
  const updated = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: BOOKING_INCLUDE,
  });
  return toBookingDto(updated!);
}

/* ─── quote (professional only) ───────────────────────────────────────────── */

// How long an iyzico checkout-form token stays payable after init (iyzico
// returns tokenExpireTime = 1800s). A checkout younger than this may still
// be completed by the customer.
const CHECKOUT_TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * The professional names a price. Allowed while the booking is unpaid and
 * not cancelled — including after completion, so a job finished before it
 * was priced can still be billed. Once money has moved the amount is frozen
 * so what the customer paid always matches what the row says.
 */
export async function quoteBooking(
  userId: string,
  bookingId: string,
  input: QuoteBookingInput,
): Promise<BookingDto> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: BOOKING_INCLUDE,
  });
  if (!booking) throw AppError.notFound("Rezervasyon bulunamadı.");

  if (booking.professionalId !== userId) {
    throw AppError.forbidden("Bu rezervasyona fiyat veremezsiniz.");
  }
  if (booking.paidAt) {
    throw AppError.badRequest("Ödenmiş rezervasyonun fiyatı değiştirilemez.");
  }
  if (booking.status === "cancelled") {
    throw AppError.badRequest("İptal edilmiş rezervasyona fiyat verilemez.");
  }

  // A re-quote while the customer has iyzico's form open would let them pay
  // the old amount for a booking that now says something else. Superseded
  // attempts count: their token stays payable until it expires.
  const liveCheckout = await prisma.payment.findFirst({
    where: {
      bookingId,
      token: { not: null },
      createdAt: { gt: new Date(Date.now() - CHECKOUT_TOKEN_TTL_MS) },
      OR: [{ status: "pending" }, { status: "failed", errorCode: "superseded" }],
    },
    select: { id: true },
  });
  if (liveCheckout) {
    throw AppError.conflict(
      "Müşteri şu anda ödeme sayfasında. Fiyatı en geç 30 dakika sonra değiştirebilirsin.",
    );
  }

  // Same guard in the WHERE so a payment landing between the read above and
  // this write can't have its amount pulled out from under it.
  const res = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      paidAt: null,
      status: { in: ["pending", "confirmed", "completed"] },
    },
    data: { priceCents: input.priceCents },
  });
  if (res.count === 0) {
    throw AppError.conflict("Rezervasyon bu sırada değişti. Lütfen sayfayı yenileyin.");
  }
  // Re-sending the same number would be noise, not news.
  if (booking.priceCents !== input.priceCents) notifyBookingQuoted(bookingId);

  const updated = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: BOOKING_INCLUDE,
  });
  return toBookingDto(updated!);
}

/* ─── complete (professional only) ────────────────────────────────────────── */

export async function completeBooking(
  userId: string,
  bookingId: string,
): Promise<BookingDto> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: BOOKING_INCLUDE,
  });
  if (!booking) throw AppError.notFound("Rezervasyon bulunamadı.");

  if (booking.professionalId !== userId) {
    throw AppError.forbidden("Bu rezervasyonu tamamlayamazsınız.");
  }

  if (booking.status === "completed") return toBookingDto(booking);
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    throw AppError.badRequest("Sadece aktif rezervasyonlar tamamlanabilir.");
  }

  // Counter housekeeping:
  //   - customer.pendingJobs--      (booking is no longer "active")
  //   - customer.completedJobs++    ("hizmet aldım")
  //   - professional.completedJobs++ ("hizmet verdim")
  // Done in the same transaction as the status flip so the counters can't
  // diverge from the booking row.
  const updated = await prisma.$transaction(async (tx) => {
    // Atomic guard so two concurrent completes can't both bump the counters
    // (which would push completedJobs to 2 and pendingJobs to -1).
    const res = await tx.booking.updateMany({
      where: { id: bookingId, status: { in: ["pending", "confirmed"] } },
      data: { status: "completed" },
    });

    if (res.count === 1) {
      await tx.user.update({
        where: { id: booking.customerId },
        data: {
          pendingJobs: { decrement: 1 },
          completedJobs: { increment: 1 },
        },
      });
      await tx.user.update({
        where: { id: booking.professionalId },
        data: { completedJobs: { increment: 1 } },
      });
    }

    return tx.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
  });

  return toBookingDto(updated!);
}
