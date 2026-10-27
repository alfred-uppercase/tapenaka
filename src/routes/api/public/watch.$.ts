import { createFileRoute } from "@tanstack/react-router";

const STREAM_ORIGIN = "https://streamwall.behoririka.mg";

// Only allow watch pages: movie/<id> or serie/<id>/<season>/<episode>
const PATH_RE = /^(movie|serie)\/\d+(\/\d+){0,2}$/;

export const Route = createFileRoute("/api/public/watch/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
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
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
