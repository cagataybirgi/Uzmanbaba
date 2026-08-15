import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useFeaturedProfessionals,
  useProfessionalStats,
  useProfessionals,
} from "./professionals";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ListingHarness() {
  const result = useProfessionals({ page: 1, pageSize: 6 });
  const label = result.loading
    ? "loading"
    : result.error
      ? `error:${result.error}`
      : `success:${result.data?.total ?? 0}`;

  return (
    <>
      <output data-state>{label}</output>
      <button type="button" onClick={result.refetch}>
        retry
      </button>
    </>
  );
}

function FeaturedHarness() {
  const result = useFeaturedProfessionals(3);
  const label = result.loading
    ? "loading"
    : result.error
      ? `error:${result.error}`
      : `success:${result.data?.length ?? 0}`;

  return (
    <>
      <output data-state>{label}</output>
      <button type="button" onClick={result.refetch}>
        retry
      </button>
    </>
  );
}

function StatsHarness() {
  const result = useProfessionalStats();
  const label = result.loading
    ? "loading"
    : result.error
      ? `error:${result.error}`
      : `success:${result.data?.emailVerifiedProfessionals ?? 0}`;

  return <output data-state>{label}</output>;
}

describe("professional data retries", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.unstubAllGlobals();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function expectState(expected: string) {
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector("[data-state]")?.textContent).toBe(
          expected,
        );
      });
    });
  }

  async function retry() {
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    await act(async () => button?.click());
  }

  it("repeats a failed professionals listing request and exposes fresh data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: "temporary", message: "Geçici hata." } },
          503,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [],
          total: 4,
          page: 1,
          pageSize: 6,
          totalPages: 1,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => root.render(<ListingHarness />));
    await expectState("error:Geçici hata.");
    await retry();
    await expectState("success:4");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/professionals");
  });

  it("repeats a failed featured-professionals request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: "temporary", message: "Geçici hata." } },
          503,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => root.render(<FeaturedHarness />));
    await expectState("error:Geçici hata.");
    await retry();
    await expectState("success:0");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      "/api/professionals/featured",
    );
  });

  it("loads factual platform statistics from the public stats endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        stats: {
          emailVerifiedProfessionals: 23,
          citiesServed: 8,
          averageRating: 4.67,
          completedJobs: 91,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => root.render(<StatsHarness />));
    await expectState("success:23");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/api/professionals/stats",
    );
  });
});
