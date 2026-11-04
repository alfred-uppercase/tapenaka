import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { rankingsQuery, homeExtrasQuery } from "@/lib/member";
import { Poster } from "@/components/Poster";
import { Button } from "@/components/ui/button";
import type { Item } from "@/lib/api";
import type { Slide } from "@/lib/member.functions";
import { useEffect, useState } from "react";
import { typeLabel } from "@/components/Poster";
function Slider({ items }: { items: Slide[] }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(v => (v + 1) % items.length), 6000); return () => clearInterval(t); }, [items.length]);
  const it = items[i] ?? items[0];
  if (!it) return null;
  return <section className="relative mb-12 overflow-hidden rounded-2xl border border-border bg-card">
    {items.map((x, k) => <img key={x.id} src={x.backdrop ?? x.poster ?? ""} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${x.backdrop ? "" : "scale-110 blur-2xl"} ${k === i ? "opacity-60" : "opacity-0"}`} />)}
    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
    <div className="relative flex min-h-[420px] items-center gap-8 p-6 md:p-10">
      <div key={it.id} className="flex flex-1 flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <span className="text-xs uppercase tracking-widest text-primary">À la une · {typeLabel[it.item_type as "film"] ?? it.item_type}</span>
        <h1 className="font-display text-3xl font-bold md:text-5xl">{it.titre}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{it.annee && <span>{it.annee}</span>}{it.genre && <span>· {it.genre}</span>}</div>
        {it.descr && <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-foreground/85">{it.descr}</p>}
        <div className="flex gap-2">{it.qualite && <span className="badge-primary">{it.qualite}</span>}{it.langue && <span className="badge-muted">{it.langue}</span>}</div>
        <Button asChild className="w-fit rounded-full"><Link to="/$type/$id" params={{ type: it.item_type, id: String(it.id) }}>▶ Voir le titre</Link></Button>
      </div>
      {it.poster && <img key={`p${it.id}`} src={it.poster} alt={it.titre} className="hidden w-44 rounded-xl shadow-2xl ring-1 ring-border animate-in fade-in zoom-in-95 duration-500 md:block" />}
    </div>
    <div className="absolute bottom-4 left-6 flex gap-2 md:left-10">{items.map((x, k) => <button key={x.id} aria-label={`Afficher ${x.titre}`} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-primary" : "w-3 bg-muted-foreground/50"}`} />)}</div>
  </section>;
}
export const Route = createFileRoute("/_authenticated/")({ loader: ({ context }) => context.queryClient.ensureQueryData(rankingsQuery), head: () => ({ meta: [{ title: 'Accueil — StreamWall' }, { name: "description", content: 'Derniers ajouts, top de la semaine et suggestions personnalisées sur StreamWall.' }, { property: "og:title", content: 'Accueil — StreamWall' }, { property: "og:description", content: 'Derniers ajouts, top de la semaine et suggestions personnalisées.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Home });
const Grid = ({ items }: { items: Item[] }) => <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{items.map(it => <Poster key={`${it.item_type}${it.id}`} item={it} />)}</div>;
function Home() {
  const { data } = useSuspenseQuery(rankingsQuery);
  const extras = useQuery(homeExtrasQuery);
  return <main className="mx-auto max-w-7xl px-4 py-10">
    {!!(extras.data?.slider.length || extras.data?.latest.length) && <Slider items={extras.data.slider.length ? extras.data.slider : extras.data.latest.map(x => ({ ...x, descr: null, backdrop: null }))} />}
    <section className="mb-12"><h2 className="mb-6 font-display text-2xl">Derniers ajouts</h2>
      {extras.isLoading ? <p className="text-muted-foreground">Chargement…</p> : extras.data?.latest.length ? <Grid items={extras.data.latest} /> : <p className="text-muted-foreground">Indisponible pour le moment.</p>}</section>
    {!!extras.data?.forYou.length && <section className="mb-12"><h2 className="mb-6 font-display text-2xl">Uniquement pour toi</h2><Grid items={extras.data.forYou} /></section>}
    <section className="mb-12"><h2 className="mb-6 font-display text-2xl">Top de la semaine</h2>{data.week.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{data.week.map((r, i) => <div key={r.item.id}><p className="mb-2 text-sm text-primary">#{i + 1} · {r.views} spectateur{r.views > 1 ? "s" : ""}</p><Poster item={r.item} /></div>)}</div> : <div className="border-y border-border py-12"><p className="mb-5 text-muted-foreground">Aucun visionnage enregistré pour le moment.</p><Button asChild variant="outline"><Link to="/catalogue">Explorer le catalogue →</Link></Button></div>}</section>
  </main>;
}
