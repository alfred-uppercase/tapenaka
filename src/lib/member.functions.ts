import { createServerFn } from "@tanstack/react-start";
import { getRequest, setCookie } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Item } from "./api";

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
export const rankings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
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