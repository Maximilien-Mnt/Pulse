import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { EventRow } from "@/types";

/**
 * Fetches upcoming events (start_date > now()) the user is registered to.
 */
export function useMyUpcomingEvents(userId: string | null) {
  return useQuery({
    queryKey: ["my-upcoming-events", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_participants")
        .select(
          `
          event_id,
          status,
          event:events (*)
        `
        )
        .eq("user_id", userId!)
        .gte("events.start_date", new Date().toISOString());

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        event: row.event as EventRow,
        status: row.status,
      })) as { event: EventRow; status: string }[];
    },
  });
}