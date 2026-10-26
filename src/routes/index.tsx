import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { itemsQuery } from "@/lib/api";
import { Poster } from "@/components/Poster";

const TABS = [
  { v: "all", l: "Tout" },
  { v: "film", l: "Films" },
  { v: "serie", l: "Séries" },
  { v: "anime", l: "Animes" },
] as const;

type Search = { type: string; q: string; qualite?: string | undefined; langue?: string | undefined };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    type: typeof s.type === "string" ? s.type : "all",
    q: typeof s.q === "string" ? s.q : "",
    qualite: typeof s.qualite === "string" ? s.qualite : undefined,
    langue: typeof s.langue === "string" ? s.langue : undefined,
  }),
  head: () => ({
    meta: [
      { title: "StreamWall — Films, séries et animes" },
      { name: "description", content: "Parcourez et recherchez les derniers films, séries et animes sur StreamWall." },
      { property: "og:title", content: "StreamWall — Films, séries et animes" },
      { property: "og:description", content: "Parcourez et recherchez les derniers films, séries et animes." },
    ],
  }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [text, setText] = useState(search.q);

  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== search.q) navigate({ search: (p) => ({ ...p, q: text }), replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [text]);

  const { data = [], isFetching, isError } = useQuery({
    ...itemsQuery(search.type, search.q),
    placeholderData: keepPreviousData,
  });

  const qualites = useMemo(() => [...new Set(data.map((i) => i.qualite).filter(Boolean))] as string[], [data]);
  const langues = useMemo(() => [...new Set(data.map((i) => i.langue).filter(Boolean))] as string[], [data]);
  const items = data.filter(
    (i) => (!search.qualite || i.qualite === search.qualite) && (!search.langue || i.langue === search.langue),
  );
  const set = (patch: Partial<Search>) => navigate({ search: (p) => ({ ...p, ...patch }) });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" search={{ type: "all", q: "" }} onClick={() => setText("")} className="font-display text-2xl font-bold tracking-tight">
            Stream<span className="text-primary">Wall</span>
          </Link>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button key={t.v} onClick={() => set({ type: t.v })}
                className={search.type === t.v ? "chip chip-active" : "chip"}>{t.l}</button>
            ))}
          </nav>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Rechercher un titre…"
            className="ml-auto w-full rounded-full border border-input bg-card px-4 py-2 text-sm outline-none focus:border-primary sm:w-72" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select value={search.qualite ?? ""} onChange={(e) => set({ qualite: e.target.value || undefined })} className="select">
            <option value="">Toutes qualités</option>
            {qualites.map((q) => <option key={q}>{q}</option>)}
          </select>
          <select value={search.langue ?? ""} onChange={(e) => set({ langue: e.target.value || undefined })} className="select">
            <option value="">Toutes langues</option>
            {langues.map((q) => <option key={q}>{q}</option>)}
          </select>
          <span className="text-sm text-muted-foreground">
            {isFetching ? "Chargement…" : `${items.length} résultat${items.length > 1 ? "s" : ""}`}
          </span>
        </div>

        {isError ? (
          <p className="py-20 text-center text-muted-foreground">Impossible de charger le catalogue.</p>
        ) : items.length === 0 && !isFetching ? (
          <p className="py-20 text-center text-muted-foreground">Aucun résultat.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((i) => <Poster key={i.item_type + i.id} item={i} />)}
          </div>
        )}
      </main>
    </div>
  );
}
