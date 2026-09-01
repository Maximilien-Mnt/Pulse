import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types";

/**
 * Fetches all events attached to a club, most recent start_date first.
 * Used by the club owner dashboard.
 */
export function useClubEvents(clubId: string | null) {
  return useQuery({
    queryKey: ["club-events", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("club_id", clubId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });
}
