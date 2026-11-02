import { heartbeat } from "./admin.functions";
import type { Item } from "./api";

let watching: Item | null = null;
export function beat() {
  if (typeof window === "undefined") return;
  heartbeat({ data: { item: watching as unknown as Record<string, unknown> | null, page: window.location.pathname } }).catch(() => {});
}
export function setWatching(item: Item | null) { watching = item; beat(); }
