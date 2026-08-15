import { useEffect, useId, useState } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProfessionalTable } from "../components/ProfessionalTable";
import { SearchForm } from "../components/SearchForm";
import { BookingModal } from "../components/BookingModal";
import {
  Button,
  EmptyState,
  ErrorState,
  Kicker,
  Shell,
  SkeletonRows,
} from "../components/ds";
import { useProfessionals, type Professional, type SortKey } from "../data/professionals";
import { SEARCH_LOCATION_PARAM, SEARCH_QUERY_PARAM } from "../lib/searchQuery";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rating", label: "En İyi Puan" },
  { value: "nearest", label: "En Yakın" },
  { value: "availability", label: "Müsaitlik" },
];

const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);

/** The "no city filter" value. `buildSearchPath` treats it as unfiltered. */
const DEFAULT_LOCATION = "Türkiye";
const DEFAULT_SORT: SortKey = "rating";
const ITEMS_PER_PAGE = 6;

export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Derived URL state (single source of truth) ─────────────────────────
  // Param names shared with buildSearchPath so Home's links can't drift.
  const query = searchParams.get(SEARCH_QUERY_PARAM) ?? "";
  const location = searchParams.get(SEARCH_LOCATION_PARAM) ?? DEFAULT_LOCATION;
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
  const { data, loading, error, refetch } = useProfessionals({
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
      {/* ── Search bar ────────────────────────────────────────────────── */}
      <section className="below-header sticky z-40 border-b-2 border-rule bg-paper">
        <Shell>
          <SearchForm
            size="compact"
            className="border-y-0"
            query={searchInput}
            city={location}
            allValue={DEFAULT_LOCATION}
            onQueryChange={setSearchInput}
            onCityChange={(value) =>
              updateParams({ location: value, page: null })
            }
            onSubmit={handleSearch}
            submitLabel="Aramayı Güncelle"
          />
        </Shell>
      </section>

      {/* ── Results ───────────────────────────────────────────────────── */}
      <Shell as="section" className="py-14 md:py-16">
        <div className="mb-7 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-4">
          <h1 className="t-section" aria-live="polite">
            {loading && !data ? (
              <span className="text-ink/50">Yükleniyor…</span>
            ) : (
              <>
                <span className="tnum text-brand">{total}</span>{" "}
                {query ? `${query} uzmanı bulundu` : "uzman listeleniyor"}
              </>
            )}
          </h1>

          <div className="flex items-center gap-3">
            <label
              htmlFor={sortId}
              className="text-[13px] tracking-[0.08em] text-ink/70 uppercase"
            >
              Sırala
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value, page: null })}
              className="min-h-11 appearance-none border border-rule bg-surface pr-9 pl-3 text-base text-ink md:text-sm bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path d=%22M1 1.5 6 6.5 11 1.5%22 fill=%22none%22 stroke=%22%23201e1d%22 stroke-width=%221.6%22/></svg>')] bg-[length:12px_8px] bg-[position:right_12px_center] bg-no-repeat focus-visible:border-brand"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Kicker>
            {query || "Tüm hizmetler"} — {location}
          </Kicker>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="min-h-11 cursor-pointer text-[13px] font-semibold text-brand-800 underline underline-offset-4 transition-colors hover:text-brand-700"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>

        {error && !loading ? (
          <ErrorState
            title="Uzmanlar yüklenemedi"
            message={error}
            onRetry={refetch}
          />
        ) : loading ? (
          <SkeletonRows rows={ITEMS_PER_PAGE} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Sonuç Bulunamadı"
            description={
              query
                ? `"${query}" araması ${
                    location !== DEFAULT_LOCATION ? `${location} bölgesinde ` : ""
                  }herhangi bir uzmanla eşleşmedi. Farklı bir arama veya konum dene.`
                : `${location} bölgesinde listelenecek uzman bulunamadı. Farklı bir konum dene.`
            }
            action={
              hasActiveFilters ? (
                <Button variant="primary" onClick={handleClearFilters}>
                  Filtreleri Temizle
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ProfessionalTable
            professionals={items}
            onBook={handleBook}
            caption={`Arama sonuçları: ${total} uzman`}
          />
        )}

        {/* Pagination — only when there is more than one page */}
        {!loading && !error && totalPages > 1 && (
          <nav
            aria-label="Sayfalar"
            className="mt-10 flex flex-wrap items-center gap-3 border-t-2 border-rule pt-7"
          >
            <Button
              variant="secondary"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Önceki
            </Button>

            <span className="tnum text-[13px] tracking-[0.08em] text-ink/70 uppercase">
              Sayfa {currentPage} / {totalPages}
            </span>

            <Button
              variant="secondary"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Sonraki
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </nav>
        )}
      </Shell>

      <BookingModal
        professional={selectedPro}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
