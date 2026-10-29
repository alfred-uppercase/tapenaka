import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { memberQuery } from "@/lib/member";
import { Poster } from "@/components/Poster";
export const Route=createFileRoute("/_authenticated/favoris")({loader:({context})=>context.queryClient.ensureQueryData(memberQuery),head: () => ({ meta: [{ title: 'Mes favoris — StreamWall' }, { name: "description", content: 'Vos films, séries et animes favoris.' }, { property: "og:title", content: 'Mes favoris — StreamWall' }, { property: "og:description", content: 'Vos films, séries et animes favoris.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),component:Favorites});
function Favorites(){const {data}=useSuspenseQuery(memberQuery);return <main className="mx-auto max-w-7xl px-4 py-10"><h1 className="mb-8 font-display text-4xl font-bold">Mes favoris</h1>{data.favorites.length?<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{data.favorites.map(i=><Poster key={i.item_type+i.id} item={i}/>)}</div>:<p className="text-muted-foreground">Vous n’avez pas encore de favoris.</p>}</main>;}
