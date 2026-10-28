import type { Item } from "./api";

export function filterCatalogue(items: Item[], filters: { q: string; type: string; genre: string; year: string }) {
  const q = filters.q.trim().toLocaleLowerCase("fr");
  return items.filter(item => (!q || item.titre.toLocaleLowerCase("fr").includes(q))
    && (filters.type === "all" || item.item_type === filters.type)
    && (!filters.genre || item.genre?.split(",").map(g => g.trim()).includes(filters.genre))
    && (!filters.year || String(item.annee ?? "") === filters.year));
}

export function shuffleFilms(items: Item[], random = Math.random) {
  const films = items.filter(item => item.item_type === "film");
  for (let i = films.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = films[i]; const b = films[j];
    if (a && b) { films[i] = b; films[j] = a; }
  }
  return films;
}