import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { itemsQuery } from "@/lib/api";
import { Poster, typeLabel } from "@/components/Poster";

export const Route = createFileRoute("/$type/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(itemsQuery(params.type, "")),
  head: ({ loaderData, params }) => {
    const it = loaderData?.find((i) => i.id === params.id);
    const title = it ? `${it.titre} — StreamWall` : "StreamWall";
    const desc = it ? `${it.titre} en ${it.qualite ?? ""} ${it.langue ?? ""} sur StreamWall.` : "Détail du titre sur StreamWall.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(it?.poster ? [{ property: "og:image", content: it.poster }, { name: "twitter:image", content: it.poster }] : []),
      ],
    };
  },
  component: Detail,
});

function Detail() {
  const { type, id } = Route.useParams();
  const { data } = useSuspenseQuery(itemsQuery(type, ""));
  const item = data.find((i) => i.id === id);
  const more = data.filter((i) => i.id !== id).slice(0, 12);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center px-4 py-4">
        <Link to="/" search={{ type: "all", q: "" }} className="font-display text-2xl font-bold">
          Stream<span className="text-primary">Wall</span>
        </Link>
        <Link to="/" search={{ type: "all", q: "" }} className="chip ml-auto">← Retour</Link>
      </header>
      {!item ? (
        <p className="py-20 text-center text-muted-foreground">Titre introuvable.</p>
      ) : (
        <>
          <section className="relative overflow-hidden">
            {item.poster && <img src={item.poster} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl" />}
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:flex-row">
              {item.poster && <img src={item.poster} alt={item.titre} className="w-56 rounded-xl shadow-2xl ring-1 ring-border" />}
              <div className="flex flex-col justify-end gap-4">
                <span className="text-sm uppercase tracking-widest text-primary">{typeLabel[item.item_type]}</span>
                <h1 className="font-display text-4xl font-bold md:text-6xl">{item.titre}</h1>
                <div className="flex flex-wrap gap-2">
                  {item.qualite && <span className="badge-primary">{item.qualite}</span>}
                  {item.langue && <span className="badge-muted">{item.langue}</span>}
                  {item.saison && <span className="badge-muted">Saison {item.saison}</span>}
                </div>
              </div>
            </div>
          </section>
          <section className="mx-auto max-w-7xl px-4 py-8">
            <h2 className="mb-4 font-display text-xl font-semibold">À voir aussi</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {more.map((i) => <Poster key={i.id} item={i} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
