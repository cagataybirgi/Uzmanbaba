import type { User } from "@prisma/client";
import { config } from "../../config.js";

/**
 * Public-facing user shape, matching the AuthContext `User` interface in the
 * frontend. Notably: no passwordHash, ever. Dates are formatted in Turkish
 * month/year style so the dashboard can render `user.joinDate` directly.
 */
export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountType: "customer" | "professional";
  emailVerified: boolean;
  avatar: string;
  location: string;
  specialty?: string;
  bio?: string;
  joinDate: string;
  rating?: number;
  completedJobs: number;
  pendingJobs: number;
  notifications: NotificationPrefs;
}

const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function formatJoinDate(d: Date): string {
  const month = TR_MONTHS[d.getMonth()] ?? "";
  return `${month} ${d.getFullYear()}`;
}

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";

/**
 * Avatars stored as relative `/uploads/...` paths get prefixed with the
 * backend's public origin so the frontend can use them as `<img src>` from a
 * different origin. External URLs (Unsplash etc.) pass through unchanged.
 */
function publicAvatar(raw: string): string {
  if (!raw) return DEFAULT_AVATAR;
  if (raw.startsWith("/")) return `${config.PUBLIC_BASE_URL}${raw}`;
  return raw;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    accountType: user.accountType,
    emailVerified: user.emailVerified,
    avatar: publicAvatar(user.avatar),
    location: user.location || "Türkiye",
    specialty: user.specialty ?? undefined,
    bio: user.bio ?? undefined,
    joinDate: formatJoinDate(user.createdAt),
    rating: user.rating ?? undefined,
    completedJobs: user.completedJobs,
    pendingJobs: user.pendingJobs,
    notifications: {
      email: user.notifyEmail,
      sms: user.notifySms,
      push: user.notifyPush,
    },
  };
}
