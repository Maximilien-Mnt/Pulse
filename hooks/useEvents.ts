import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE = 20;

export type EventListFilters = {
  sports: string[];
  location: string;
  dateFrom: string | null;
  dateTo: string | null;
  requiredLevel: string;
  difficultyMin: number;
  difficultyMax: number;
  category: string;
  paidOnly: boolean | null;
  internalOnly: boolean;
  externalOnly: boolean;
  favoritesOnly: boolean;
  sort: string;
  radiusKm?: number;
  userLat?: number;
  userLon?: number;
};

/**
 * Liste paginée des événements avec filtres.
 */
export function useEvents(filters: EventListFilters, userId: string | null) {
  return useInfiniteQuery<EventRow[]>({
    queryKey: ["events", filters, userId],
    initialPageParam: 0 as number,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE ? undefined : allPages.length,
    queryFn: async ({ pageParam }): Promise<EventRow[]> => {
      const from = (pageParam as number) * PAGE;
      const to = from + PAGE - 1;

      // Handle "nearby" sort using RPC function
      if (filters.sort === "nearby" && filters.userLat && filters.userLon) {
        const { data, error } = await (supabase.rpc as any)("get_nearby_events", {
          p_lat: filters.userLat,
          p_lon: filters.userLon,
          p_radius_km: filters.radiusKm ?? 10,
          p_limit: PAGE,
          p_offset: from,
          p_future_only: true,
        });

        if (error) throw error;
        let rows = ((data ?? []) as any).map((row: any) => ({
          ...row,
          creator: row.creator
            ? {
                id: row.creator.id,
                full_name: row.creator.full_name ?? "Utilisateur",
                username: row.creator.username ?? "utilisateur",
                avatar_url: row.creator.avatar_url ?? null,
              }
            : undefined,
        })) as EventRow[];
        return rows;
      }

      // Standard query with PostgREST
      let q = supabase
        .from("events")
        .select(
          `
          *
        `
        );

      if (filters.sports.length) q = q.in("sport", filters.sports);
      if (filters.location.trim()) {
        const v = `%${filters.location.trim()}%`;
        q = q.ilike("city", v);
      }
      if (filters.dateFrom) q = q.gte("start_date", filters.dateFrom);
      if (filters.dateTo) q = q.lte("start_date", filters.dateTo);
      if (filters.requiredLevel.trim()) q = q.eq("required_level", filters.requiredLevel);
      q = q
        .gte("difficulty", filters.difficultyMin)
        .lte("difficulty", filters.difficultyMax);
      if (filters.category.trim()) q = q.eq("category", filters.category);
      if (filters.paidOnly === true) q = q.eq("is_paid", true);
      if (filters.paidOnly === false) q = q.eq("is_paid", false);
      if (filters.internalOnly && !filters.externalOnly) q = q.eq("is_external", false);
      if (filters.externalOnly && !filters.internalOnly) q = q.eq("is_external", true);

      switch (filters.sort) {
        case "name_asc":
          q = q.order("name", { ascending: true });
          break;
        case "price_asc":
          q = q.order("price_cents", { ascending: true });
          break;
        case "price_desc":
          q = q.order("price_cents", { ascending: false });
          break;
        case "difficulty_asc":
          q = q.order("difficulty", { ascending: true });
          break;
        case "difficulty_desc":
          q = q.order("difficulty", { ascending: false });
          break;
        case "relevance":
          q = q.order("start_date", { ascending: true });
          break;
        default:
          q = q.order("start_date", { ascending: true });
      }

      const { data, error } = await q.range(from, to);
      if (error) throw error;
      const creatorIds = Array.from(
        new Set((data ?? []).map((row: any) => row.created_by).filter((id: any): id is string => typeof id === "string" && !!id))
      );
      const creatorMap = new Map<string, any>();
      if (creatorIds.length) {
        const { data: creators, error: creatorsError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", creatorIds);
        if (creatorsError) throw creatorsError;
        (creators ?? []).forEach((profile: any) => {
          creatorMap.set(profile.id, {
            id: profile.id,
            full_name: profile.full_name ?? "Utilisateur",
            username: profile.username ?? "utilisateur",
            avatar_url: profile.avatar_url ?? null,
          });
        });
      }
      const rows = ((data ?? []) as any).map((row: any) => ({
        ...row,
        creator: row.created_by ? creatorMap.get(row.created_by) ?? undefined : undefined,
      })) as EventRow[];

      return rows;
    },
  });
}