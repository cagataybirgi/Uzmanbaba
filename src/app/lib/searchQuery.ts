/**
 * Single source of truth for the /search URL contract.
 *
 * Home (and anything else that links into search) must build URLs through
 * `buildSearchPath`, and SearchResults reads the same constants — so the
 * two sides can't silently drift apart again.
 */

export const SEARCH_QUERY_PARAM = "q";
export const SEARCH_LOCATION_PARAM = "location";

/** Values that mean "no city filter" for the location selector. */
const ALL_LOCATIONS = new Set(["", "Tümü", "Türkiye"]);

export function buildSearchPath(opts: { query?: string; city?: string }): string {
  const params = new URLSearchParams();
  const query = opts.query?.trim();
  if (query) params.set(SEARCH_QUERY_PARAM, query);
  const city = opts.city?.trim();
  if (city && !ALL_LOCATIONS.has(city)) params.set(SEARCH_LOCATION_PARAM, city);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}
