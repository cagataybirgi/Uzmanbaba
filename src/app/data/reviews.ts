import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

export interface Review {
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

export interface ListReviewsResult {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateReviewInput {
  bookingId: string;
  rating: number; // 1-5
  comment?: string;
}

/* ─── one-shot mutators ──────────────────────────────────────────────────── */

export function createReview(input: CreateReviewInput): Promise<Review> {
  return api
    .post<{ item: Review }>("/reviews", input)
    .then((r) => r.item);
}

/* ─── hook: a professional's public reviews ──────────────────────────────── */

interface HookState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useProfessionalReviews(
  professionalId: string | null | undefined,
  page = 1,
  pageSize = 10,
): HookState<ListReviewsResult> {
  const [state, setState] = useState<HookState<ListReviewsResult>>({
    data: null,
    loading: Boolean(professionalId),
    error: null,
  });

  useEffect(() => {
    if (!professionalId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get<ListReviewsResult>(
        `/professionals/${encodeURIComponent(professionalId)}/reviews`,
        { query: { page, pageSize }, signal: ctrl.signal },
      )
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof ApiError ? err.message : "Değerlendirmeler yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => ctrl.abort();
  }, [professionalId, page, pageSize]);

  return state;
}
