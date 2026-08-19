import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { EventRow } from "@/types";

/**
 * Fetches all events where the user was accepted:
 * - Events created by the user (events.created_by = userId)
 * - Events where the user asked to join and was accepted (event_join_requests with status = "accepted")
 * 
 * Grouped by status:
 * - upcoming: start_date > now
 * - ongoing: start_date <= now AND (end_date >= now OR end_date is null)
 * - past: end_date < now
 */
export function useAcceptedEvents(userId: string | null) {
  const now = new Date().toISOString();

  const { data: allEvents = [], isLoading, isError } = useQuery({
    queryKey: ["accepted-events", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      
      // Fetch events created by the user
      const { data: createdEvents, error: createdError } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", userId);

      if (createdError) throw createdError;

      // Fetch events where the user's join request was accepted
      const { data: acceptedRequests, error: acceptedError } = await supabase
        .from("event_join_requests")
        .select(
          `
          event_id,
          event:events (*)
          `
        )
        .eq("user_id", userId)
        .eq("status", "accepted");

      if (acceptedError) throw acceptedError;

      // Combine and deduplicate events
      const eventMap = new Map<string, EventRow>();
      
      // Add created events
      (createdEvents ?? []).forEach((event) => {
        eventMap.set(event.id, event as EventRow);
      });
      
      // Add accepted events
      (acceptedRequests ?? []).forEach((row: any) => {
        const event = Array.isArray(row.event) ? row.event[0] : row.event;
        if (event && !eventMap.has(event.id)) {
          eventMap.set(event.id, event as EventRow);
        }
      });

      const events = Array.from(eventMap.values()).map((event) => ({
        event,
        status: "accepted" as const,
      }));

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
