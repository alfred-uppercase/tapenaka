import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Signed-in state for guest/member UI differences; refreshed by the root auth listener. */
export function useIsMember() {
  const { data, isLoading } = useQuery({ queryKey: ["session"], queryFn: async () => !!(await supabase.auth.getSession()).data.session, staleTime: 60_000 });
  return { isMember: !!data, isLoading };
}
