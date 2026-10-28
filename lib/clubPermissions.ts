import { supabase } from "@/lib/supabase";

/** The subset of a club row needed to resolve management rights. */
export type ManagedClub = {
  id: string;
  created_by: string | null;
  name: string;
};

/**
 * Resolve whether a user manages a club and return the club row.
 *
 * Managers = the club creator (`clubs.created_by`), or a club member with
 * `role = 'admin'` (legacy `"owner"` accepted too).
 *
 * Throws `"unauthorized"` when the user has no rights. Enforced again in RLS
 * (migration 060 clubs_update_manager); this client check only drives UX.
 */
export async function assertCanManageClub(
  clubId: string,
  userId: string,
): Promise<ManagedClub> {
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, created_by, name")
    .eq("id", clubId)
    .single();

  if (clubError) throw clubError;
  if ((club as ManagedClub).created_by === userId) return club as ManagedClub;

  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;

  const role = (membership as { role?: string } | null)?.role;
  if (role === "admin" || role === "owner") {
    return club as ManagedClub;
  }

  throw new Error("unauthorized");
}
