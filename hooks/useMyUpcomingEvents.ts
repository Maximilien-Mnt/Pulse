import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { EventRow } from "@/types";

/**
 * Fetches events the user is registered to.
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
        .eq("user_id", userId!);

      if (error) throw error;

      // Process the data - handle both single object and array cases
      const events = (data ?? [])
        .map((row: any) => {
          const event = Array.isArray(row.event) ? row.event[0] : row.event;
          if (!event) return null;
          return {
            event: event as EventRow,
            status: row.status,
          };
        })
        .filter((item): item is { event: EventRow; status: string } => item !== null);

      return events;
    },
  });
}