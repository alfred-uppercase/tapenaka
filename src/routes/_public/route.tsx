import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MemberNav } from "@/components/MemberNav";
import { Button } from "@/components/ui/button";

// Open to guests; member-only actions check the session in the page and on the server.
export const Route = createFileRoute("/_public")({
  ssr: false,
  component: () => <><MemberNav /><div className="page-root"><Outlet /></div></>,
  errorComponent: ({ reset }) => <><MemberNav /><main className="mx-auto max-w-7xl px-4 py-16"><h1 className="mb-4 font-display text-2xl">Chargement indisponible</h1><p className="mb-6 text-muted-foreground">Le service de catalogue ne répond pas. Réessayez dans quelques instants.</p><Button onClick={reset}>Réessayer</Button></main></>,
});
