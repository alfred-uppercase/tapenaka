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

const BASE = "https://streamwall.behoririka.mg/api_home.php";

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

export const itemsQuery = (type: string, q: string) =>
  queryOptions({
    queryKey: ["items", type, q],
    queryFn: () => fetchItems({ data: { type, q } }),
    staleTime: 60_000,
  });
