import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PageLoading } from "./components/PageLoading";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultViewTransition: true,
    defaultPendingComponent: PageLoading,
    defaultPendingMs: 150,
    defaultPendingMinMs: 200,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
