import { describe, expect, it } from "vitest";
import { catalogueParams } from "@/lib/api";
const base = { q: "", type: "all", genre: "", year: "", page: 1 };
describe("catalogue API params", () => {
  it("defaults to recent, 24 per page", () => expect(catalogueParams(base).toString()).toBe("tri=recent&limit=24&page=1"));
  it("sends year filter", () => expect(catalogueParams({ ...base, year: "1915" }).get("annee")).toBe("1915"));
  it("sends title search", () => expect(catalogueParams({ ...base, q: "batman" }).get("titre")).toBe("batman"));
  it("film category", () => expect(catalogueParams({ ...base, type: "film" }).get("categorie")).toBe("film"));
});
