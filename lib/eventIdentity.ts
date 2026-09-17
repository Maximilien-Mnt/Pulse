import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types";

export type EventPublishingClub = { id: string; name: string; logo_url: string | null };
export type EventCreator = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  kind?: "person" | "club";
};

export async function fetchEventPublishingClubs(): Promise<EventPublishingClub[]> {
  const { data, error } = await supabase.rpc("get_event_publishing_clubs");
  if (error) throw error;
  return data ?? [];
}

/** Resolve display identity, never substitute the human operator for a club. */
export async function attachEventCreators<T extends Pick<EventRow, "id" | "created_by" | "publisher_club_id">>(rows: T[]): Promise<(T & { creator?: EventCreator })[]> {
  const personIds = [...new Set(rows.filter((r) => !r.publisher_club_id).map((r) => r.created_by).filter((id): id is string => !!id))];
  const clubEvents = rows.filter((r) => !!r.publisher_club_id).map((r) => r.id);
  const [people, clubs] = await Promise.all([
    personIds.length ? supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", personIds) : Promise.resolve({ data: [], error: null }),
    clubEvents.length ? supabase.rpc("get_event_club_publishers", { p_event_ids: clubEvents }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (people.error) throw people.error;
  if (clubs.error) throw clubs.error;
  const peopleById = new Map((people.data ?? []).map((p) => [p.id, { ...p, kind: "person" as const }]));
  const clubsByEvent = new Map((clubs.data ?? []).map((c) => [c.event_id, {
    id: c.id, full_name: c.name, username: "", avatar_url: c.logo_url, kind: "club" as const,
  }]));
  return rows.map((row) => ({
    ...row,
    creator: row.publisher_club_id ? clubsByEvent.get(row.id) : peopleById.get(row.created_by ?? ""),
  }));
}
