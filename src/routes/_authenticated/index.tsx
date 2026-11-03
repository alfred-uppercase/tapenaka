import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { rankingsQuery, homeExtrasQuery } from "@/lib/member";
import { Poster } from "@/components/Poster";
import { Button } from "@/components/ui/button";
import type { Item } from "@/lib/api";
export const Route = createFileRoute("/_authenticated/")({ loader: ({ context }) => context.queryClient.ensureQueryData(rankingsQuery), head: () => ({ meta: [{ title: 'Accueil — StreamWall' }, { name: "description", content: 'Derniers ajouts, top de la semaine et suggestions personnalisées sur StreamWall.' }, { property: "og:title", content: 'Accueil — StreamWall' }, { property: "og:description", content: 'Derniers ajouts, top de la semaine et suggestions personnalisées.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Home });
const Grid = ({ items }: { items: Item[] }) => <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{items.map(it => <Poster key={`${it.item_type}${it.id}`} item={it} />)}</div>;
function Home() {
  const { data } = useSuspenseQuery(rankingsQuery);
  const extras = useQuery(homeExtrasQuery);
  return <main className="mx-auto max-w-7xl px-4 py-10">
    <h1 className="mb-10 font-display text-4xl font-bold">À l’affiche sur <span className="text-primary">StreamWall</span></h1>
    <section className="mb-12"><h2 className="mb-6 font-display text-2xl">Derniers ajouts</h2>
      {extras.isLoading ? <p className="text-muted-foreground">Chargement…</p> : extras.data?.latest.length ? <Grid items={extras.data.latest} /> : <p className="text-muted-foreground">Indisponible pour le moment.</p>}</section>
    {!!extras.data?.forYou.length && <section className="mb-12"><h2 className="mb-6 font-display text-2xl">Uniquement pour toi</h2><Grid items={extras.data.forYou} /></section>}
    <section className="mb-12"><h2 className="mb-6 font-display text-2xl">Top de la semaine</h2>{data.week.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{data.week.map((r, i) => <div key={r.item.id}><p className="mb-2 text-sm text-primary">#{i + 1} · {r.views} spectateur{r.views > 1 ? "s" : ""}</p><Poster item={r.item} /></div>)}</div> : <div className="border-y border-border py-12"><p className="mb-5 text-muted-foreground">Aucun visionnage enregistré pour le moment.</p><Button asChild variant="outline"><Link to="/catalogue">Explorer le catalogue →</Link></Button></div>}</section>
  </main>;
}
