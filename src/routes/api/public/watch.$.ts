import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { apiOrigin } from "@/lib/api";
import { matchesTemplate, playerTemplates } from "@/lib/players";


export const Route = createFileRoute("/api/public/watch/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = process.env["SUPABASE_URL"]; const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return new Response("Indisponible", { status: 503 });
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers }); } } });
        const splat = params._splat ?? "";
        const t = await playerTemplates(client as never);
        // Guest (ad-supported) players are open; member players require the short-lived session cookie.
        const guest = matchesTemplate(t.player_guest_film, splat) || matchesTemplate(t.player_guest_serie, splat);
        if (!guest) {
          if (!matchesTemplate(t.player_member_film, splat) && !matchesTemplate(t.player_member_serie, splat)) return new Response("Not found", { status: 404 });
          const token = request.headers.get("cookie")?.split(";").map(c => c.trim()).find(c => c.startsWith("streamwall_watch="))?.slice("streamwall_watch=".length);
          if (!token) return new Response("Connexion requise", { status: 401 });
          const { data, error } = await client.auth.getUser(decodeURIComponent(token));
          if (error || !data.user) return new Response("Connexion requise", { status: 401 });
        }
        const STREAM_ORIGIN = await apiOrigin(client as never);
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
