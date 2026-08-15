import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { SearchResults } from "./pages/SearchResults";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

const platformStats = {
  emailVerifiedProfessionals: 23,
  citiesServed: 8,
  averageRating: 4.67,
  completedJobs: 91,
};

const emptyListing = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 6,
  totalPages: 1,
};

function LocationProbe() {
  const location = useLocation();
  return (
    <output
      data-testid="location"
      data-navigation-state={JSON.stringify(location.state)}
      hidden
    >
      {location.pathname}
      {location.search}
    </output>
  );
}

function renderPublicRoutes(path = "/") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("route-level user journeys", () => {
  it("searches from the lazy-loaded home page and renders the matching URL state", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url.includes("/professionals/stats")) {
        return jsonResponse({ stats: platformStats });
      }
      if (url.includes("/professionals/featured")) {
        return jsonResponse({ items: [] });
      }
      if (url.includes("/professionals?")) {
        return jsonResponse(emptyListing);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPublicRoutes();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Yerel Hizmetleri Anında Bul/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("region", { name: "Platform istatistikleri" }),
    ).toHaveTextContent("23");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Konum seçin" }),
      "Ankara",
    );
    await user.type(
      screen.getByRole("searchbox", { name: "Hizmet ara" }),
      "Tesisat",
    );
    await user.click(screen.getByRole("button", { name: "Ara" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/search?q=Tesisat&location=Ankara",
      );
    });
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /0 Tesisat uzmanı bulundu/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sonuç Bulunamadı" }),
    ).toBeInTheDocument();

    const listingUrl = fetchMock.mock.calls
      .map(([input]) => getRequestUrl(input))
      .find((url) => url.includes("/professionals?"));
    expect(listingUrl).toContain("q=Tesisat");
    expect(listingUrl).toContain("city=Ankara");
  });

  it("lets a user retry a failed featured-professionals request", async () => {
    let featuredAttempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url.includes("/professionals/stats")) {
        return jsonResponse({ stats: platformStats });
      }
      if (url.includes("/professionals/featured")) {
        featuredAttempts += 1;
        return featuredAttempts === 1
          ? jsonResponse(
              {
                error: {
                  code: "temporary",
                  message: "Servis kısa süreliğine kullanılamıyor.",
                },
              },
              503,
            )
          : jsonResponse({ items: [] });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPublicRoutes();

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "Öne çıkan uzmanlar yüklenemedi",
      }),
    ).toBeInTheDocument();
    expect(alert).toHaveTextContent("Servis kısa süreliğine kullanılamıyor.");

    await user.click(within(alert).getByRole("button", { name: "Tekrar dene" }));

    expect(
      await screen.findByRole("heading", { name: "Henüz uzman yok" }),
    ).toBeInTheDocument();
    expect(featuredAttempts).toBe(2);
  });

  it("redirects a signed-out dashboard visitor and focuses the first invalid login field", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard?tab=bookings"]}>
        <LocationProbe />
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            </Route>
            <Route path="/login" element={<Login />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Tekrar hoş geldin.",
      }),
    ).toBeInTheDocument();
    const location = screen.getByTestId("location");
    expect(location).toHaveTextContent("/login");
    expect(location).toHaveAttribute(
      "data-navigation-state",
      JSON.stringify({ from: "/dashboard?tab=bookings" }),
    );

    await user.click(screen.getByRole("button", { name: "Giriş Yap" }));

    const email = screen.getByRole("textbox", { name: /E-posta/i });
    await waitFor(() => expect(email).toHaveFocus());
    expect(screen.getByText("E-posta zorunlu.")).toBeInTheDocument();
    expect(screen.getByText("Şifre zorunlu.")).toBeInTheDocument();
  });
});
