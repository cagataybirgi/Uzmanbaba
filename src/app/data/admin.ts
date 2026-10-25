import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type Query } from "../lib/api";
import type { BookingStatus } from "./bookings";
import type { PaymentStatus } from "./payments";

/* ─── types ──────────────────────────────────────────────────────────────── *
 * Mirror backend/src/modules/admin/admin.dto.ts. Keep these in lock-step.
 * ─────────────────────────────────────────────────────────────────────── */

export interface PartySummary {
  id: string;
  name: string;
  email: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountType: "customer" | "professional";
  isAdmin: boolean;
  emailVerified: boolean;
  specialty: string | null;
  location: string;
  bookingsCount: number;
  createdAt: string;
}

export interface AdminBooking {
  id: string;
  status: BookingStatus;
  service: string;
  scheduledAt: string;
  priceCents: number | null;
  paidAt: string | null;
  /** Overrides "paid" once money went back, as on the user dashboard. */
  refund: "pending" | "done" | null;
  cancelledBy: "customer" | "professional" | null;
  cancelledAt: string | null;
  createdAt: string;
  customer: PartySummary;
  professional: PartySummary;
}

/**
 * refund_unknown: a refund call broke mid-flight, result unknown.
 * refund_failed: booking cancelled but the money is still with us.
 */
export type AttentionReason = "refund_unknown" | "refund_failed";

export interface AdminPayment {
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
    cancelledBy: "customer" | "professional" | null;
    customer: PartySummary;
    professional: PartySummary;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminSummary {
  users: { total: number; professionals: number };
  bookings: Record<BookingStatus, number>;
  attention: Record<AttentionReason, number>;
}

export type ResolveAction = "mark_refunded" | "retry_refund";

export interface ResolveResult {
  item: AdminPayment;
  /** Only for retry_refund: what the new attempt did. */
  refund?: {
    outcome: "refunded" | "already_refunded" | "failed" | "unknown" | "not_refundable";
    errorMessage?: string;
  };
}

/* ─── calls ──────────────────────────────────────────────────────────────── */

export function resolvePayment(
  id: string,
  action: ResolveAction,
  note?: string,
): Promise<ResolveResult> {
  return api.post<ResolveResult>(`/admin/payments/${encodeURIComponent(id)}/resolve`, {
    action,
    note: note || undefined,
  });
}

/* ─── hooks ──────────────────────────────────────────────────────────────── */

interface HookState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * GET with abort-on-change and a refetch handle — the same plumbing as the
 * bookings hooks. `query` is serialised into the dependency key, so callers
 * can pass a fresh object literal every render.
 */
function useAdminGet<T>(path: string, query?: Query): HookState<T> & { refetch: () => void } {
  const [state, setState] = useState<HookState<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const inFlight = useRef<AbortController | null>(null);
  const key = JSON.stringify(query ?? {});

  useEffect(() => {
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get<T>(path, { query: JSON.parse(key) as Query, signal: ctrl.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof ApiError ? err.message : "Veriler yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => ctrl.abort();
  }, [path, key, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refetch };
}

export function useAdminSummary() {
  const r = useAdminGet<{ summary: AdminSummary }>("/admin/summary");
  return { ...r, data: r.data?.summary ?? null };
}

export function useAdminUsers(query: {
  q?: string;
  accountType?: "customer" | "professional";
  page: number;
}) {
  return useAdminGet<Paginated<AdminUser>>("/admin/users", query);
}

export function useAdminBookings(query: { q?: string; status?: BookingStatus; page: number }) {
  return useAdminGet<Paginated<AdminBooking>>("/admin/bookings", query);
}

export function useAdminPayments(query: {
  status?: PaymentStatus;
  attention?: boolean;
  page: number;
}) {
  return useAdminGet<Paginated<AdminPayment>>("/admin/payments", query);
}
