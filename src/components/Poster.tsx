import { Link } from "@tanstack/react-router";
import type { Item } from "@/lib/api";

export const typeLabel = { film: "Film", serie: "Série", anime: "Anime" } as const;

export function Poster({ item }: { item: Item }) {
  return (
    <Link
      to="/$type/$id"
      params={{ type: item.item_type, id: item.id }}
      className="group block"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-card ring-1 ring-border transition group-hover:ring-primary">
        {item.poster ? (
          <img src={item.poster} alt={item.titre} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-sm text-muted-foreground">{item.titre}</div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {item.qualite && <span className="badge-primary">{item.qualite}</span>}
        </div>
        <span className="badge-muted absolute bottom-2 right-2">{typeLabel[item.item_type]}</span>
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-medium">{item.titre}</p>
      <p className="text-xs text-muted-foreground">{item.langue}</p>
    </Link>
  );
}
