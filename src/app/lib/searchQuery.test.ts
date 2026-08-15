import { describe, expect, it } from "vitest";
import {
  buildSearchPath,
  SEARCH_LOCATION_PARAM,
  SEARCH_QUERY_PARAM,
} from "./searchQuery";

describe("buildSearchPath", () => {
  it("uses the q/location param names SearchResults reads", () => {
    expect(SEARCH_QUERY_PARAM).toBe("q");
    expect(SEARCH_LOCATION_PARAM).toBe("location");
    expect(buildSearchPath({ query: "Tesisat", city: "Ankara" })).toBe(
      "/search?q=Tesisat&location=Ankara",
    );
  });

  it("omits the all-cities sentinel values", () => {
    expect(buildSearchPath({ query: "Temizlik", city: "Tümü" })).toBe(
      "/search?q=Temizlik",
    );
    expect(buildSearchPath({ city: "Türkiye" })).toBe("/search");
  });

  it("trims the query and drops empties", () => {
    expect(buildSearchPath({ query: "  boya  " })).toBe("/search?q=boya");
    expect(buildSearchPath({ query: "   " })).toBe("/search");
    expect(buildSearchPath({})).toBe("/search");
  });

  it("URL-encodes Turkish characters safely", () => {
    const path = buildSearchPath({ query: "boya badana", city: "İzmir" });
    const params = new URLSearchParams(path.split("?")[1]);
    expect(params.get(SEARCH_QUERY_PARAM)).toBe("boya badana");
    expect(params.get(SEARCH_LOCATION_PARAM)).toBe("İzmir");
  });
});
