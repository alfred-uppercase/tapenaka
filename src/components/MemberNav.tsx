import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { LogOut, Shield, UserRound } from "lucide-react";
import { Button } from "./ui/button";
import { memberQuery } from "@/lib/member";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { clearWatch } from "@/lib/member.functions";
import { amIAdmin } from "@/lib/admin.functions";
import { beat, setWatching } from "@/lib/presence";

export function MemberNav() {
  const { data } = useQuery(memberQuery); const client = useQueryClient(); const navigate = useNavigate();
  const { data: isAdmin } = useQuery({ queryKey: ["is-admin"], queryFn: () => amIAdmin(), staleTime: 300_000 });
  const path = useRouterState({ select: s => s.location.pathname });
  useEffect(() => { setWatching(null); }, [path]);
  useEffect(() => { const t = setInterval(beat, 30_000); return () => clearInterval(t); }, []);
  async function logout() {
    await client.cancelQueries(); client.clear();
    await clearWatch();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Déconnexion impossible."); return; }
    await navigate({ to: "/auth", replace: true });
  }
  return <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
    <Link to="/" className="mr-4 font-display text-2xl font-bold">Stream<span className="text-primary">Wall</span></Link>
    <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Menu principal">{([{ to: "/", label: "Accueil" }, { to: "/catalogue", label: "Catalogue" }, { to: "/suggestion", label: "Suggestion" }, { to: "/favoris", label: "Favoris" }] as const).map(link => <Button key={link.to} asChild variant="ghost"><Link to={link.to} activeProps={{ className: "bg-accent text-primary" }} activeOptions={{ exact: true }}>{link.label}</Link></Button>)}
      {isAdmin && <Button asChild variant="ghost"><Link to="/admin" activeProps={{ className: "bg-accent text-primary" }}><Shield />Admin</Link></Button>}</nav>
    <Button asChild variant="ghost" className="ml-auto"><Link to="/profil">{data?.profile.avatar ? <img src={data.profile.avatar} alt="" className="size-7 rounded-full object-cover" /> : <UserRound />}<span className="hidden sm:inline">{data?.profile.username || "Mon profil"}</span></Link></Button>
    <Button variant="ghost" size="icon" aria-label="Se déconnecter" title="Se déconnecter" onClick={logout}><LogOut /></Button>
  </div></header>;
}
