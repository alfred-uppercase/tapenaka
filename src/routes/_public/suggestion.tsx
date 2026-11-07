import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Shuffle } from "lucide-react";
import { itemsQuery } from "@/lib/api";
import { shuffleFilms } from "@/lib/discovery";
import { Poster } from "@/components/Poster";
import { Button } from "@/components/ui/button";
const query=itemsQuery("all","");
export const Route=createFileRoute("/_public/suggestion")({loader:({context})=>context.queryClient.ensureQueryData(query),head: () => ({ meta: [{ title: 'Suggestions — StreamWall' }, { name: "description", content: 'Des films choisis au hasard dans le catalogue.' }, { property: "og:title", content: 'Suggestions — StreamWall' }, { property: "og:description", content: 'Des films choisis au hasard dans le catalogue.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),component:Suggestions});
function Suggestions(){const {data}=useSuspenseQuery(query);const [films,setFilms]=useState(()=>shuffleFilms(data).slice(0,12));return <main className="mx-auto max-w-7xl px-4 py-10"><div className="mb-8 flex flex-wrap items-center justify-between gap-4"><h1 className="font-display text-4xl font-bold">Suggestion</h1><Button onClick={()=>setFilms(shuffleFilms(data).slice(0,12))}><Shuffle/>Nouvelle sélection</Button></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{films.map(i=><Poster key={i.id} item={i}/>)}</div></main>;}
