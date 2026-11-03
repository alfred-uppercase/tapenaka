import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { fetchCatalogue, fetchCatalogueGenres } from "@/lib/api";
import { Poster } from "@/components/Poster";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/catalogue")({ head: () => ({ meta: [{ title: "Catalogue — StreamWall" }, { name: "description", content: "Tout le catalogue de films, séries et animes : recherche, genre et année." }, { property: "og:title", content: "Catalogue — StreamWall" }, { property: "og:description", content: "Tout le catalogue de films, séries et animes : recherche, genre et année." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Catalogue });

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1915 + 1 }, (_, i) => CURRENT_YEAR - i);

function Catalogue() {
  const [input, setInput] = useState(""); const [q, setQ] = useState("");
  const [type, setType] = useState("all"); const [genre, setGenre] = useState(""); const [year, setYear] = useState(""); const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setQ(input.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [input]);
  const filters = { q, type, genre, year, page };
  const { data, isFetching, isError } = useQuery({ queryKey: ["catalogue", filters], queryFn: () => fetchCatalogue({ data: filters }), placeholderData: keepPreviousData, staleTime: 60_000 });
  const { data: genres = [] } = useQuery({ queryKey: ["catalogue-genres"], queryFn: () => fetchCatalogueGenres(), staleTime: 3_600_000 });
  const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };
  const items = data?.items ?? [];
  return <main className="mx-auto max-w-7xl px-4 py-10">
    <h1 className="mb-6 font-display text-4xl font-bold">Catalogue</h1>
    <div className="relative mb-6"><Search className="absolute left-5 top-7 size-6 text-primary"/><input aria-label="Rechercher un titre" value={input} onChange={e=>setInput(e.target.value)} placeholder="Quel titre recherchez-vous ?" className="h-20 w-full rounded-lg border border-input bg-card pl-16 pr-4 text-xl outline-none focus:border-primary"/></div>
    <div className="mb-8 flex flex-wrap gap-3">
      {[{v:"all",l:"Tout"},{v:"film",l:"Film"},{v:"anime",l:"Anime"},{v:"serie",l:"Série"}].map(t=><Button key={t.v} variant={type===t.v?"default":"ghost"} aria-pressed={type===t.v} onClick={()=>set(setType)(t.v)}>{t.l}</Button>)}
      <select aria-label="Genre" className="select" value={genre} onChange={e=>set(setGenre)(e.target.value)}><option value="">Tous les genres</option>{genres.map(g=><option key={g}>{g}</option>)}</select>
      <select aria-label="Année de sortie" className="select" value={year} onChange={e=>set(setYear)(e.target.value)}><option value="">Année de sortie</option>{YEARS.map(y=><option key={y}>{y}</option>)}</select>
      <Button variant="ghost" onClick={()=>{setInput("");setQ("");setType("all");setGenre("");setYear("");setPage(1);}}>Réinitialiser</Button>
    </div>
    <div className="mb-5 flex justify-between"><h2 className="font-display text-xl">{q ? "Résultats" : "Derniers ajouts"}</h2><p aria-live="polite" className="text-sm text-muted-foreground">{isFetching ? "Chargement…" : `${data?.total ?? 0} résultat${(data?.total ?? 0) > 1 ? "s" : ""}${data?.approximatif ? " (approchants)" : ""}`}</p></div>
    {isError ? <p className="py-16 text-center text-muted-foreground">Le catalogue est indisponible pour le moment.</p>
      : items.length ? <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 transition-opacity ${isFetching ? "opacity-60" : ""}`}>{items.map(i=><Poster key={i.item_type+i.id} item={i}/>)}</div>
      : <p className="py-16 text-center text-muted-foreground">{data ? "Aucun résultat." : "Chargement…"}</p>}
    {data && data.pages > 1 && <div className="mt-10 flex items-center justify-center gap-4"><Button variant="ghost" disabled={page<=1} onClick={()=>{setPage(p=>p-1);scrollTo({top:0});}}>Précédent</Button><span className="text-sm text-muted-foreground">Page {data.page} / {data.pages}</span><Button variant="ghost" disabled={page>=data.pages} onClick={()=>{setPage(p=>p+1);scrollTo({top:0});}}>Suivant</Button></div>}
  </main>;
}
