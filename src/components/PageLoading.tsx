import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function PageLoading() {
  return (
    <div role="status" aria-label="Chargement de la page" className="min-h-[50vh]">
      <span className="sr-only">Chargement de la page…</span>
    </div>
  );
}

export function PageLoadingIndicator() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const loading = useRouterState({ select: state => state.isLoading });
  if (!hydrated || !loading) return null;
  return (
    <div role="progressbar" aria-label="Chargement de la page" className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
      <div className="progress-bar h-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
    </div>
  );
}
