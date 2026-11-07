/** Player link templates, editable by admins in app_settings. Placeholders: {id} site id, {tmdb} TMDB id, {s} season, {e} episode. */
export const PLAYER_KEYS = ["player_member_film", "player_member_serie", "player_guest_film", "player_guest_serie"] as const;
export type PlayerKey = (typeof PLAYER_KEYS)[number];
export type PlayerTemplates = Record<PlayerKey, string>;
export const DEFAULT_PLAYERS: PlayerTemplates = {
  player_member_film: "/film/{id}",
  player_member_serie: "/tvs/{id}/{s}/{e}",
  player_guest_film: "/movie/{tmdb}",
  player_guest_serie: "/tv/{tmdb}/{s}/{e}",
};
export const TEMPLATE_RE = /^(\/([a-z0-9_-]+|\{(id|tmdb|s|e)\}))+$/i;

export function fillTemplate(t: string, v: { id: string; tmdb?: string | null; s?: string | number | null; e?: string | number | null }): string | null {
  const vals: Record<string, string> = { id: v.id, tmdb: String(v.tmdb ?? ""), s: String(v.s || 1), e: String(v.e || 1) };
  let missing = false;
  const out = t.replace(/\{(id|tmdb|s|e)\}/g, (_, k: string) => { const x = vals[k] ?? ""; if (!/^\d+$/.test(x)) missing = true; return x; });
  return missing ? null : out.replace(/^\/+/, "");
}

/** True when a proxied path (without leading slash) fits the template, numbers only in placeholders. */
export function matchesTemplate(t: string, path: string): boolean {
  if (!TEMPLATE_RE.test(t)) return false;
  const re = t.replace(/^\/+/, "").split(/(\{(?:id|tmdb|s|e)\})/).map(p => /^\{/.test(p) ? "\\d+" : p.replace(/[.*+?^$()|[\]\\]/g, "\\$&")).join("");
  return new RegExp(`^${re}$`).test(path);
}

export async function playerTemplates(sb: { from: (t: "app_settings") => any }): Promise<PlayerTemplates> {
  const { data } = await sb.from("app_settings").select("key,value").in("key", PLAYER_KEYS as unknown as string[]);
  const out = { ...DEFAULT_PLAYERS };
  for (const r of (data ?? []) as { key: PlayerKey; value: string }[]) if (TEMPLATE_RE.test(r.value)) out[r.key] = r.value;
  return out;
}
