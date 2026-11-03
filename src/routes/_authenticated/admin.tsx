import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminOverview, adminUserHistory } from "@/lib/admin.functions";
import { getApiOrigin, setApiOrigin } from "@/lib/member.functions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Item } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administration — StreamWall" }, { name: "description", content: "Gestion des utilisateurs et statistiques de visionnage StreamWall." }, { property: "og:title", content: "Administration — StreamWall" }, { property: "og:description", content: "Gestion des utilisateurs et statistiques." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

const typeName = { film: "Film", serie: "Série", anime: "Anime" } as const;
function ItemLine({ item, extra }: { item: Item; extra?: string }) {
  return <Link to="/$type/$id" params={{ type: item.item_type, id: String(item.id) }} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
    {item.poster ? <img src={item.poster} alt="" className="h-14 w-10 rounded object-cover" /> : <div className="h-14 w-10 rounded bg-muted" />}
    <div className="min-w-0 flex-1"><p className="truncate font-medium">{item.titre}</p><p className="text-xs text-muted-foreground">{typeName[item.item_type] ?? item.item_type}{item.saison ? ` · ${item.saison}` : ""}</p></div>
    {extra && <span className="text-sm text-muted-foreground">{extra}</span>}
  </Link>;
}

function AdminPage() {
  const { data, error, isLoading } = useQuery({ queryKey: ["admin"], queryFn: () => adminOverview(), refetchInterval: 15_000 });
  const [period, setPeriod] = useState<"top7" | "top30">("top7");
  const [selected, setSelected] = useState<string | null>(null);
  const history = useQuery({ queryKey: ["admin-history", selected], queryFn: () => adminUserHistory({ data: { userId: selected! } }), enabled: !!selected });
  if (isLoading) return <main className="mx-auto max-w-7xl px-4 py-10 text-muted-foreground">Chargement…</main>;
  if (error || !data) return <main className="mx-auto max-w-7xl px-4 py-10"><h1 className="font-display text-2xl">Accès refusé</h1><p className="text-muted-foreground">Cette page est réservée aux administrateurs.</p></main>;
  const online = data.users.filter(u => u.online);
  const user = data.users.find(u => u.id === selected);
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
    <h1 className="font-display text-3xl font-bold">Administration</h1>
    <div className="grid gap-4 sm:grid-cols-3">
      {[["Utilisateurs", data.users.length], ["En ligne", online.length], ["En lecture", online.filter(u => u.current_item).length]].map(([l, v]) => <div key={l} className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{l}</p><p className="font-display text-3xl font-bold">{v}</p></div>)}
    </div>
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-xl">Gestion des utilisateurs</h2>
        <ul className="divide-y divide-border">{data.users.map(u => <li key={u.id}><button onClick={() => setSelected(u.id)} className={`flex w-full items-center gap-3 p-3 text-left hover:bg-accent ${selected === u.id ? "bg-accent" : ""}`}>
          <span className={`size-2.5 rounded-full ${u.online ? "bg-primary" : "bg-muted"}`} aria-label={u.online ? "En ligne" : "Hors ligne"} />
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{u.username || "Sans pseudo"}{u.is_admin && <span className="ml-2 text-xs text-primary">admin</span>}</span><span className="block truncate text-xs text-muted-foreground">{u.email}</span></span>
          <span className="text-right text-xs text-muted-foreground">{u.online ? (u.current_item ? `▶ ${u.current_item.titre}` : "En ligne") : u.last_seen ? `Vu ${new Date(u.last_seen).toLocaleString("fr-FR")}` : "Jamais vu"}<br />{u.plays} lecture(s)</span>
        </button></li>)}</ul>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        {!user ? <p className="text-muted-foreground">Cliquez sur un utilisateur pour voir ce qu’il regarde et son historique.</p> : <>
          <h2 className="font-display text-xl">{user.username || user.email}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{user.online ? "En ligne" : "Hors ligne"} · inscrit le {new Date(user.created_at).toLocaleDateString("fr-FR")}</p>
          <h3 className="mb-2 font-semibold">En cours de lecture</h3>
          {user.online && user.current_item ? <ItemLine item={user.current_item} extra="maintenant" /> : <p className="mb-2 text-sm text-muted-foreground">Rien en ce moment.</p>}
          <h3 className="mb-2 mt-5 font-semibold">Historique de visionnage</h3>
          {history.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : history.data?.length ? <div className="max-h-[28rem] overflow-y-auto">{history.data.map(h => <ItemLine key={h.id} item={h.item} extra={new Date(h.viewed_at).toLocaleString("fr-FR")} />)}</div> : <p className="text-sm text-muted-foreground">Aucun visionnage.</p>}
        </>}
      </section>
    </div>
    <ApiSettings />
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="mr-auto font-display text-xl">Films et séries les plus regardés</h2>
        <Button variant={period === "top7" ? "default" : "ghost"} onClick={() => setPeriod("top7")}>7 jours</Button><Button variant={period === "top30" ? "default" : "ghost"} onClick={() => setPeriod("top30")}>30 jours</Button></div>
      {data[period].length ? <div className="grid gap-1 md:grid-cols-2">{data[period].map((r, i) => <ItemLine key={i} item={r.item} extra={`${r.viewers} spectateur(s) · ${r.plays} lecture(s)`} />)}</div> : <p className="text-muted-foreground">Aucun visionnage sur cette période.</p>}
    </section>
  </main>;
}

function ApiSettings() {
  const qc = useQueryClient();
  const current = useQuery({ queryKey: ["api-origin"], queryFn: () => getApiOrigin() });
  const [value, setValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const v = value ?? current.data ?? "";
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await setApiOrigin({ data: { origin: v.trim() } }); toast.success("Domaine de l’API mis à jour"); setValue(null); await qc.invalidateQueries(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Échec de l’enregistrement"); }
    finally { setSaving(false); }
  }
  return <section className="rounded-xl border border-border bg-card p-5">
    <h2 className="mb-1 font-display text-xl">Paramètres</h2>
    <p className="mb-4 text-sm text-muted-foreground">Nom de domaine utilisé pour le catalogue, les détails et le lecteur.</p>
    <form onSubmit={save} className="flex flex-wrap gap-2">
      <input value={v} onChange={e => setValue(e.target.value)} placeholder="https://streamwall.behoririka.mg" className="min-w-64 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <Button type="submit" disabled={saving || !v}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  </section>;
}
