/**
 * Minimal fetch wrapper.
 *
 * - Reads `VITE_API_URL` (defaults to "/api") so the same code works whether
 *   you use a Vite proxy or a separate backend origin.
 * - Attaches `Authorization: Bearer <token>` when a token is in localStorage.
 * - Serializes the query object into the URL, omitting null/undefined/"" so
 *   "Türkiye"-style defaults don't pollute the request.
 * - Parses our `{ error: { code, message, details? } }` shape into ApiError.
 *
 * Anything more (caching, dedup, retries) is the caller's problem — keep
 * this file boring.
 */

const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

const TOKEN_KEY = "uzmanbaba.auth.token";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  /** When false, do not attach the Authorization header even if a token exists. */
  auth?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    // URL needs a base. Use a placeholder for relative paths so URLSearchParams
    // round-trips correctly; we strip it before returning.
    API_BASE.startsWith("http") ? API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`
      : `http://x.invalid${API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`}`,
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return API_BASE.startsWith("http")
    ? url.toString()
    : `${url.pathname}${url.search}`;
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };

  // FormData bodies: let the browser set Content-Type so it can include the
  // multipart boundary. Anything else with a body is JSON.
  const isFormData =
    typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (opts.auth !== false) {
    const token = readToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const body =
    opts.body === undefined
      ? undefined
      : isFormData
      ? (opts.body as FormData)
      : JSON.stringify(opts.body);

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body,
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Bağlantı kurulamadı.", 0, "network_error");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? safeJson(text) : null;

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; details?: unknown } } | null)
      ?.error;
    throw new ApiError(
      err?.message ?? "Beklenmedik bir hata oluştu.",
      res.status,
      err?.code ?? "unknown_error",
      err?.details,
    );
  }

  return (json ?? {}) as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "body">) =>
    request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">) =>
    request<T>("POST", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">) =>
    request<T>("PATCH", path, { ...opts, body }),
  del: <T>(path: string, opts?: RequestOptions) =>
    request<T>("DELETE", path, opts),
};
