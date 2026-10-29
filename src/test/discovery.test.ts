import { describe, expect, it } from "vitest";
import { filterCatalogue, shuffleFilms } from "@/lib/discovery";
import type { Item } from "@/lib/api";
const items: Item[] = [
  { id: "1", titre: "Film Alpha", item_type: "film", genre: "Drame, Action", annee: 2026, poster: null, qualite: null, langue: null, saison: null },
  { id: "2", titre: "Anime Beta", item_type: "anime", genre: "Animation", annee: 2025, poster: null, qualite: null, langue: null, saison: null },
  { id: "3", titre: "Série Gamma", item_type: "serie", genre: "Drame", annee: 2026, poster: null, qualite: null, langue: null, saison: null },
];
const base = { q: "", type: "all", genre: "", year: "" };
describe("Catalogue rules", () => {
  it("matches a title immediately, ignoring case", () => expect(filterCatalogue(items, { ...base, q: "ALPHA" }).map(i=>i.id)).toEqual(["1"]));
  it("filters films", () => expect(filterCatalogue(items,{...base,type:"film"}).map(i=>i.id)).toEqual(["1"]));
  it("filters anime", () => expect(filterCatalogue(items,{...base,type:"anime"}).map(i=>i.id)).toEqual(["2"]));
  it("filters series", () => expect(filterCatalogue(items,{...base,type:"serie"}).map(i=>i.id)).toEqual(["3"]));
  it("filters an exact genre", () => expect(filterCatalogue(items,{...base,genre:"Action"}).map(i=>i.id)).toEqual(["1"]));
  it("filters release year", () => expect(filterCatalogue(items,{...base,year:"2025"}).map(i=>i.id)).toEqual(["2"]));
  it("suggests films only", () => expect(shuffleFilms(items,()=>0).map(i=>i.id)).toEqual(["1"]));
});