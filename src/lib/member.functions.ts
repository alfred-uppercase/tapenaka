import { createServerFn } from "@tanstack/react-start";
import { getRequest, setCookie } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { apiOrigin, type Item } from "./api";
import { optionalSupabaseAuth } from "./optional-auth";
import { fillTemplate, playerTemplates, PLAYER_KEYS, TEMPLATE_RE } from "./players";

const itemSchema = z.object({ id: z.string(), titre: z.string(), poster: z.string().nullable(), qualite: z.string().nullable(), langue: z.string().nullable(), item_type: z.enum(["film", "serie", "anime"]), saison: z.string().nullable(), genre: z.string().nullable().optional(), annee: z.number().nullable().optional() });
export const clearWatch = createServerFn({ method: "POST" }).handler(() => {
  setCookie("streamwall_watch", "", { httpOnly: true, sameSite: "strict", path: "/api/public/watch", maxAge: 0 });
  return true;
});
export const memberData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [profile, favorites] = await Promise.all([
    context.supabase.from("profiles").select("username,avatar_path").eq("id", context.userId).single(),
    context.supabase.from("favorites").select("item").order("created_at", { ascending: false }),
  ]);
  if (profile.error) throw profile.error;
  if (favorites.error) throw favorites.error;
  let avatar: string | null = null;
  if (profile.data.avatar_path) {
    const signed = await context.supabase.storage.from("avatars").createSignedUrl(profile.data.avatar_path, 3600);
    avatar = signed.data?.signedUrl ?? null;
  }
  return { profile: { ...profile.data, avatar }, favorites: favorites.data.map(row => row.item as unknown as Item) };
});
export const toggleFavorite = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => z.object({ item: itemSchema, remove: z.boolean() }).parse(data)).handler(async ({ context, data }) => {
  const query = data.remove
    ? context.supabase.from("favorites").delete().eq("user_id", context.userId).eq("item_type", data.item.item_type).eq("item_id", data.item.id)
    : context.supabase.from("favorites").insert({ user_id: context.userId, item_type: data.item.item_type, item_id: data.item.id, item: data.item });
  const { error } = await query;
  if (error) throw error;
  return true;
});
export const rankings = createServerFn({ method: "GET" }).middleware([optionalSupabaseAuth]).handler(async ({ context }) => {
  if (!context.userId) return { trend: [], week: [] } as { trend: { item: Item; views: number }[]; week: { item: Item; views: number }[] };
  const [trend, week] = await Promise.all([context.supabase.rpc("film_rankings", { days: 30 }), context.supabase.rpc("film_rankings", { days: 7 })]);
  if (trend.error) throw trend.error;
  if (week.error) throw week.error;
  return { trend: trend.data.map(row => ({ item: row.item as unknown as Item, views: row.views })), week: week.data.map(row => ({ item: row.item as unknown as Item, views: row.views })) };
});
export const prepareWatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => itemSchema.parse(data)).handler(async ({ context, data }) => {
  // Count a distinct viewer per title in the ranking, not repeated button clicks.
  const { error } = await context.supabase.from("watch_events").insert({ user_id: context.userId, item_id: data.id, item_type: data.item_type, item: data });
  if (error) throw error;
  const token = getRequest().headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Connexion requise");
  setCookie("streamwall_watch", token, { httpOnly: true, secure: new URL(getRequest().url).protocol === "https:", sameSite: "strict", path: "/api/public/watch", maxAge: 300 });
  return true;
});
export type Slide = Item & { descr: string | null; backdrop: string | null };
type Row = { id?: unknown; titre?: unknown; poster?: unknown; qualite?: unknown; langue?: unknown; genre?: unknown; source?: unknown; categorie?: unknown; annee?: unknown };
export const homeExtras = createServerFn({ method: "GET" }).middleware([optionalSupabaseAuth]).handler(async ({ context }) => {
  const O = await apiOrigin(context.supabase);
  const latestP = (async (): Promise<Item[]> => {
    try {
      const res = await fetch(`${O}/api/korotoko.php?tri=recent&limit=6&page=1`, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) return [];
      const json = await res.json() as { data?: Row[] };
      return (json.data ?? []).map(r => { const genre = (r.genre as string) || null; const isSerie = r.source === "series" || r.categorie === "serie";
        return { id: String(r.id), titre: String(r.titre ?? ""), poster: (r.poster as string) || null, qualite: (r.qualite as string) || null, langue: (r.langue as string) || null, item_type: isSerie ? (/anim/i.test(genre ?? "") ? "anime" : "serie") : "film", saison: null, genre, annee: (r.annee as number) ?? null } as Item; });
    } catch { return []; }
  })();
  // "Uniquement pour toi": related titles of the user's 4 most recent distinct watches, excluding already watched ones.
  const forYouP = (async (): Promise<Item[]> => {
    if (!context.userId) return [];
    const { data: rows } = await context.supabase.from("watch_events").select("item_id,item_type,item").eq("user_id", context.userId!).order("viewed_at", { ascending: false }).limit(50);
    if (!rows?.length) return [];
    const seen = new Set(rows.map(r => `${r.item_type}:${r.item_id}`));
    const sources = [...new Map(rows.map(r => [`${r.item_type}:${r.item_id}`, r])).values()].slice(0, 4);
    const lists = await Promise.all(sources.map(async s => {
      try {
        const res = await fetch(`${O}/details_api.php?id=${encodeURIComponent(s.item_id)}&type=${s.item_type}`, { signal: AbortSignal.timeout(8_000) });
        if (!res.ok) return [];
        const d = await res.json() as { related?: Array<{ id: unknown; titre: unknown; poster: unknown; annee?: unknown }> };
        return (d.related ?? []).map(r => ({ id: String(r.id), titre: String(r.titre ?? ""), poster: (r.poster as string) || null, qualite: null, langue: null, item_type: s.item_type as Item["item_type"], saison: null, annee: (r.annee as number) ?? null }) as Item);
      } catch { return []; }
    }));
    const out: Item[] = []; const ids = new Set<string>();
    for (let i = 0; out.length < 12 && i < 20; i++) for (const l of lists) { const it = l[i]; if (!it) continue; const k = `${it.item_type}:${it.id}`; if (seen.has(k) || ids.has(k)) continue; ids.add(k); out.push(it); }
    return out;
  })();
  const sliderP = (async (): Promise<Slide[]> => {
    try {
      const res = await fetch(`${O}/api/api_slider.php`, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) return [];
      const json = await res.json() as { items?: Array<{ id?: unknown; titre?: unknown; poster?: unknown; qualite?: unknown; langue?: unknown; genre?: unknown; type?: unknown; annee?: unknown; descr?: unknown; backdrop?: unknown; baggio?: unknown }> };
      return (json.items ?? []).slice(0, 8).map(r => { const genre = (r.genre as string) || null; const t = r.type === "film" ? "film" : /anim/i.test(genre ?? "") ? "anime" : "serie";
        return { id: String(r.id), titre: String(r.titre ?? ""), poster: (r.poster as string) || null, qualite: (r.qualite as string) || null, langue: (r.langue as string) || null, item_type: t, saison: null, genre, annee: r.annee ? Number(r.annee) : null, descr: (r.descr as string) || null, backdrop: (r.backdrop as string) || (r.baggio as string) || null } as Slide; });
    } catch { return []; }
  })();
  const [latest, forYou, slider] = await Promise.all([latestP, forYouP, sliderP]);
  return { latest, forYou, slider };
});

