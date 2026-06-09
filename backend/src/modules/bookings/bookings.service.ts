import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { AppError } from "../../errors.js";
import {
  toBookingDto,
  type BookingDto,
  type ListBookingsResponse,
} from "./bookings.dto.js";
import type {
  CreateBookingInput,
  ListMyBookingsQuery,
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
      include: { customer: true, professional: true, review: true },
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
      include: { customer: true, professional: true, review: true },
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
      include: { customer: true, professional: true, review: true },
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

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
      include: BOOKING_INCLUDE,
    });

    if (booking.status === "pending" || booking.status === "confirmed") {
      await tx.user.update({
        where: { id: booking.customerId },
        data: { pendingJobs: { decrement: 1 } },
      });
    }
    return next;
  });

  return toBookingDto(updated);
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

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "confirmed" },
    include: BOOKING_INCLUDE,
  });
  return toBookingDto(updated);
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
    const next = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "completed" },
      include: BOOKING_INCLUDE,
    });

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

    return next;
  });

  return toBookingDto(updated);
}
