import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, LayoutGrid, LogOut, Menu, Shield, Sparkles, UserRound, X } from "lucide-react";
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
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);
  async function logout() {
    await client.cancelQueries(); client.clear();
    await clearWatch();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Déconnexion impossible."); return; }
    await navigate({ to: "/auth", replace: true });
  }
  const links = [...LINKS, ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : [])] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:py-4">
        <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-accent sm:hidden">
          <Menu className="size-5" />
        </button>
        <Link to="/" className="min-w-0 truncate font-display text-xl font-bold sm:text-2xl">Stream<span className="text-primary">Wall</span></Link>
        <nav className="ml-4 hidden items-center gap-1 sm:flex" aria-label="Menu principal">
          {links.map(({ to, label }) => (
            <Link key={to} to={to} activeOptions={to === "/" ? { exact: true } : undefined}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-primary">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button asChild variant="ghost"><Link to="/profil">{data?.profile.avatar ? <img src={data.profile.avatar} alt="" className="size-7 rounded-full object-cover" /> : <UserRound />}<span className="hidden sm:inline">{data?.profile.username || "Mon profil"}</span></Link></Button>
          <Button variant="ghost" size="icon" aria-label="Se déconnecter" title="Se déconnecter" onClick={logout}><LogOut /></Button>
        </div>
      </div>
      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 sm:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute left-0 top-0 flex h-full w-[19rem] max-w-[85vw] flex-col border-r border-border bg-background shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <span className="font-display text-xl font-bold">Stream<span className="text-primary">Wall</span></span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu"
              className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-3 border-b border-border px-4 py-4">
            {data?.profile.avatar
              ? <img src={data.profile.avatar} alt="" className="size-10 rounded-full object-cover" />
              : <span className="grid size-10 place-items-center rounded-full bg-accent text-primary"><UserRound className="size-5" /></span>}
            <div className="min-w-0">
              <p className="truncate font-semibold">{data?.profile.username || "Mon profil"}</p>
              <p className="truncate text-xs text-muted-foreground">{data?.profile.email ?? ""}</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Menu mobile">
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} activeOptions={to === "/" ? { exact: true } : undefined}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-primary">
                <Icon className="size-5 shrink-0" />{label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border p-3">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
              <LogOut />Se déconnecter
            </Button>
          </div>
        </aside>
      </div>
    </header>
  );
}
