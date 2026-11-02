import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Item } from "./api";

export const ONLINE_WINDOW_MS = 90_000;

export const heartbeat = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ item: z.record(z.string(), z.unknown()).nullable(), page: z.string().max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("user_presence").upsert({ user_id: context.userId, last_seen: new Date().toISOString(), current_item: data.item as never, page: data.page });
    if (error) throw error;
    return true;
  });

export const amIAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return Boolean(data);
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Accès réservé aux administrateurs");
}

export const adminOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context);
  const [users, top7, top30] = await Promise.all([context.supabase.rpc("admin_users"), context.supabase.rpc("admin_top_titles", { days: 7 }), context.supabase.rpc("admin_top_titles", { days: 30 })]);
  for (const r of [users, top7, top30]) if (r.error) throw r.error;
  const now = Date.now();
  return {
    users: (users.data ?? []).map(u => ({ ...u, current_item: u.current_item as unknown as Item | null, online: !!u.last_seen && now - new Date(u.last_seen).getTime() < ONLINE_WINDOW_MS })),
    top7: (top7.data ?? []).map(r => ({ item: r.item as unknown as Item, viewers: r.viewers, plays: r.plays })),
    top30: (top30.data ?? []).map(r => ({ item: r.item as unknown as Item, viewers: r.viewers, plays: r.plays })),
  };
});

export const adminUserHistory = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.from("watch_events").select("id,item,viewed_at").eq("user_id", data.userId).order("viewed_at", { ascending: false }).limit(100);
    if (error) throw error;
    return rows.map(r => ({ id: r.id, viewed_at: r.viewed_at, item: r.item as unknown as Item }));
  });
