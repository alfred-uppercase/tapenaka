import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";

export type ItemType = "film" | "serie" | "anime";
export type Item = {
  id: string;
  titre: string;
  poster: string | null;
  qualite: string | null;
  langue: string | null;
  item_type: ItemType;
  saison: string | null;
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

const BASE = "https://streamwall.behoririka.mg/api_home.php";
const BASE_DETAILS = "https://streamwall.behoririka.mg/details_api.php";

export const fetchItems = createServerFn({ method: "GET" })
  .inputValidator((d: { type: string; q: string }) => ({
    type: ["all", "film", "serie", "anime"].includes(d.type) ? d.type : "all",
    q: String(d.q ?? "").slice(0, 100),
  }))
  .handler(async ({ data }) => {
    const res = await fetch(`${BASE}?type=${data.type}&q=${encodeURIComponent(data.q)}`);
    if (!res.ok) throw new Error("API indisponible");
    const json = (await res.json()) as { items?: Item[] };
    return json.items ?? [];
  });

export const fetchDetails = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string; type: string }) => ({
    id: String(d.id).slice(0, 20),
    type: ["film", "serie", "anime"].includes(d.type) ? d.type : "film",
  }))
  .handler(async ({ data }) => {
    const res = await fetch(`${BASE_DETAILS}?id=${encodeURIComponent(data.id)}&type=${data.type}`);
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
