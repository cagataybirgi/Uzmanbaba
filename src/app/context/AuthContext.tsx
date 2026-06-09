import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "../lib/api";

/* ═══════════════════════════════════════════════════════════════════════════
 * TYPES
 *
 * Mirrors the backend's UserDto in backend/src/modules/auth/auth.dto.ts.
 * Keep these in lock-step.
 * ═════════════════════════════════════════════════════════════════════════ */

export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  push: boolean;
}

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
  notifications: NotificationPrefs;
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

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

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
  resendVerification: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  changePassword: (data: ChangePasswordPayload) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

// Re-exported so legacy imports of `ApiError` from this file still work.
export { ApiError };

/* ═══════════════════════════════════════════════════════════════════════════
 * STORAGE LAYER
 *
 * Wraps localStorage with try/catch so private-browsing or quota errors
 * don't crash the app. Auth state is split across two keys: the token lives
 * separately because the api client reads it directly to set the
 * Authorization header.
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
 * CONTEXT
 * ═════════════════════════════════════════════════════════════════════════ */

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Backfills fields that older cached user blobs may be missing. Stored users
 * from before a schema bump can otherwise crash the UI on first render
 * (e.g. `user.notifications.email` would throw on a TypeError).
 *
 * Trade-off: we may show stale "true/false" defaults for a moment until the
 * next `/api/users/me` or `updateProfile` call replaces the cached user.
 */
function normalizeStoredUser(raw: User | null): User | null {
  if (!raw) return null;
  return {
    ...raw,
    notifications: raw.notifications ?? { email: true, sms: true, push: false },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializers read localStorage SYNCHRONOUSLY on first render so
  // refresh-while-logged-in shows the authenticated UI immediately — no
  // flash of logged-out state, no isLoading flag needed.
  const [user, setUser] = useState<User | null>(() =>
    normalizeStoredUser(storage.getJSON<User>(STORAGE_KEYS.user)),
  );
  const [token, setToken] = useState<string | null>(() =>
    storage.getString(STORAGE_KEYS.token),
  );
  const [pendingEmail, setPendingEmail] = useState<string>(
    () => storage.getString(STORAGE_KEYS.pendingEmail) ?? "",
  );

  const applyAuthResponse = useCallback((res: AuthResponse) => {
    setUser(res.user);
    setToken(res.token);
    storage.setJSON(STORAGE_KEYS.user, res.user);
    storage.setString(STORAGE_KEYS.token, res.token);
  }, []);

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
          setUser(null);
          setPendingEmail("");
        }
      }
      if (e.key === STORAGE_KEYS.user) {
        setUser(
          e.newValue
            ? normalizeStoredUser(JSON.parse(e.newValue) as User)
            : null,
        );
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
      const res = await api.post<AuthResponse>(
        "/auth/login",
        { email, password },
        { auth: false },
      );
      applyAuthResponse(res);
    },
    [applyAuthResponse],
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      const res = await api.post<AuthResponse>(
        "/auth/register",
        data,
        { auth: false },
      );
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
      try {
        const res = await api.post<{ ok: true; user: User }>("/auth/verify-email", {
          code,
        });
        setUser(res.user);
        storage.setJSON(STORAGE_KEYS.user, res.user);
        setPendingEmail("");
        storage.remove(STORAGE_KEYS.pendingEmail);
        return true;
      } catch (err) {
        // "Wrong code" is an expected branch — return false so the UI can
        // shake the input. Anything else (network, expired token) re-throws.
        if (
          err instanceof ApiError &&
          (err.code === "invalid_code" || err.code === "validation_error")
        ) {
          return false;
        }
        throw err;
      }
    },
    [],
  );

  const resendVerification = useCallback(async () => {
    await api.post<{ ok: true }>("/auth/resend-verification");
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget — the JWT is stateless so the client-side clear is
    // the source of truth. If the backend adds a session-revocation table
    // later, this keeps the contract.
    api.post("/auth/logout").catch(() => {
      /* offline is fine, local state is cleared either way */
    });
    clearAuth();
  }, [clearAuth]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    // Only forward the fields the backend's PATCH /users/me accepts. This
    // also strips client-side-only flags (id, joinDate, rating, etc.) that
    // would either be rejected or silently ignored.
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.location !== undefined) payload.location = data.location;
    if (data.avatar !== undefined) payload.avatar = data.avatar;
    if (data.specialty !== undefined) payload.specialty = data.specialty;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.notifications !== undefined) payload.notifications = data.notifications;

    const res = await api.patch<{ user: User }>("/users/me", payload);
    setUser(res.user);
    storage.setJSON(STORAGE_KEYS.user, res.user);
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<{ user: User }>("/users/me/avatar", form);
    setUser(res.user);
    storage.setJSON(STORAGE_KEYS.user, res.user);
  }, []);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }: ChangePasswordPayload) => {
      await api.post<{ ok: true }>("/auth/change-password", {
        currentPassword,
        newPassword,
      });
    },
    [],
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      await api.del<undefined>("/users/me", { body: { password } });
      // Mirror logout: server state is gone, so the local state must follow.
      clearAuth();
    },
    [clearAuth],
  );

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
        resendVerification,
        updateProfile,
        uploadAvatar,
        changePassword,
        deleteAccount,
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
