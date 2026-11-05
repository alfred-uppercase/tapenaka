import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchDetails, itemsQuery, type Item } from "@/lib/api";
import { Poster, typeLabel } from "@/components/Poster";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Button } from "@/components/ui/button";
import { prepareWatch } from "@/lib/member.functions";
import { toast } from "sonner";
import { setWatching } from "@/lib/presence";

function watchUrl(type: string, id: string | number, saison?: string | null) {
  if (type === "film") return `/api/public/watch/film/${id}`;
  return `/api/public/watch/tvs/${id}/${saison || "1"}/1`;
}

function Modal({
  onClose,
  title,
  fullScreen,
  children,
}: {
  onClose: () => void;
  title: string;
  fullScreen?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex items-center gap-4 border-b border-border px-4 py-3">
        <h2 className="truncate font-display text-lg font-semibold">{title}</h2>
        <Button
          onClick={onClose}
          aria-label="Fermer"
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-xl leading-none ring-1 ring-border transition hover:bg-accent"
        >
          ×
        </Button>
      </div>
      <div className={fullScreen ? "flex-1" : "mx-auto flex w-full max-w-5xl flex-1 items-center p-4"}>{children}</div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/$type/$id")({
  loader: ({ params }) => fetchDetails({ data: { type: params.type, id: params.id } }),
  head: ({ loaderData }) => {
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
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
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
    <div className="flex flex-col gap-2">
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
  const data = Route.useLoaderData();
  const item = data.item;
  const [modal, setModal] = useState<"watch" | "trailer" | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const firstGenre = item?.genre?.split(",")[0]?.trim() ?? "";
  const { data: genreItems } = useQuery({
    ...itemsQuery(item?.type ?? type, firstGenre),
    enabled: firstGenre.length > 0,
  });
  const sameGenre = (genreItems ?? []).filter((g) => String(g.id) !== String(id)).slice(0, 12);

  if (!item) {
    return (
      <div className="min-h-screen">
        <header className="mx-auto flex max-w-7xl items-center px-4 py-4">
          <Link to="/" className="font-display text-2xl font-bold">
            Stream<span className="text-primary">Wall</span>
          </Link>
        </header>
        <p className="py-20 text-center text-muted-foreground">Titre introuvable.</p>
      </div>
    );
  }

  const related: Item[] = data.related.map((r) => ({
    id: String(r.id),
    titre: r.titre,
    poster: r.poster ?? null,
    qualite: null,
    langue: null,
    item_type: type as Item["item_type"],
    saison: null,
  }));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {item.backdrop && (
          <img src={item.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-10 pt-16 md:flex-row md:pt-28">
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
            <div className="mt-2 flex flex-wrap gap-3">
              {item.id && (
                <Button
                  disabled={preparing}
                  onClick={async () => {
                    setPreparing(true);
                    try { const w = { id: String(item.id), titre: item.titre, poster: item.poster, qualite: item.qualite, langue: item.langue, item_type: type as Item["item_type"], saison: item.saison ?? null }; await prepareWatch({ data: w }); setWatching(w); setModal("watch"); }
                    catch { toast.error("Impossible d’ouvrir le lecteur."); }
                    finally { setPreparing(false); }
                  }}
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  ▶ Regarder
                </Button>
              )}
              {item.trailer && (
                <Button
                  variant="secondary"
                  onClick={() => setModal("trailer")}
                  className="flex items-center gap-2 rounded-full bg-card px-6 py-3 font-semibold text-media-foreground ring-1 ring-border transition hover:bg-accent hover:text-media-foreground"
                >
                  🎬 Bande-annonce
                </Button>
              )}
              <FavoriteButton item={{ id: String(item.id), titre: item.titre, poster: item.poster, qualite: item.qualite, langue: item.langue, item_type: type as Item["item_type"], saison: item.saison ?? null }} />
            </div>
          </div>
        </div>
      </section>

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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-5">
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

      {/* Same genre */}
      {mounted && sameGenre.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 font-display text-xl font-semibold">Dans le même genre</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {sameGenre.map((g) => (
              <Poster key={g.id} item={g} />
            ))}
          </div>
        </section>
      )}

      {/* Watch modal (fullscreen) */}
      {modal === "watch" && item.id && (
        <Modal onClose={() => { setWatching(null); setModal(null); }} title={`Vous regardez ${item.titre}`} fullScreen>
          <iframe
            src={watchUrl(type === "film" ? "film" : "serie", item.id, item.saison)}
            title={`Regarder — ${item.titre}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </Modal>
      )}

      {/* Trailer modal */}
      {modal === "trailer" && item.trailer && (
        <Modal onClose={() => setModal(null)} title={`Bande-annonce — ${item.titre}`}>
          <div className="aspect-video w-full overflow-hidden rounded-xl ring-1 ring-border">
            <iframe
              src={`https://www.youtube.com/embed/${item.trailer}?autoplay=1`}
              title={`Bande-annonce — ${item.titre}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
