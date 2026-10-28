import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { assertCanManageClub } from "@/lib/clubPermissions";
import { useAuthStore } from "@/stores/authStore";

/**
 * Whether the current user can manage (edit / delete) a club.
 *
 * Managers = the club creator (`clubs.created_by`), or a club member with
 * `role = 'admin'` (legacy `"owner"` accepted too).
 *
 * Mirrors the server rule enforced in RLS (migration 060
 * `clubs_update_manager`). The client check only drives the UI.
 */
export function useCanManageClub(clubId: string | null) {
  const userId = useAuthStore((s) => s.userId);

  const { data: club, isLoading } = useQuery({
    queryKey: ["club-manage", clubId, userId],
    enabled: !!clubId && !!userId,
    retry: false, // authorization failure won't recover on retry
    queryFn: async () => {
      return assertCanManageClub(clubId!, userId!);
    },
  });

  const canManage = useMemo(() => !!club && !!userId, [club, userId]);

  return { canManage, isLoading };
}
