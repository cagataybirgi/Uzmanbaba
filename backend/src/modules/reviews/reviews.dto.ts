import type { Review, User } from "@prisma/client";
import { config } from "../../config.js";

/**
 * Public review shape. The author is embedded as a thin summary so the
 * professional's reviews page can render without an extra fetch per row.
 */
export interface ReviewDto {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
}

/**
 * Slimmer shape used when embedding a review inside a BookingDto — the
 * customer is reading their own bookings, no need to repeat themselves.
 */
export interface BookingReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";

function publicAvatar(raw: string): string {
  if (!raw) return DEFAULT_AVATAR;
  if (raw.startsWith("/")) return `${config.PUBLIC_BASE_URL}${raw}`;
  return raw;
}

type ReviewWithAuthor = Review & { author: User };

export function toReviewDto(r: ReviewWithAuthor): ReviewDto {
  return {
    id: r.id,
    bookingId: r.bookingId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    author: {
      id: r.author.id,
      name: r.author.name,
      avatar: publicAvatar(r.author.avatar),
    },
  };
}

export function toBookingReviewDto(r: Review): BookingReviewDto {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
  };
}

export interface ListReviewsResponse {
  items: ReviewDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
