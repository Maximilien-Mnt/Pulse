import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types";

/**
 * Fetches events published as this club, most recent start_date first.
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
        // Publisher identity, not the `club_id` link: an event merely attached
        // to the club must not appear in the club's events section (048).
        .eq("publisher_club_id", clubId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });
}
