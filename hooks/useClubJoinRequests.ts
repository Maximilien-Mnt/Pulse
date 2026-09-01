import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type ClubJoinRequest = {
  id: string;
  user_id: string;
  created_at: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
};

/**
 * Fetches pending join requests for a club, joined with requester profiles.
 * Used by the club owner dashboard. Accept/refuse is handled by
 * `useJoinRequestAction` from `useNotifications`.
 */
export function useClubJoinRequests(clubId: string | null) {
  return useQuery({
    queryKey: ["club-join-requests", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_join_requests")
        .select(
          `
          id,
          user_id,
          created_at,
          profile:profiles ( id, full_name, username, avatar_url )
        `
        )
        .eq("club_id", clubId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        created_at: row.created_at,
        full_name: row.profile?.full_name ?? "Utilisateur",
        username: row.profile?.username ?? "utilisateur",
        avatar_url: row.profile?.avatar_url ?? null,
      })) as ClubJoinRequest[];
    },
  });
}
