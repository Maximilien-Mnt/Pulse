import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { EventRow } from "@/types";

/**
 * Fetches all events the user is registered to, grouped by status:
 * - upcoming: start_date > now
 * - ongoing: start_date <= now AND (end_date >= now OR end_date is null)
 * - past: end_date < now
 */
export function useProfileEvents(userId: string | null) {
  const now = new Date().toISOString();

  const { data: allEvents = [], isLoading, isError } = useQuery({
    queryKey: ["profile-events", userId],
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
          // Supabase joins can return event as an object or as an array
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

  // Filter events by date in JavaScript after fetching
  const upcoming = allEvents.filter((item) => item.event.start_date > now);
  const ongoing = allEvents.filter((item) => {
    const started = item.event.start_date <= now;
    const notEnded = !item.event.end_date || item.event.end_date >= now;
    return started && notEnded;
  });
  const past = allEvents.filter((item) => item.event.end_date && item.event.end_date < now);

  return {
    upcoming,
    ongoing,
    past,
    isLoading,
    isError,
  };
}