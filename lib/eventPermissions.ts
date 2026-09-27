import { supabase } from "@/lib/supabase";

/** The subset of an event row needed to resolve management rights. */
export type ManagedEvent = {
  id: string;
  created_by: string | null;
  name: string;
  publisher_club_id: string | null;
  club_id: string | null;
};

/**
 * Resolve whether a user manages an event and return the event row.
 *
 * Managers = the event creator, or the owner (`clubs.created_by`) / admin
 * (`club_members.role = 'admin' | 'owner'`) of the publishing club
 * (`publisher_club_id`, falling back to the legacy `club_id` link).
 *
 * Throws `"unauthorized"` when the user has no rights. Enforced again in RLS
 * (migration 057); this client check only drives UX + notification metadata.
 */
export async function assertCanManageEvent(eventId: string, userId: string): Promise<ManagedEvent> {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, created_by, name, publisher_club_id, club_id")
    .eq("id", eventId)
    .single();

  if (eventError) throw eventError;
  if ((event as ManagedEvent).created_by === userId) return event as ManagedEvent;

  const clubId = (event as ManagedEvent).publisher_club_id ?? (event as ManagedEvent).club_id;
  if (clubId) {
    const [{ data: club }, { data: membership }] = await Promise.all([
      supabase.from("clubs").select("created_by").eq("id", clubId).maybeSingle(),
      supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const role = (membership as { role?: string } | null)?.role;
    if (
      (club as { created_by?: string } | null)?.created_by === userId ||
      role === "admin" ||
      role === "owner"
    ) {
      return event as ManagedEvent;
    }
  }
  throw new Error("unauthorized");
}
