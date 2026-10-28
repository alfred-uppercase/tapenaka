import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { memberQuery } from "@/lib/member";
import { toggleFavorite } from "@/lib/member.functions";
import type { Item } from "@/lib/api";

export function FavoriteButton({ item, compact = false }: { item: Item; compact?: boolean }) {
  const client = useQueryClient();
  const { data } = useQuery(memberQuery);
  const saved = data?.favorites.some(f => f.id === item.id && f.item_type === item.item_type) ?? false;
  const mutation = useMutation({ mutationFn: () => toggleFavorite({ data: { item, remove: saved } }), onSuccess: () => client.invalidateQueries({ queryKey: ["member"] }), onError: () => toast.error("Impossible de modifier les favoris.") });
  return <Button size={compact ? "icon" : "default"} variant="secondary" disabled={mutation.isPending} aria-label={saved ? "Retirer des favoris" : "Ajouter aux favoris"} aria-pressed={saved} onClick={() => mutation.mutate()} title={saved ? "Retirer des favoris" : "Ajouter aux favoris"}><Heart className={saved ? "fill-primary text-primary" : ""} />{!compact && (saved ? "Dans mes favoris" : "Ajouter aux favoris")}</Button>;
}