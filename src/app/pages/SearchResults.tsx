import { useEffect, useId, useState } from "react";
import { useSearchParams } from "react-router";
import { Search, ChevronLeft, ChevronRight, SearchX, AlertCircle } from "lucide-react";
import { ProfessionalCard, type Professional } from "../components/ProfessionalCard";
import { BookingModal } from "../components/BookingModal";
import { useProfessionals, type SortKey } from "../data/professionals";

const LOCATIONS = [
  "Türkiye",
  "Ankara",
  "İstanbul",
  "İzmir",
  "Bursa",
  "Antalya",
  "Adana",
] as const;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rating", label: "En İyi Puan" },
  { value: "nearest", label: "En Yakın" },
  { value: "availability", label: "Müsaitlik" },
];

const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);

const DEFAULT_LOCATION = "Türkiye";
const DEFAULT_SORT: SortKey = "rating";
const ITEMS_PER_PAGE = 6;

export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Derived URL state (single source of truth) ─────────────────────────
  const query = searchParams.get("q") ?? "";
  const location = searchParams.get("location") ?? DEFAULT_LOCATION;
  const rawSort = searchParams.get("sort") ?? DEFAULT_SORT;
  const sort: SortKey = (SORT_KEYS as string[]).includes(rawSort)
    ? (rawSort as SortKey)
    : DEFAULT_SORT;
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  // ── Local UI state ─────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(query);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const locationId = useId();
  const queryId = useId();
  const sortId = useId();

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      const isDefault =
        (key === "location" && value === DEFAULT_LOCATION) ||
        (key === "sort" && value === DEFAULT_SORT) ||
        (key === "page" && value === "1");
      if (value === null || value === "" || isDefault) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next);
  };

  // ── Backend-driven listing ─────────────────────────────────────────────
  const { data, loading, error } = useProfessionals({
    q: query || undefined,
    city: location === DEFAULT_LOCATION ? undefined : location,
    sort,
    page: requestedPage,
    pageSize: ITEMS_PER_PAGE,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const currentPage = Math.min(requestedPage, totalPages);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim() || null, page: null });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const handleBook = (pro: Professional) => {
    setSelectedPro(pro);
    setModalOpen(true);
  };

  const goToPage = (p: number) => {
    updateParams({ page: p === 1 ? null : String(p) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters = Boolean(query || location !== DEFAULT_LOCATION);

  return (
    <>
      {/* ── Search Bar ────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-200 py-4 px-4 sticky top-16 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
          >
            {/* Location */}
            <div className="flex flex-col gap-1 sm:contents">
              <label htmlFor={locationId} className="sr-only">
                Konum seçin
              </label>
              <select
                id={locationId}
                value={location}
                onChange={(e) =>
                  updateParams({ location: e.target.value, page: null })
                }
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white min-w-[150px]"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    📍 {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Query input */}
            <div className="flex flex-col gap-1 flex-1">
              <label htmlFor={queryId} className="sr-only">
                Hizmet ara
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id={queryId}
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Hizmet ara..."
                  className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              Aramayı Güncelle
            </button>
          </form>

          {/* Active filters subtext */}
          <p className="text-gray-400 text-xs mt-2 pl-1">
            {query ? (
              <>
                <span className="capitalize">{query}</span> hizmetleri
              </>
            ) : (
              "Tüm hizmetler"
            )}{" "}
            • {location}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="ml-3 text-orange-500 hover:text-orange-600 font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                Filtreleri Temizle
              </button>
            )}
          </p>
        </div>
      </section>

      {/* ── Results ───────────────────────────────────────────────────── */}
      <section className="py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2
              className="text-gray-900 text-xl font-bold"
              aria-live="polite"
            >
              {loading && !data ? (
                <span className="text-gray-400">Yükleniyor…</span>
              ) : (
                <>
                  <span className="text-orange-500">{total}</span>{" "}
                  {query ? (
                    <>
                      <span className="capitalize">{query}</span> uzmanı bulundu
                    </>
                  ) : (
                    "uzman listeleniyor"
                  )}{" "}
                  — <span className="font-normal text-gray-500">{location}</span>
                </>
              )}
            </h2>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <label htmlFor={sortId}>Sırala:</label>
              <select
                id={sortId}
                value={sort}
                onChange={(e) =>
                  updateParams({ sort: e.target.value, page: null })
                }
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Error ────────────────────────────────────────────────── */}
          {error && !loading && (
            <div className="bg-white border border-red-100 rounded-2xl p-8 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle size={22} className="text-red-500" />
              </div>
              <p className="text-gray-800 font-semibold">{error}</p>
              <p className="text-gray-500 text-sm">
                Sayfayı yenileyip tekrar dene.
              </p>
            </div>
          )}

          {/* ── Loading skeleton ─────────────────────────────────────── */}
          {loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm animate-pulse"
                >
                  <div className="h-32 bg-gray-100" />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="h-4 bg-gray-100 rounded w-2/3 mx-auto" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
                    <div className="h-3 bg-gray-100 rounded w-1/3 mx-auto mt-1" />
                    <div className="h-9 bg-gray-100 rounded mt-3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty ────────────────────────────────────────────────── */}
          {!loading && !error && items.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 sm:p-14 flex flex-col items-center text-center gap-4 animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
                <SearchX size={28} className="text-orange-500" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-gray-900 text-lg font-bold">
                  Sonuç Bulunamadı
                </h3>
                <p className="text-gray-500 text-sm max-w-md">
                  {query
                    ? `"${query}" araması ${
                        location !== DEFAULT_LOCATION ? `${location}'da ` : ""
                      }herhangi bir uzmanla eşleşmedi.`
                    : `${location} bölgesinde listelenecek uzman bulunamadı.`}{" "}
                  Farklı bir arama veya konum dene.
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          )}

          {/* ── Grid ─────────────────────────────────────────────────── */}
          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((pro) => (
                <ProfessionalCard
                  key={pro.id}
                  professional={pro}
                  onBook={handleBook}
                />
              ))}
            </div>
          )}

          {/* Pagination — only when more than one page */}
          {!loading && !error && totalPages > 1 && (
            <nav
              aria-label="Sayfalar"
              className="flex items-center justify-center gap-2 mt-10"
            >
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                <ChevronLeft size={16} aria-hidden="true" /> Önceki
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  aria-current={currentPage === p ? "page" : undefined}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 ${
                    currentPage === p
                      ? "bg-orange-500 text-white"
                      : "border border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-500"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                Sonraki <ChevronRight size={16} aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </section>

      <BookingModal
        professional={selectedPro}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
