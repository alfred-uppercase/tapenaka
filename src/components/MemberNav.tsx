import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "./ui/button";
import { memberQuery } from "@/lib/member";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function MemberNav() {
  const { data } = useQuery(memberQuery); const client = useQueryClient(); const navigate = useNavigate();
  async function logout() {
    await client.cancelQueries(); client.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Déconnexion impossible."); return; }
    await navigate({ to: "/auth", replace: true });
  }
  return <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
    <Link to="/" className="mr-4 font-display text-2xl font-bold">Stream<span className="text-primary">Wall</span></Link>
    <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Menu principal">{([{ to: "/", label: "Accueil" }, { to: "/catalogue", label: "Catalogue" }, { to: "/suggestion", label: "Suggestion" }, { to: "/favoris", label: "Favoris" }] as const).map(link => <Button key={link.to} asChild variant="ghost"><Link to={link.to} activeProps={{ className: "bg-accent text-primary" }} activeOptions={{ exact: true }}>{link.label}</Link></Button>)}</nav>
    <Button asChild variant="ghost" className="ml-auto"><Link to="/profil">{data?.profile.avatar ? <img src={data.profile.avatar} alt="" className="size-7 rounded-full object-cover" /> : <UserRound />}<span className="hidden sm:inline">{data?.profile.username || "Mon profil"}</span></Link></Button>
    <Button variant="ghost" size="icon" aria-label="Se déconnecter" title="Se déconnecter" onClick={logout}><LogOut /></Button>
  </div></header>;
}