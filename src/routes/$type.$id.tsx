import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { detailsQuery, type Item } from "@/lib/api";
import { Poster, typeLabel } from "@/components/Poster";

export const Route = createFileRoute("/$type/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(detailsQuery(params.type, params.id)),
  head: ({ loaderData, params }) => {
    const it = loaderData?.item;
    const title = it ? `${it.titre} — StreamWall` : "StreamWall";
    const desc = it
      ? `${it.titre} en ${it.qualite ?? ""} ${it.langue ?? ""} sur StreamWall.${it.descr ? ` ${it.descr.slice(0, 140)}` : ""}`
      : "Détail du titre sur StreamWall.";
    const image = it?.backdrop ?? it?.poster ?? null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: params ? [] : [],
    };
  },
  component: Detail,
});

function CastRow({ nom, photo, role }: { nom: string; photo: string; role: string }) {
  const initials = nom
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex w-28 shrink-0 flex-col gap-2">
      <div className="aspect-square overflow-hidden rounded-full bg-card ring-1 ring-border">
        {photo ? (
          <img src={photo} alt={nom} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-xl text-muted-foreground">{initials}</div>
        )}
      </div>
      <p className="line-clamp-2 text-sm font-medium">{nom}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">{role}</p>
    </div>
  );
}

function Detail() {
  const { type, id } = Route.useParams();
  const { data } = useSuspenseQuery(detailsQuery(type, id));
  const item = data.item;

  if (!item) {
    return (
      <div className="min-h-screen">
        <header className="mx-auto flex max-w-7xl items-center px-4 py-4">
          <Link to="/" search={{ type: "all", q: "" }} className="font-display text-2xl font-bold">
            Stream<span className="text-primary">Wall</span>
          </Link>
        </header>
        <p className="py-20 text-center text-muted-foreground">Titre introuvable.</p>
      </div>
    );
  }

  const related: (RelatedItem & { item_type: typeof type })[] = data.related.map((r) => ({ ...r, item_type: type }));

  return (
    <div className="min-h-screen">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-4">
          <Link to="/" search={{ type: "all", q: "" }} className="font-display text-2xl font-bold">
            Stream<span className="text-primary">Wall</span>
          </Link>
          <Link to="/" search={{ type: "all", q: "" }} className="chip ml-auto">
            ← Retour
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {item.backdrop && (
          <img src={item.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-10 pt-24 md:flex-row md:pt-40">
          {item.poster && (
            <img
              src={item.poster}
              alt={item.titre}
              className="hidden w-56 shrink-0 self-start rounded-xl shadow-2xl ring-1 ring-border md:block"
            />
          )}
          <div className="flex flex-col justify-end gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="uppercase tracking-widest text-primary">{typeLabel[item.type as "film"] ?? item.type}</span>
              {item.annee && <span>{item.annee}</span>}
              {item.saison && <span>Saison {item.saison}</span>}
            </div>
            <h1 className="font-display text-4xl font-bold md:text-6xl">{item.titre}</h1>
            <div className="flex flex-wrap gap-2">
              {item.qualite && <span className="badge-primary">{item.qualite}</span>}
              {item.langue && <span className="badge-muted">{item.langue}</span>}
            </div>
            {item.genre && <p className="text-sm text-muted-foreground">{item.genre}</p>}
            {item.descr && <p className="max-w-3xl text-sm leading-relaxed text-foreground/90">{item.descr}</p>}
          </div>
        </div>
      </section>

      {/* Trailer */}
      {item.trailer && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 font-display text-xl font-semibold">Bande-annonce</h2>
          <div className="aspect-video w-full overflow-hidden rounded-xl ring-1 ring-border">
            <iframe
              src={`https://www.youtube.com/embed/${item.trailer}`}
              title={`Bande-annonce — ${item.titre}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </section>
      )}

      {/* Episodes */}
      {data.episodes.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 font-display text-xl font-semibold">Épisodes</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {data.episodes.map((e, i) => {
              const label = [e.saison ? `S${e.saison}` : null, e.episode ? `É${e.episode}` : null]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={i} className="flex items-center gap-4 px-4 py-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">{label || `#${i + 1}`}</span>
                  <span className="text-sm">{e.titre ?? "Épisode"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Cast */}
      {data.cast.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 font-display text-xl font-semibold">Casting</h2>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {data.cast.map((c, i) => (
              <CastRow key={i} nom={c.nom} photo={c.photo} role={c.role} />
            ))}
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 font-display text-xl font-semibold">À voir aussi</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {related.map((r) => (
              <Poster key={r.id} item={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
