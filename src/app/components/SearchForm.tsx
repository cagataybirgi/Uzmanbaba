import { useId, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "./ds";
import { TURKISH_CITIES } from "../data/cities";
import { cn } from "./ui/utils";

/* ═══════════════════════════════════════════════════════════════════════════
 * SearchForm — the ruled search bar.
 *
 * Three cells between two 2px rules: the city, the query and the action.
 * The rules are the frame — the controls themselves carry no border of
 * their own. Stacks into a single column below `sm`, where each cell keeps
 * its own rule so the structure survives.
 * ═════════════════════════════════════════════════════════════════════════ */

export const ALL_CITIES_VALUE = "Tümü";

export function SearchForm({
  query,
  city,
  onQueryChange,
  onCityChange,
  onSubmit,
  submitLabel = "Ara",
  size = "hero",
  allValue = ALL_CITIES_VALUE,
  className,
}: {
  query: string;
  city: string;
  onQueryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  submitLabel?: string;
  size?: "hero" | "compact";
  /**
   * The value that means "no city filter". Both callers use a value that
   * `buildSearchPath` recognises as unfiltered, so the URL stays clean.
   */
  allValue?: string;
  /** Extra classes for the form element itself. */
  className?: string;
}) {
  const reactId = useId();
  const cityId = `${reactId}-city`;
  const queryId = `${reactId}-query`;

  const cellHeight = size === "hero" ? "min-h-16" : "min-h-14";

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={cn(
        "grid border-y-2 border-rule sm:grid-cols-[minmax(150px,220px)_minmax(0,1fr)_auto]",
        className,
      )}
    >
      <label htmlFor={cityId} className="sr-only">
        Konum seçin
      </label>
      <select
        id={cityId}
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        className={cn(
          "w-full appearance-none border-0 border-b border-rule-soft bg-transparent pr-9 pl-0 text-base text-ink md:text-[15px]",
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path d=%22M1 1.5 6 6.5 11 1.5%22 fill=%22none%22 stroke=%22%23201e1d%22 stroke-width=%221.6%22/></svg>')] bg-[length:12px_8px] bg-[position:right_12px_center] bg-no-repeat",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
          "sm:border-r sm:border-b-0",
          cellHeight,
        )}
      >
        <option value={allValue}>Tüm Türkiye</option>
        {TURKISH_CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label htmlFor={queryId} className="sr-only">
        Hizmet ara
      </label>
      <div className="relative flex items-center">
        <Search
          size={17}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 text-ink/45 sm:left-4"
        />
        <input
          id={queryId}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Hangi hizmete ihtiyacın var? (Örn: Tesisat)"
          className={cn(
            "w-full border-0 border-b border-rule-soft bg-transparent pr-4 pl-7 text-base text-ink md:text-[15px] placeholder:text-ink/45",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
            "sm:border-b-0 sm:pl-11",
            cellHeight,
          )}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className={cn("justify-center px-10", cellHeight)}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
