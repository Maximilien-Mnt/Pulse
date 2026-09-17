import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

/**
 * Whether the current user can publish an event as this club.
 *
 * Mirrors the server rule in `048_event_publishing_identity.sql`
 * (`get_event_publishing_clubs`): club owner (`clubs.created_by`) or a
 * `club_members` row with `role = 'admin'` (legacy `"owner"` accepted too).
 */
export function useCanCreateClubEvent(clubId: string | null, creatorId?: string | null) {
  const userId = useAuthStore((s) => s.userId);

  const isOwner = !!userId && !!creatorId && userId === creatorId;

  const { data: role } = useQuery({
    queryKey: ["club-my-role", clubId, userId],
    enabled: !!clubId && !!userId && !isOwner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId!)
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as { role?: string } | null)?.role ?? null;
    },
  });

  const canCreate = useMemo(() => {
    if (!userId || !clubId) return false;
    if (isOwner) return true;
    return role === "admin" || role === "owner";
  }, [userId, clubId, isOwner, role]);

  return canCreate;
}
