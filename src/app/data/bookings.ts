import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface BookingReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface Booking {
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
  scheduledAt: string; // ISO
  status: BookingStatus;
  priceCents: number | null;
  address: string;
  description: string;
  createdAt: string;
  review: BookingReview | null;
}

export interface ListBookingsResult {
  items: Booking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateBookingInput {
  professionalId: string;
  scheduledAt: string; // ISO
  address: string;
  description: string;
}

/* ─── one-shot mutators ──────────────────────────────────────────────────── */

export function createBooking(input: CreateBookingInput): Promise<Booking> {
  return api
    .post<{ item: Booking }>("/bookings", input)
    .then((r) => r.item);
}

export function cancelBooking(id: string): Promise<Booking> {
  return api
    .patch<{ item: Booking }>(`/bookings/${encodeURIComponent(id)}/cancel`)
    .then((r) => r.item);
}

export function confirmBooking(id: string): Promise<Booking> {
  return api
    .patch<{ item: Booking }>(`/bookings/${encodeURIComponent(id)}/confirm`)
    .then((r) => r.item);
}

export function completeBooking(id: string): Promise<Booking> {
  return api
    .patch<{ item: Booking }>(`/bookings/${encodeURIComponent(id)}/complete`)
    .then((r) => r.item);
}

/* ─── hook: current user's bookings ──────────────────────────────────────── */

interface HookState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Builds a self-refetching list hook for either `/bookings/me` (customer)
 * or `/bookings/professional/me` (professional). The two endpoints have
 * identical response shapes, so they share the hook plumbing.
 */
function useBookingsList(path: string): HookState<ListBookingsResult> & {
  refetch: () => void;
} {
  const [state, setState] = useState<HookState<ListBookingsResult>>({
    data: null,
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get<ListBookingsResult>(path, { signal: ctrl.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof ApiError ? err.message : "Rezervasyonlar yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => ctrl.abort();
  }, [path, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refetch };
}

/** Current user's bookings, as a customer (services they're receiving). */
export function useMyBookings() {
  return useBookingsList("/bookings/me");
}

/** Current user's bookings, as a professional (services they're providing). */
export function useProfessionalBookings() {
  return useBookingsList("/bookings/professional/me");
}
