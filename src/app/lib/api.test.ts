import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, SESSION_EXPIRED_EVENT } from "./api";

const TOKEN_KEY = "uzmanbaba.auth.token";
const USER_KEY = "uzmanbaba.auth.user";

function mock401() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Oturumunuz sona erdi." } }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
}

describe("api client 401 handling", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("clears stored auth and fires session-expired when a token-bearing request gets 401", async () => {
    localStorage.setItem(TOKEN_KEY, "dead-token");
    localStorage.setItem(USER_KEY, JSON.stringify({ id: "u1" }));
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    mock401();

    await expect(api.get("/auth/me")).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("does NOT clear auth on a 401 from an auth:false request (failed login)", async () => {
    localStorage.setItem(TOKEN_KEY, "still-valid-token");
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    mock401();

    await expect(
      api.post("/auth/login", { email: "x@y.z", password: "wrong" }, { auth: false }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(localStorage.getItem(TOKEN_KEY)).toBe("still-valid-token");
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("does NOT clear auth when no token was stored (anonymous 401)", async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    mock401();

    await expect(api.get("/auth/me")).rejects.toMatchObject({ status: 401 });

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });
});
