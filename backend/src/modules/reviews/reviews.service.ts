import { prisma } from "../../prisma.js";
import { AppError } from "../../errors.js";
import {
  toReviewDto,
  type ListReviewsResponse,
  type ReviewDto,
} from "./reviews.dto.js";
import type {
  CreateReviewInput,
  ListProfessionalReviewsQuery,
} from "./reviews.schemas.js";

/* ─── create ──────────────────────────────────────────────────────────────── */

export async function createReview(
  authorId: string,
  input: CreateReviewInput,
): Promise<ReviewDto> {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { review: true },
  });
  if (!booking) throw AppError.notFound("Rezervasyon bulunamadı.");

  // Only the customer who owns the booking may review it.
  if (booking.customerId !== authorId) {
    throw AppError.forbidden("Bu rezervasyonu değerlendiremezsiniz.");
  }
  // Reviewing makes sense only after the work is finished.
  if (booking.status !== "completed") {
    throw AppError.badRequest("Yalnızca tamamlanan rezervasyonlar değerlendirilebilir.");
  }
  // Unique constraint on bookingId would catch this too, but a friendly 409
  // is nicer than a Prisma error code surfaced as 500.
  if (booking.review) {
    throw AppError.conflict("Bu rezervasyon zaten değerlendirilmiş.");
  }

  const created = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        bookingId: input.bookingId,
        authorId,
        professionalId: booking.professionalId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
      include: { author: true },
    });

    // Recompute the professional's aggregates from scratch — cheaper than
    // running the math in JS and getting it wrong, and it self-heals if
    // anything ever drifts.
    const agg = await tx.review.aggregate({
      where: { professionalId: booking.professionalId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.user.update({
      where: { id: booking.professionalId },
      data: {
        rating: agg._avg.rating ?? null,
        reviewsCount: agg._count._all,
      },
    });

    return review;
  });

  return toReviewDto(created);
}

/* ─── list by professional ────────────────────────────────────────────────── */

export async function listProfessionalReviews(
  professionalId: string,
  query: ListProfessionalReviewsQuery,
): Promise<ListReviewsResponse> {
  // 404 if the pro doesn't exist — keeps the contract symmetrical with the
  // detail endpoint and prevents leaking which UUIDs are valid via a hit/miss
  // on the reviews list.
  const pro = await prisma.user.findFirst({
    where: { id: professionalId, accountType: "professional" },
    select: { id: true },
  });
  if (!pro) throw AppError.notFound("Uzman bulunamadı.");

  const skip = (query.page - 1) * query.pageSize;

  const [total, rows] = await Promise.all([
    prisma.review.count({ where: { professionalId } }),
    prisma.review.findMany({
      where: { professionalId },
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
      include: { author: true },
    }),
  ]);

  return {
    items: rows.map(toReviewDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
