import { useRouterState } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function PageLoading() {
  return (
    <div role="status" aria-label="Chargement de la page" className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-background/60 backdrop-blur-sm">
      <div className="grid size-16 place-items-center rounded-full border border-primary/30 bg-background shadow-lg">
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-primary motion-reduce:animate-none" />
      </div>
      <span className="sr-only">Chargement de la page…</span>
    </div>
  );
}

export function PageLoadingIndicator() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const loading = useRouterState({ select: state => state.isLoading });
  return hydrated && loading ? <PageLoading /> : null;
}