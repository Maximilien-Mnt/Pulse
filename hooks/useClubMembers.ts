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
        .select("user_id", { count: "exact" })
        .eq("club_id", clubId!)
        .limit(20);

      if (error) throw error;

      const userIds = Array.from(
        new Set((data ?? []).map((row: any) => row.user_id).filter((id: any): id is string => typeof id === "string" && !!id))
      );
      const profileMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        (profiles ?? []).forEach((profile: any) => {
          profileMap.set(profile.id, profile);
        });
      }

      return (data ?? []).map((row: any) => {
        const profile = profileMap.get(row.user_id);
        return {
          user_id: row.user_id,
          full_name: profile?.full_name ?? "Utilisateur",
          username: profile?.username ?? "utilisateur",
          avatar_url: profile?.avatar_url ?? null,
        };
      }) as ClubMember[];
    },
  });
}