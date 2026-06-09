import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Professional } from "../components/ProfessionalCard";

export type SortKey = "rating" | "nearest" | "availability";

export interface ListProfessionalsParams {
  q?: string;
  city?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface ListProfessionalsResult {
  items: Professional[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ─── one-shot fetchers ──────────────────────────────────────────────────── */

export function fetchProfessionals(
  params: ListProfessionalsParams,
  signal?: AbortSignal,
): Promise<ListProfessionalsResult> {
  return api.get<ListProfessionalsResult>("/professionals", {
    query: { ...params },
    signal,
  });
}

export function fetchFeaturedProfessionals(
  limit = 3,
  signal?: AbortSignal,
): Promise<Professional[]> {
  return api
    .get<{ items: Professional[] }>("/professionals/featured", {
      query: { limit },
      signal,
    })
    .then((r) => r.items);
}

export function fetchProfessional(
  id: string,
  signal?: AbortSignal,
): Promise<Professional> {
  return api
    .get<{ item: Professional }>(
      `/professionals/${encodeURIComponent(id)}`,
      { signal },
    )
    .then((r) => r.item);
}

/* ─── hooks ──────────────────────────────────────────────────────────────── */

interface HookState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Listing hook for SearchResults. Re-fetches whenever any of the params
 * change. AbortController makes stale responses get ignored if the user
 * changes filters before the previous fetch returns.
 */
export function useProfessionals(
  params: ListProfessionalsParams,
): HookState<ListProfessionalsResult> {
  const [state, setState] = useState<HookState<ListProfessionalsResult>>({
    data: null,
    loading: true,
    error: null,
  });

  // Serialize the param object so it's a stable dep across renders.
  const key = JSON.stringify(params);
  const latestKey = useRef(key);
  latestKey.current = key;

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchProfessionals(params, ctrl.signal)
      .then((data) => {
        if (latestKey.current !== key) return; // a newer request superseded us
        setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof ApiError ? err.message : "Uzmanlar yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

/**
 * Detail hook for the professional page. Re-fetches when the id changes
 * (e.g. user navigates between two detail pages without unmounting).
 */
export function useProfessional(id: string | null | undefined): HookState<Professional> {
  const [state, setState] = useState<HookState<Professional>>({
    data: null,
    loading: Boolean(id),
    error: null,
  });

  useEffect(() => {
    if (!id) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchProfessional(id, ctrl.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof ApiError ? err.message : "Uzman yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => ctrl.abort();
  }, [id]);

  return state;
}

/**
 * Featured hook for Home. Fires once on mount.
 */
export function useFeaturedProfessionals(limit = 3): HookState<Professional[]> {
  const [state, setState] = useState<HookState<Professional[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const ctrl = new AbortController();
    fetchFeaturedProfessionals(limit, ctrl.signal)
      .then((items) => setState({ data: items, loading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof ApiError ? err.message : "Uzmanlar yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => ctrl.abort();
  }, [limit]);

  return state;
}
