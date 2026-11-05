import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronRight, Heart, LayoutGrid, LogOut, Menu, Shield, Sparkles, UserRound } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { memberQuery } from "@/lib/member";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { clearWatch } from "@/lib/member.functions";
import { amIAdmin } from "@/lib/admin.functions";
import { beat, setWatching } from "@/lib/presence";

const LINKS = [
  { to: "/", label: "Accueil", icon: Sparkles },
  { to: "/catalogue", label: "Catalogue", icon: LayoutGrid },
  { to: "/suggestion", label: "Suggestion", icon: Sparkles },
  { to: "/favoris", label: "Favoris", icon: Heart },
] as const;

export function MemberNav() {
  const { data } = useQuery(memberQuery); const client = useQueryClient(); const navigate = useNavigate();
  const { data: isAdmin } = useQuery({ queryKey: ["is-admin"], queryFn: () => amIAdmin(), staleTime: 300_000 });
  const path = useRouterState({ select: s => s.location.pathname });
  const [open, setOpen] = useState(false);
  useEffect(() => { setWatching(null); setOpen(false); }, [path]);
  useEffect(() => { const t = setInterval(beat, 30_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const viewport = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (viewport.matches) setOpen(false); };
    viewport.addEventListener("change", closeOnDesktop);
    return () => viewport.removeEventListener("change", closeOnDesktop);
  }, []);
  async function logout() {
    await client.cancelQueries(); client.clear();
    await clearWatch();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Déconnexion impossible."); return; }
    await navigate({ to: "/auth", replace: true });
  }
  const links = [...LINKS, ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : [])];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:py-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Ouvrir le menu" className="size-10 shrink-0 rounded-lg md:hidden"><Menu className="size-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" aria-describedby={undefined} className="flex h-dvh w-[min(22rem,88vw)] max-w-none flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-none motion-reduce:animate-none motion-reduce:transition-none">
            <div className="flex min-h-20 items-center border-b border-border px-5 pr-16">
              <SheetTitle className="font-display text-2xl font-bold">Stream<span className="text-primary">Wall</span></SheetTitle>
            </div>
            <Button asChild variant="ghost" className="m-3 h-auto shrink-0 justify-start gap-3 rounded-lg px-3 py-4" >
              <Link to="/profil" onClick={() => setOpen(false)}>
                {data?.profile.avatar ? <img src={data.profile.avatar} alt="" className="size-11 rounded-full object-cover" /> : <span className="grid size-11 place-items-center rounded-full bg-accent text-primary"><UserRound /></span>}
                <span className="min-w-0 flex-1 truncate text-left font-semibold">{data?.profile.username || "Mon profil"}</span><ChevronRight className="text-muted-foreground" />
              </Link>
            </Button>
            <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-border p-3" aria-label="Menu mobile">
              {links.map(({ to, label, icon: Icon }) => (
                <Button key={to} asChild variant="ghost" className="h-12 w-full justify-start gap-3 rounded-lg px-4 text-base text-muted-foreground has-[[data-status=active]]:text-primary">
                  <Link to={to} onClick={() => setOpen(false)} activeOptions={to === "/" ? { exact: true } : {}} className="data-[status=active]:bg-accent data-[status=active]:text-primary">
                    <Icon className="size-5 shrink-0" /><span className="flex-1">{label}</span><ChevronRight className="size-4 opacity-50" />
                  </Link>
                </Button>
              ))}
            </nav>
            <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button variant="ghost" className="h-12 w-full justify-start gap-3 text-muted-foreground" onClick={logout}><LogOut />Se déconnecter</Button>
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/" className="min-w-0 truncate font-display text-xl font-bold sm:text-2xl">Stream<span className="text-primary">Wall</span></Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Menu principal">
          {links.map(({ to, label }) => (
            <Link key={to} to={to}
              activeOptions={to === "/" ? { exact: true } : {}}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-primary">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button asChild variant="ghost"><Link to="/profil" aria-label="Mon profil">{data?.profile.avatar ? <img src={data.profile.avatar} alt="" className="size-7 rounded-full object-cover" /> : <UserRound />}<span className="hidden max-w-32 truncate md:inline">{data?.profile.username || "Mon profil"}</span></Link></Button>
          <Button variant="ghost" size="icon" aria-label="Se déconnecter" title="Se déconnecter" onClick={logout}><LogOut /></Button>
        </div>
      </div>
    </header>
  );
}
