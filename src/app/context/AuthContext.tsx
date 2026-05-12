import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/* ═══════════════════════════════════════════════════════════════════════════
 * TYPES
 * ═════════════════════════════════════════════════════════════════════════ */

export interface User {
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
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  accountType: "customer" | "professional";
  specialty?: string;
  city?: string;
  bio?: string;
}

/** Shape returned by a successful POST /auth/login or /auth/register */
interface AuthResponse {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  pendingEmail: string;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  verifyEmail: (code: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => void;
}

/**
 * Typed error thrown by the API functions. Callers can `catch (err)` and
 * check `err instanceof ApiError` to read `status` and `message` for
 * displaying user-facing feedback.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * STORAGE LAYER
 *
 * Wraps localStorage with try/catch so private-browsing or quota errors
 * don't crash the app. Auth state is split across two keys following the
 * common convention: token lives separately because it's read independently
 * (e.g., to set the Authorization header on outgoing requests).
 * ═════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEYS = {
  token: "uzmanbaba.auth.token",
  user: "uzmanbaba.auth.user",
  pendingEmail: "uzmanbaba.auth.pendingEmail",
} as const;

const storage = {
  getString(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  getJSON<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  setString(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota exceeded / disabled — silently ignore */
    }
  },
  setJSON(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* noop */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * API LAYER
 *
 * Each function is shaped like a real fetch call. The mock body below the
 * commented-out fetch is a drop-in placeholder — when you have a backend,
 * uncomment the fetch block and delete `return mockRequest(...)`.
 * ═════════════════════════════════════════════════════════════════════════ */

// Base URL for the real backend. Set VITE_API_URL in your .env to override.
// const API_BASE = import.meta.env?.VITE_API_URL ?? "/api";

/**
 * Generates a JWT-shaped string (3 base64 segments). Not cryptographically
 * valid — purely for the mock to return something that looks the part.
 */
function makeMockToken(userId: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }),
  );
  const signature = btoa("mock-signature-not-real");
  return `${header}.${payload}.${signature}`;
}

/**
 * Simulates a network round-trip. Resolves with the producer's return value
 * after `delay` ms, or rejects if the producer throws.
 */
function mockRequest<T>(producer: () => T, delay = 800): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(producer());
      } catch (err) {
        reject(err);
      }
    }, delay);
  });
}

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";

// ─── POST /auth/login ──────────────────────────────────────────────────────
async function apiLogin(payload: LoginPayload): Promise<AuthResponse> {
  // === Production implementation (uncomment when backend is ready) =========
  // const res = await fetch(`${API_BASE}/auth/login`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
  // if (!res.ok) {
  //   const body = await res.json().catch(() => ({}));
  //   throw new ApiError(body.message ?? "Giriş başarısız.", res.status);
  // }
  // return (await res.json()) as AuthResponse;

  // === Mock implementation ================================================
  return mockRequest<AuthResponse>(() => {
    if (!payload.email || !payload.password) {
      throw new ApiError("E-posta ve şifre zorunlu.", 400);
    }
    // Hook here to simulate bad credentials for testing the error UI:
    //   if (payload.email === "fail@uzmanbaba.com") {
    //     throw new ApiError("E-posta veya şifre hatalı.", 401);
    //   }

    const user: User = {
      id: "u1",
      name: "Ahmet Kullanıcı",
      email: payload.email,
      phone: "+90 555 123 45 67",
      accountType: "customer",
      emailVerified: true,
      avatar: DEFAULT_AVATAR,
      location: "Ankara, TR",
      joinDate: "Mayıs 2026",
      completedJobs: 8,
      pendingJobs: 2,
      rating: 4.9,
    };
    return { token: makeMockToken(user.id), user };
  }, 1200);
}

// ─── POST /auth/register ───────────────────────────────────────────────────
async function apiRegister(payload: RegisterPayload): Promise<AuthResponse> {
  // === Production implementation ==========================================
  // const res = await fetch(`${API_BASE}/auth/register`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
  // if (!res.ok) {
  //   const body = await res.json().catch(() => ({}));
  //   throw new ApiError(body.message ?? "Kayıt başarısız.", res.status);
  // }
  // return (await res.json()) as AuthResponse;

  // === Mock implementation ================================================
  return mockRequest<AuthResponse>(() => {
    if (!payload.email || !payload.password || !payload.name) {
      throw new ApiError("Zorunlu alanlar eksik.", 400);
    }

    const user: User = {
      id: "u1",
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      accountType: payload.accountType,
      emailVerified: false,
      avatar: DEFAULT_AVATAR,
      location: payload.city ? `${payload.city}, TR` : "Türkiye",
      specialty: payload.specialty,
      bio: payload.bio,
      joinDate: "Mayıs 2026",
      completedJobs: 0,
      pendingJobs: 0,
    };
    return { token: makeMockToken(user.id), user };
  }, 1400);
}

