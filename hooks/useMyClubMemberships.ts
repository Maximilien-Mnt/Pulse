import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { Club } from "@/types";

/**
 * Fetches clubs where the user is a member, for the profile page.
 */
export function useMyClubMemberships(userId: string | null) {
  return useQuery({
    queryKey: ["my-club-memberships", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members")
        .select(
          `
          club_id,
          role,
          joined_at,
          club:clubs (*)
        `
        )
        .eq("user_id", userId!);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        club: row.club as Club,
        role: row.role,
        joined_at: row.joined_at,
      })) as { club: Club; role: string; joined_at: string }[];
    },
  });
}