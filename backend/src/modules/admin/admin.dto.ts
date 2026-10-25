import type {
  Booking,
  BookingParty,
  BookingStatus,
  Payment,
  PaymentStatus,
  User,
} from "@prisma/client";
import { refundState, type BookingDto } from "../bookings/bookings.dto.js";

/**
 * Shapes for the admin panel. Unlike the public DTOs these carry contact
 * details and iyzico ids — only ever sent behind requireAdmin.
 */

interface PartySummary {
  id: string;
  name: string;
  email: string;
}

function party(u: Pick<User, "id" | "name" | "email">): PartySummary {
  return { id: u.id, name: u.name, email: u.email };
}

/* ─── users ─────────────────────────────────────────────────────────────── */

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountType: "customer" | "professional";
  isAdmin: boolean;
  emailVerified: boolean;
  specialty: string | null;
  location: string;
  /** Bookings on either side: made as a customer plus received as a professional. */
  bookingsCount: number;
  createdAt: string;
}

export type AdminUserRow = User & {
  _count: { bookingsAsCustomer: number; bookingsAsProfessional: number };
};

export function toAdminUserDto(u: AdminUserRow): AdminUserDto {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    accountType: u.accountType,
    isAdmin: u.isAdmin,
    emailVerified: u.emailVerified,
    specialty: u.specialty,
    location: u.location,
    bookingsCount: u._count.bookingsAsCustomer + u._count.bookingsAsProfessional,
    createdAt: u.createdAt.toISOString(),
  };
}

/* ─── bookings ──────────────────────────────────────────────────────────── */

export interface AdminBookingDto {
  id: string;
  status: BookingStatus;
  service: string;
  scheduledAt: string;
  priceCents: number | null;
  paidAt: string | null;
  /** Same meaning as on the user-facing BookingDto: overrides "paid" once money went back. */
  refund: BookingDto["refund"];
  cancelledBy: BookingParty | null;
  cancelledAt: string | null;
  createdAt: string;
  customer: PartySummary;
  professional: PartySummary;
}

export type AdminBookingRow = Booking & {
  customer: User;
  professional: User;
  payments: Array<{ status: PaymentStatus }>;
};

export function toAdminBookingDto(b: AdminBookingRow): AdminBookingDto {
  return {
    id: b.id,
    status: b.status,
    service: b.service,
    scheduledAt: b.scheduledAt.toISOString(),
    priceCents: b.priceCents,
    paidAt: b.paidAt?.toISOString() ?? null,
    refund: refundState(b.payments),
    cancelledBy: b.cancelledBy,
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    customer: party(b.customer),
    professional: party(b.professional),
  };
}

/* ─── payments ──────────────────────────────────────────────────────────── */

/**
 * Why a payment shows up in the "needs attention" list:
 *   - refund_unknown: a refund call broke mid-flight; stuck in `refunding`
 *     until someone checks the iyzico panel.
 *   - refund_failed: the booking is cancelled but the money is still with
 *     us — iyzico refused the refund, or it was never attempted.
 */
export type AttentionReason = "refund_unknown" | "refund_failed";

export interface AdminPaymentDto {
  id: string;
  bookingId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  providerPaymentId: string | null;
  providerTransactionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  attention: AttentionReason | null;
  booking: {
    status: BookingStatus;
    service: string;
    cancelledBy: BookingParty | null;
    customer: PartySummary;
    professional: PartySummary;
  };
}

export type AdminPaymentRow = Payment & {
  booking: Booking & { customer: User; professional: User };
};

export function attentionReason(
  p: Pick<Payment, "status">,
  bookingStatus: BookingStatus,
): AttentionReason | null {
  if (p.status === "refunding") return "refund_unknown";
  if (p.status === "succeeded" && bookingStatus === "cancelled") return "refund_failed";
  return null;
}

export function toAdminPaymentDto(p: AdminPaymentRow): AdminPaymentDto {
  return {
    id: p.id,
    bookingId: p.bookingId,
    status: p.status,
    amountCents: p.amountCents,
    currency: p.currency,
    providerPaymentId: p.providerPaymentId,
    providerTransactionId: p.providerTransactionId,
    errorCode: p.errorCode,
    errorMessage: p.errorMessage,
    paidAt: p.paidAt?.toISOString() ?? null,
    refundedAt: p.refundedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    attention: attentionReason(p, p.booking.status),
    booking: {
      status: p.booking.status,
      service: p.booking.service,
      cancelledBy: p.booking.cancelledBy,
      customer: party(p.booking.customer),
      professional: party(p.booking.professional),
    },
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminSummaryDto {
  users: { total: number; professionals: number };
  bookings: Record<BookingStatus, number>;
  /** Payments that need someone to act, by reason. */
  attention: Record<AttentionReason, number>;
}
