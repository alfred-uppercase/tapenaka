import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Like requireSupabaseAuth, but guests get an anonymous client and userId null instead of an error. */
export const optionalSupabaseAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const url = process.env["SUPABASE_URL"]!; const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const auth = getRequest()?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); },
    },
  });
  let userId: string | null = null;
  if (token.split(".").length === 3) {
    const { data } = await supabase.auth.getUser(token);
    userId = data.user?.id ?? null;
  }
  return next({ context: { supabase, userId, token: userId ? token : null } });
});
