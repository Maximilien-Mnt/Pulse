import { supabase } from "@/lib/supabase";
import { attachEventCreators } from "@/lib/eventIdentity";
import type { EventRow } from "@/types";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE = 20;

export type EventListFilters = {
  sports: string[];
  location: string;
  dateFrom: string | null;
  dateTo: string | null;
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
        const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
        if (!ids.length) return [];
        // The distance RPC returns a partial/legacy row. Hydrate current event
        // fields while preserving its distance order and the table's RLS.
        const { data: events, error: eventsError } = await supabase.from("events").select("*").in("id", ids);
        if (eventsError) throw eventsError;
        const byId = new Map((events ?? []).map((event) => [event.id, event]));
        return attachEventCreators(ids.flatMap((id) => byId.has(id) ? [byId.get(id)! as EventRow] : []));
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
      if (filters.paidOnly === true) q = q.eq("is_paid", true);
      if (filters.paidOnly === false) q = q.eq("is_paid", false);
      if (filters.internalOnly && !filters.externalOnly) q = q.eq("is_external", false);
      if (filters.externalOnly && !filters.internalOnly) q = q.eq("is_external", true);

      switch (filters.sort) {
        case "name_asc":
          q = q.order("name", { ascending: true });
          break;
        case "name_desc":
          q = q.order("name", { ascending: false });
          break;
        case "date_desc":
          q = q.order("start_date", { ascending: false });
          break;
        case "newest":
          q = q.order("created_at", { ascending: false });
          break;
        case "price_asc":
          q = q.order("price_cents", { ascending: true });
          break;
        case "price_desc":
          q = q.order("price_cents", { ascending: false });
          break;
        case "relevance":
          q = q.order("start_date", { ascending: true });
          break;
        default:
          q = q.order("start_date", { ascending: true });
      }

      const { data, error } = await q.range(from, to);
      if (error) throw error;
      return attachEventCreators((data ?? []) as EventRow[]);
    },
  });
}