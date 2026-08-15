import type { User } from "@prisma/client";
import { config } from "../../config.js";

/**
 * Public-facing professional shape, matching the frontend's `Professional`
 * type in components/ProfessionalCard.tsx. Built from a User row that has
 * `accountType = professional`.
 *
 * - `title` is sourced from `specialty` (the registration form labels it
 *   "Uzmanlık alanı" and the card calls it "title" — same concept).
 * - `rating` defaults to 0 so the UI doesn't have to guard for null.
 */
export interface ProfessionalDto {
  id: string;
  name: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  available: boolean;
  avatar: string;
  // Detail-page extras. They're cheap to read off the User row that's already
  // in scope, and keeping one DTO for list + detail avoids an n+1 if any
  // listing UI wants to show them later (e.g. a hover card).
  bio: string | null;
  completedJobs: number;
  joinDate: string;
}

const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function formatJoinDate(d: Date): string {
  return `${TR_MONTHS[d.getMonth()] ?? ""} ${d.getFullYear()}`;
}

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400";

function publicAvatar(raw: string): string {
  if (!raw) return DEFAULT_AVATAR;
  if (raw.startsWith("/")) return `${config.PUBLIC_BASE_URL}${raw}`;
  return raw;
}

export function toProfessionalDto(user: User): ProfessionalDto {
  return {
    id: user.id,
    name: user.name,
    title: user.specialty ?? "Uzman",
    location: user.location || "Türkiye",
    rating: user.rating ?? 0,
    reviews: user.reviewsCount,
    available: user.available,
    avatar: publicAvatar(user.avatar),
    bio: user.bio,
    completedJobs: user.completedJobs,
    joinDate: formatJoinDate(user.createdAt),
  };
}

export interface ListProfessionalsResponse {
  items: ProfessionalDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Aggregates the public site may present as factual trust metrics. */
export interface ProfessionalStatsDto {
  emailVerifiedProfessionals: number;
  citiesServed: number;
  averageRating: number | null;
  completedJobs: number;
}
