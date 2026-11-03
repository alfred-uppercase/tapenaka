import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ItemType = "film" | "serie" | "anime";
export type Item = {
  id: string;
  titre: string;
  poster: string | null;
  qualite: string | null;
  langue: string | null;
  item_type: ItemType;
  saison: string | null;
  genre?: string | null;
  annee?: number | null;
};

export type CastMember = { nom: string; photo: string; role: string };
export type RelatedItem = { id: string | number; titre: string; poster: string | null; annee?: number | null };
export type Episode = {
  titre?: string | null;
  saison?: string | number | null;
  episode?: string | number | null;
};
export type Detail = {
  item: {
    id: string | number;
    titre: string;
    descr: string | null;
    fsid?: string | null;
    tmdbId?: string | number | null;
    qualite: string | null;
    langue: string | null;
    type: string;
    poster: string | null;
    trailer: string | null;
    backdrop: string | null;
    genre: string | null;
    annee: number | null;
    saison?: string | null;
  };
  cast: CastMember[];
  related: RelatedItem[];
  episodes: Episode[];
};

export const DEFAULT_API_ORIGIN = "https://streamwall.behoririka.mg";
/** The upstream domain is editable by admins in app_settings (key api_origin). */
export async function apiOrigin(sb: { from: (t: "app_settings") => any }): Promise<string> {
  const { data } = await sb.from("app_settings").select("value").eq("key", "api_origin").maybeSingle();
  return (data?.value as string | undefined)?.replace(/\/+$/, "") || DEFAULT_API_ORIGIN;
}

export const fetchItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { type: string; q: string }) => ({
    type: ["all", "film", "serie", "anime"].includes(d.type) ? d.type : "all",
    q: String(d.q ?? "").slice(0, 100),
  }))
  .handler(async ({ data, context }) => {
    const O = await apiOrigin(context.supabase);
    const res = await fetch(`${O}/api_home.php?type=${data.type}&q=${encodeURIComponent(data.q)}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error("API indisponible");
    const json = (await res.json()) as { items?: Item[] };
    const items = json.items ?? [];
    // The home API omits genre/year; enrich its current catalogue with detail metadata.
    const enriched: Item[] = [];
    for (let i = 0; i < items.length; i += 6) {
      const batch = await Promise.all(items.slice(i, i + 6).map(async (item) => {
        try {
          const response = await fetch(`${O}/details_api.php?id=${encodeURIComponent(item.id)}&type=${item.item_type}`, { signal: AbortSignal.timeout(8_000) });
          if (!response.ok) return item;
          const detail = await response.json() as Partial<Detail>;
          return { ...item, genre: detail.item?.genre ?? null, annee: detail.item?.annee ?? null };
        } catch { return item; }
      }));
      enriched.push(...batch);
    }
    return enriched;
  });

export const fetchDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; type: string }) => ({
    id: String(d.id).slice(0, 20),
    type: ["film", "serie", "anime"].includes(d.type) ? d.type : "film",
  }))
  .handler(async ({ data, context }) => {
    const res = await fetch(`${await apiOrigin(context.supabase)}/details_api.php?id=${encodeURIComponent(data.id)}&type=${data.type}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error("API indisponible");
    const json = (await res.json()) as Partial<Detail>;
    return { item: json.item ?? null, cast: json.cast ?? [], related: json.related ?? [], episodes: json.episodes ?? [] };
  });

export const itemsQuery = (type: string, q: string) =>
  queryOptions({
    queryKey: ["items", type, q],
    queryFn: () => fetchItems({ data: { type, q } }),
    staleTime: 60_000,
  });

export const detailsQuery = (type: string, id: string) =>
  queryOptions({
    queryKey: ["details", type, id],
    queryFn: () => fetchDetails({ data: { type, id } }),
    staleTime: 300_000,
  });

export type CatalogueFilters = { q: string; type: string; genre: string; year: string; page: number };
export type CataloguePage = { total: number; page: number; pages: number; approximatif: boolean; items: Item[] };

/** Builds the upstream query; "anime" maps to series in the Animation genre because the API only knows film/serie. */
export function catalogueParams(f: CatalogueFilters) {
  const p = new URLSearchParams({ tri: f.q ? "pertinence" : "recent", limit: "24", page: String(Math.max(1, f.page)) });
  if (f.q) p.set("titre", f.q);
  if (f.type === "film" || f.type === "serie") p.set("categorie", f.type);
  if (f.type === "anime") { p.set("categorie", "serie"); p.set("genre", f.genre || "Animation"); }
  if (f.genre && f.type !== "anime") p.set("genre", f.genre);
  if (/^\d{4}$/.test(f.year)) p.set("annee", f.year);
  return p;
}

export const fetchCatalogue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CatalogueFilters) => ({
    q: String(d.q ?? "").slice(0, 100).trim(),
    type: ["all", "film", "serie", "anime"].includes(d.type) ? d.type : "all",
    genre: String(d.genre ?? "").slice(0, 60),
    year: /^\d{4}$/.test(String(d.year ?? "")) ? String(d.year) : "",
    page: Math.min(10000, Math.max(1, Number(d.page) || 1)),
  }))
  .handler(async ({ data, context }): Promise<CataloguePage> => {
    const res = await fetch(`${await apiOrigin(context.supabase)}/api/korotoko.php?${catalogueParams(data)}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error("API indisponible");
    const json = (await res.json()) as { total?: number; page?: number; pages?: number; approximatif?: boolean; data?: Array<{ id?: unknown; titre?: unknown; poster?: unknown; qualite?: unknown; langue?: unknown; genre?: unknown; source?: unknown; categorie?: unknown; annee?: unknown }> };
    const items: Item[] = (json.data ?? []).map((r) => {
      const genre = (r.genre as string) || null;
      const isSerie = r.source === "series" || r.categorie === "serie";
      return {
        id: String(r.id), titre: String(r.titre ?? ""), poster: (r.poster as string) || null,
        qualite: (r.qualite as string) || null, langue: (r.langue as string) || null,
        item_type: isSerie ? (/anim/i.test(genre ?? "") ? "anime" : "serie") : "film",
        saison: null, genre, annee: (r.annee as number) ?? null,
      };
    });
    return { total: json.total ?? 0, page: json.page ?? 1, pages: json.pages ?? 1, approximatif: !!json.approximatif, items };
  });

export const fetchCatalogueGenres = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const res = await fetch(`${await apiOrigin(context.supabase)}/api/korotoko.php?filtres=1`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [] as string[];
    const json = (await res.json()) as { genres?: string[] };
    return (json.genres ?? []).filter((g) => /^[\p{L} &'-]{3,30}$/u.test(g));
  });
