import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MemberNav } from "@/components/MemberNav";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
  errorComponent: ({ reset }) => <><MemberNav /><main className="mx-auto max-w-7xl px-4 py-16"><h1 className="mb-4 font-display text-2xl">Chargement indisponible</h1><p className="mb-6 text-muted-foreground">Le service de catalogue ne répond pas. Réessayez dans quelques instants.</p><Button onClick={reset}>Réessayer</Button></main></>,
});
function Layout() { return <><MemberNav /><div className="page-root"><Outlet /></div></>; }
