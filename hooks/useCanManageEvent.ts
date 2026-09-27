import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

/**
 * Whether the current user can manage (edit / delete) an event.
 *
 * Managers = the event creator (`events.created_by`) + the owner
 * (`clubs.created_by`) and admins (`club_members.role = 'admin'/'owner'`)
 * of the club through which the event was created
 * (`publisher_club_id`, falling back to the legacy `club_id` link).
 */
export function useCanManageEvent(event: {
  created_by?: string | null;
  publisher_club_id?: string | null;
  club_id?: string | null;
} | null) {
  const userId = useAuthStore((s) => s.userId);

  const managingClubId = event?.publisher_club_id ?? event?.club_id ?? null;
  const isCreator = !!userId && !!event?.created_by && userId === event.created_by;

  const { data: clubRole, isLoading: roleLoading } = useQuery({
    queryKey: ["club-my-role", managingClubId, userId],
    enabled: !!managingClubId && !!userId && !isCreator,
    queryFn: async () => {
      const [{ data: club }, { data: membership, error }] = await Promise.all([
        supabase.from("clubs").select("created_by").eq("id", managingClubId!).maybeSingle(),
        supabase
          .from("club_members")
          .select("role")
          .eq("club_id", managingClubId!)
          .eq("user_id", userId!)
          .maybeSingle(),
      ]);
      if (error) throw error;
      return {
        ownerId: (club as { created_by?: string } | null)?.created_by ?? null,
        role: (membership as { role?: string } | null)?.role ?? null,
      };
    },
  });

  const canManage = useMemo(() => {
    if (!userId || !event) return false;
    if (isCreator) return true;
    if (!managingClubId || !clubRole) return false;
    if (clubRole.ownerId && clubRole.ownerId === userId) return true;
    return clubRole.role === "admin" || clubRole.role === "owner";
  }, [userId, event, isCreator, managingClubId, clubRole]);

  return { canManage, isCreator, managingClubId, isLoading: roleLoading };
}
