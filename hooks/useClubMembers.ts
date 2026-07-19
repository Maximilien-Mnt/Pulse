import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type ClubMember = {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
};

/**
 * Fetches the first 20 club_members of a club joined with profiles.
 * V1 spec: non-clickable.
 */
export function useClubMembers(clubId: string | null) {
  return useQuery({
    queryKey: ["club-members", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members")
        .select(
          `
          user_id,
          profile:profiles (
            full_name,
            username,
            avatar_url
          )
        `
        )
        .eq("club_id", clubId!)
        .limit(20);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        user_id: row.user_id,
        full_name: row.profile?.full_name ?? "Utilisateur",
        username: row.profile?.username ?? "utilisateur",
        avatar_url: row.profile?.avatar_url ?? null,
      })) as ClubMember[];
    },
  });
}