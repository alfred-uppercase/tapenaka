import { queryOptions } from "@tanstack/react-query";
import { memberData, rankings, homeExtras } from "./member.functions";
export const memberQuery = queryOptions({ queryKey: ["member"], queryFn: () => memberData(), staleTime: 60_000 });
export const rankingsQuery = queryOptions({ queryKey: ["rankings"], queryFn: () => rankings(), staleTime: 30_000 });export const homeExtrasQuery = queryOptions({ queryKey: ["home-extras"], queryFn: () => homeExtras(), staleTime: 60_000 });
