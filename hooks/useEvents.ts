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
};

/**
 * Liste paginée des événements avec filtres.
 */
export function useEvents(filters: EventListFilters, userId: string | null) {
  return useInfiniteQuery({
    queryKey: ["events", filters, userId],
    initialPageParam: 0,
    getNextPageParam: (lastPage: EventRow[], allPages) => (lastPage.length < PAGE ? undefined : allPages.length),
    queryFn: async ({ pageParam }): Promise<EventRow[]> => {
      const from = pageParam * PAGE;
      const to = from + PAGE - 1;
      let q = supabase.from("events").select("*");

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
      let rows = (data ?? []) as EventRow[];
      if (filters.favoritesOnly && userId) {
        const ids = rows.map((e) => e.id);
        if (!ids.length) return rows;
        const { data: favs, error: fe } = await supabase
          .from("event_favorites")
          .select("event_id")
          .eq("user_id", userId)
          .in("event_id", ids);
        if (fe) throw fe;
        const set = new Set((favs ?? []).map((x) => x.event_id));
        rows = rows.filter((e) => set.has(e.id));
      }
      return rows;
    },
  });
}