export const getApiOrigin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => apiOrigin(context.supabase));
export const setApiOrigin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ origin: z.string().url().max(200).refine(u => /^https?:\/\/[^/]+\/?$/.test(u), "Domaine uniquement, ex. https://exemple.com") }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { error } = await context.supabase.from("app_settings").upsert({ key: "api_origin", value: data.origin.replace(/\/+$/, ""), updated_at: new Date().toISOString() });
    if (error) throw error;
    return true;
  });

/** Members get the member player (and are counted in rankings); guests get the ad-supported player. */
export const openPlayer = createServerFn({ method: "POST" }).middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ item: itemSchema, tmdb: z.string().regex(/^\d*$/).max(20).nullable(), season: z.number().int().min(1).max(500), episode: z.number().int().min(1).max(5000) }).parse(d))
  .handler(async ({ context, data }) => {
    const t = await playerTemplates(context.supabase);
    const member = !!context.userId;
    const tpl = member ? (data.item.item_type === "film" ? t.player_member_film : t.player_member_serie) : (data.item.item_type === "film" ? t.player_guest_film : t.player_guest_serie);
    const path = fillTemplate(tpl, { id: data.item.id, tmdb: data.tmdb, s: data.season, e: data.episode });
    if (!path) throw new Error("Lecteur indisponible pour ce titre");
    if (member) {
      const { error } = await context.supabase.from("watch_events").insert({ user_id: context.userId!, item_id: data.item.id, item_type: data.item.item_type, item: data.item });
      if (error) throw error;
      setCookie("streamwall_watch", context.token!, { httpOnly: true, secure: new URL(getRequest().url).protocol === "https:", sameSite: "strict", path: "/api/public/watch", maxAge: 300 });
    }
    return { url: `/api/public/watch/${path}`, member };
  });

export const getPlayers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => playerTemplates(context.supabase));
export const setPlayers = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object(Object.fromEntries(PLAYER_KEYS.map(k => [k, z.string().max(120).regex(TEMPLATE_RE, "Chemin invalide, ex. /film/{id}")]))).parse(d) as Record<(typeof PLAYER_KEYS)[number], string>)
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const now = new Date().toISOString();
    const { error } = await context.supabase.from("app_settings").upsert(PLAYER_KEYS.map(k => ({ key: k, value: data[k], updated_at: now })));
    if (error) throw error;
    return true;
  });
