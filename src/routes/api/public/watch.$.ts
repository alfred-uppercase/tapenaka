import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { apiOrigin } from "@/lib/api";

// Only allow watch pages: film/<id> or tvs/<id>/<season>/<episode>
const PATH_RE = /^(film\/\d+|tvs\/\d+(\/\d+){0,2})$/;

export const Route = createFileRoute("/api/public/watch/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const token = request.headers.get("cookie")?.split(";").map(c => c.trim()).find(c => c.startsWith("streamwall_watch="))?.slice("streamwall_watch=".length);
        const url = process.env["SUPABASE_URL"]; const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!token || !url || !key) return new Response("Connexion requise", { status: 401 });
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers }); } } });
        const { data, error } = await client.auth.getUser(decodeURIComponent(token));
        if (error || !data.user) return new Response("Connexion requise", { status: 401 });
        const STREAM_ORIGIN = await apiOrigin(client as never);
        const splat = params._splat ?? "";
        if (!PATH_RE.test(splat)) {
          return new Response("Not found", { status: 404 });
        }
        const upstream = await fetch(`${STREAM_ORIGIN}/${splat}`, {
          headers: { "user-agent": "Mozilla/5.0 (StreamWall proxy)" },
        });
        if (!upstream.ok) {
          return new Response("Not found", { status: 404 });
        }
        let html = await upstream.text();
        // Resolve relative URLs (assets, proxy_vidzy.php fetch) against the origin
        html = html.replace(/<head>/i, `<head><base href="${STREAM_ORIGIN}/">`);
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
        });
      },
    },
  },
});
