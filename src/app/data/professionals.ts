import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";

/**
 * A professional as the API returns it. This is the shape every listing,
 * the detail page and the booking modal read from, so it lives with the
 * fetchers rather than with any one component that renders it.
 */
export interface Professional {
  id: string;
  name: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  available: boolean;
  avatar: string;
  // Detail-only fields — optional on the type so the featured/listing
  // endpoints, which omit them, still satisfy it.
  bio?: string | null;
  completedJobs?: number;
  joinDate?: string;
}

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

export interface ProfessionalStats {
  emailVerifiedProfessionals: number;
  citiesServed: number;
  averageRating: number | null;
  completedJobs: number;
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

export function fetchProfessionalStats(
  signal?: AbortSignal,
): Promise<ProfessionalStats> {
  return api
    .get<{ stats: ProfessionalStats }>("/professionals/stats", { signal })
    .then((r) => r.stats);
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

interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface HookState<T> extends RequestState<T> {
  refetch: () => void;
}

/**
 * Listing hook for SearchResults. Re-fetches whenever any of the params
 * change. AbortController makes stale responses get ignored if the user
 * changes filters before the previous fetch returns.
 */
export function useProfessionals(
  params: ListProfessionalsParams,
): HookState<ListProfessionalsResult> {
  const [state, setState] = useState<RequestState<ListProfessionalsResult>>({
    data: null,
    loading: true,
    error: null,
  });

  // Serialize the param object so it's a stable dep across renders.
  const key = JSON.stringify(params);
  const latestKey = useRef(key);
  const activeRequest = useRef(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const refetch = useCallback(() => setRequestVersion((v) => v + 1), []);
  latestKey.current = key;

  useEffect(() => {
    const ctrl = new AbortController();
    const requestId = ++activeRequest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchProfessionals(params, ctrl.signal)
      .then((data) => {
        if (latestKey.current !== key || activeRequest.current !== requestId) {
          return;
        }
        setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (activeRequest.current !== requestId) return;
        const message =
          err instanceof ApiError ? err.message : "Uzmanlar yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => {
      ctrl.abort();
      if (activeRequest.current === requestId) activeRequest.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, requestVersion]);

  return { ...state, refetch };
}

/**
 * Detail hook for the professional page. Re-fetches when the id changes
 * (e.g. user navigates between two detail pages without unmounting).
 */
export function useProfessional(id: string | null | undefined): HookState<Professional> {
  const [state, setState] = useState<RequestState<Professional>>({
    data: null,
    loading: Boolean(id),
    error: null,
  });
  const activeRequest = useRef(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const refetch = useCallback(() => setRequestVersion((v) => v + 1), []);

  useEffect(() => {
    const requestId = ++activeRequest.current;
    if (!id) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchProfessional(id, ctrl.signal)
      .then((data) => {
        if (activeRequest.current !== requestId) return;
        setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (activeRequest.current !== requestId) return;
        const message =
          err instanceof ApiError ? err.message : "Uzman yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => {
      ctrl.abort();
      if (activeRequest.current === requestId) activeRequest.current += 1;
    };
  }, [id, requestVersion]);

  return { ...state, refetch };
}

/**
 * Featured hook for Home. Fires once on mount.
 */
export function useFeaturedProfessionals(limit = 3): HookState<Professional[]> {
  const [state, setState] = useState<RequestState<Professional[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const activeRequest = useRef(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const refetch = useCallback(() => setRequestVersion((v) => v + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    const requestId = ++activeRequest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchFeaturedProfessionals(limit, ctrl.signal)
      .then((items) => {
        if (activeRequest.current !== requestId) return;
        setState({ data: items, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (activeRequest.current !== requestId) return;
        const message =
          err instanceof ApiError ? err.message : "Uzmanlar yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => {
      ctrl.abort();
      if (activeRequest.current === requestId) activeRequest.current += 1;
    };
  }, [limit, requestVersion]);

  return { ...state, refetch };
}

/**
 * Public platform statistics shown on Home. A failed request deliberately has
 * no static fallback: callers can omit the metrics instead of showing claims
 * that the application cannot verify.
 */
export function useProfessionalStats(): HookState<ProfessionalStats> {
  const [state, setState] = useState<RequestState<ProfessionalStats>>({
    data: null,
    loading: true,
    error: null,
  });
  const activeRequest = useRef(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const refetch = useCallback(() => setRequestVersion((v) => v + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    const requestId = ++activeRequest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchProfessionalStats(ctrl.signal)
      .then((data) => {
        if (activeRequest.current !== requestId) return;
        setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (activeRequest.current !== requestId) return;
        const message =
          err instanceof ApiError
            ? err.message
            : "Platform istatistikleri yüklenemedi.";
        setState({ data: null, loading: false, error: message });
      });
    return () => {
      ctrl.abort();
      if (activeRequest.current === requestId) activeRequest.current += 1;
    };
  }, [requestVersion]);

  return { ...state, refetch };
}