// ─── POST /auth/verify-email ───────────────────────────────────────────────
async function apiVerifyEmail(code: string, token: string | null): Promise<boolean> {
  // === Production implementation ==========================================
  // const res = await fetch(`${API_BASE}/auth/verify-email`, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     ...(token ? { Authorization: `Bearer ${token}` } : {}),
  //   },
  //   body: JSON.stringify({ code }),
  // });
  // if (res.status === 400) return false;  // wrong code
  // if (!res.ok) throw new ApiError("Doğrulama başarısız.", res.status);
  // return true;

  // === Mock implementation ================================================
  // Token isn't checked in the mock but the parameter is here to show the
  // production code's auth-header shape. Silence unused warning:
  void token;
  return mockRequest<boolean>(() => {
    // Accept any 6-digit numeric code
    return /^\d{6}$/.test(code);
  }, 1000);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * CONTEXT
 * ═════════════════════════════════════════════════════════════════════════ */

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializers read localStorage SYNCHRONOUSLY on first render so
  // refresh-while-logged-in shows the authenticated UI immediately — no
  // flash of logged-out state, no isLoading flag needed.
  const [user, setUser] = useState<User | null>(() =>
    storage.getJSON<User>(STORAGE_KEYS.user),
  );
  const [token, setToken] = useState<string | null>(() =>
    storage.getString(STORAGE_KEYS.token),
  );
  const [pendingEmail, setPendingEmail] = useState<string>(
    () => storage.getString(STORAGE_KEYS.pendingEmail) ?? "",
  );

  /**
   * Persists a successful auth response to state + localStorage in one shot.
   */
  const applyAuthResponse = useCallback((res: AuthResponse) => {
    setUser(res.user);
    setToken(res.token);
    storage.setJSON(STORAGE_KEYS.user, res.user);
    storage.setString(STORAGE_KEYS.token, res.token);
  }, []);

  /**
   * Clears auth state from memory and storage. Used by logout and by the
   * cross-tab sync handler.
   */
  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    setPendingEmail("");
    storage.remove(STORAGE_KEYS.user);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.pendingEmail);
  }, []);

  /* ── Cross-tab sync ─────────────────────────────────────────────────────
   * If the user logs out (or in) in another tab, the `storage` event fires
   * here and we mirror it so all tabs stay in sync.
   * ──────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.token) {
        setToken(e.newValue);
        if (!e.newValue) {
          // Token cleared in another tab → log out here too
          setUser(null);
          setPendingEmail("");
        }
      }
      if (e.key === STORAGE_KEYS.user) {
        setUser(e.newValue ? (JSON.parse(e.newValue) as User) : null);
      }
      if (e.key === STORAGE_KEYS.pendingEmail) {
        setPendingEmail(e.newValue ?? "");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  /* ── Public actions ─────────────────────────────────────────────────── */

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin({ email, password });
      applyAuthResponse(res);
    },
    [applyAuthResponse],
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      const res = await apiRegister(data);
      applyAuthResponse(res);
      // Track which email is awaiting verification so the verify page can
      // show a masked version even after a refresh.
      setPendingEmail(data.email);
      storage.setString(STORAGE_KEYS.pendingEmail, data.email);
    },
    [applyAuthResponse],
  );

  const verifyEmail = useCallback(
    async (code: string): Promise<boolean> => {
      const ok = await apiVerifyEmail(code, token);
      if (ok) {
        setUser((prev) => {
          if (!prev) return null;
          const updated = { ...prev, emailVerified: true };
          storage.setJSON(STORAGE_KEYS.user, updated);
          return updated;
        });
        // Clear the pending email once verified
        setPendingEmail("");
        storage.remove(STORAGE_KEYS.pendingEmail);
      }
      return ok;
    },
    [token],
  );

  const logout = useCallback(() => {
    // Real backends usually have POST /auth/logout to invalidate the
    // server-side session. Fire-and-forget pattern (no await) so the UI
    // updates immediately regardless of network state:
    //   fetch(`${API_BASE}/auth/logout`, {
    //     method: "POST",
    //     headers: { Authorization: `Bearer ${token}` },
    //   }).catch(() => { /* offline is fine, local state is cleared */ });
    clearAuth();
  }, [clearAuth]);

  const updateProfile = useCallback((data: Partial<User>) => {
    // Optimistic local update. To make this a real API call:
    //   await fetch(`${API_BASE}/users/me`, {
    //     method: "PATCH",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${token}`,
    //     },
    //     body: JSON.stringify(data),
    //   });
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      storage.setJSON(STORAGE_KEYS.user, updated);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        pendingEmail,
        login,
        register,
        logout,
        verifyEmail,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
