import type { Booking, BookingStatus, PaymentStatus, Review, User } from "@prisma/client";
import { config } from "../../config.js";
import {
  toBookingReviewDto,
  type BookingReviewDto,
} from "../reviews/reviews.dto.js";

/**
 * Booking shape the frontend works against.
 *
 * Both parties are embedded as thin summaries so the same DTO works for both
 * the customer-side list (counterparty is the professional) and the
 * professional-side list (counterparty is the customer).
 *
 * `review` is the customer's review of this booking — null if not yet
 * reviewed. Lets the dashboard show "Değerlendir" vs. "Değerlendirildi"
 * without an extra round-trip.
 *
 * Dates are ISO strings — presentation formatting is the caller's job.
 */
export interface BookingDto {
  id: string;
  customer: {
    id: string;
    name: string;
    avatar: string;
  };
  professional: {
    id: string;
    name: string;
    avatar: string;
    title: string;
  };
  service: string;
  scheduledAt: string;
  status: BookingStatus;
  priceCents: number | null;
  /** Set once a payment for this booking succeeded. */
  paidAt: string | null;
  /**
   * "pending" while the money is on its way back, "done" once iyzico took
   * it back; null when nothing was refunded or a charge still stands (a
   * refunded double charge leaves the first payment, so still just paid).
   */
  refund: "pending" | "done" | null;
  address: string;
  description: string;
  createdAt: string;
  review: BookingReviewDto | null;
}

type BookingWithParties = Booking & {
  customer: User;
  professional: User;
  review?: Review | null;
  payments?: Array<{ status: PaymentStatus }>;
};

/**
 * Include for every booking query that ends in toBookingDto: only the
 * payments that ever took money, and only their status.
 */
export const BOOKING_PAYMENTS_INCLUDE = {
  where: { status: { in: ["succeeded", "refunding", "refunded"] as PaymentStatus[] } },
  select: { status: true },
} as const;

function refundState(payments: Array<{ status: PaymentStatus }> = []): BookingDto["refund"] {
  if (payments.some((p) => p.status === "succeeded")) return null;
  if (payments.some((p) => p.status === "refunding")) return "pending";
  if (payments.some((p) => p.status === "refunded")) return "done";
  return null;
}

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";

/** Same logic as auth.dto's publicAvatar — duplicated to avoid a cycle. */
function publicAvatar(raw: string): string {
  if (!raw) return DEFAULT_AVATAR;
  if (raw.startsWith("/")) return `${config.PUBLIC_BASE_URL}${raw}`;
  return raw;
}

export function toBookingDto(b: BookingWithParties): BookingDto {
  return {
    id: b.id,
    customer: {
      id: b.customer.id,
      name: b.customer.name,
      avatar: publicAvatar(b.customer.avatar),
    },
    professional: {
      id: b.professional.id,
      name: b.professional.name,
      avatar: publicAvatar(b.professional.avatar),
      title: b.professional.specialty ?? "Uzman",
    },
    service: b.service,
    scheduledAt: b.scheduledAt.toISOString(),
    status: b.status,
    priceCents: b.priceCents,
    paidAt: b.paidAt ? b.paidAt.toISOString() : null,
    refund: refundState(b.payments),
    address: b.address,
    description: b.description,
    createdAt: b.createdAt.toISOString(),
    review: b.review ? toBookingReviewDto(b.review) : null,
  };
}

export interface ListBookingsResponse {
  items: BookingDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
