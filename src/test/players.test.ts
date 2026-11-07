import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYERS, fillTemplate, matchesTemplate } from "@/lib/players";

describe("player links", () => {
  it("members watch series on /tvs/<id>/<s>/<e>", () => expect(fillTemplate(DEFAULT_PLAYERS.player_member_serie, { id: "534", s: 1, e: 1 })).toBe("tvs/534/1/1"));
  it("members watch films on /film/<id>", () => expect(fillTemplate(DEFAULT_PLAYERS.player_member_film, { id: "736" })).toBe("film/736"));
  it("guests watch films on /movie/<tmdb>", () => expect(fillTemplate(DEFAULT_PLAYERS.player_guest_film, { id: "1", tmdb: "6288" })).toBe("movie/6288"));
  it("guests watch series on /tv/<tmdb>/<s>/<e>", () => expect(fillTemplate(DEFAULT_PLAYERS.player_guest_serie, { id: "1", tmdb: "675", s: 1, e: 1 })).toBe("tv/675/1/1"));
  it("no link without required id", () => expect(fillTemplate(DEFAULT_PLAYERS.player_guest_film, { id: "1", tmdb: null })).toBeNull());
  it("guest path does not unlock member player", () => {
    expect(matchesTemplate(DEFAULT_PLAYERS.player_guest_film, "film/736")).toBe(false);
    expect(matchesTemplate(DEFAULT_PLAYERS.player_member_film, "film/736")).toBe(true);
    expect(matchesTemplate(DEFAULT_PLAYERS.player_member_film, "film/736/../x")).toBe(false);
  });
});
