import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type ClubMember = {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  /** Derived from the club creator / "owner" role — either "admin" or "member". */
  role: "admin" | "member";
  is_admin: boolean;
};

/**
 * Fetches EVERY member of a club (no length cap, unlike `useClubMembers`)
 * joined with their profiles, and always includes the club creator — who may
 * not have a `club_members` row in legacy creation flows.
 *
 * A member is considered an Admin when they are the club creator or hold the
 * "owner" role; everyone else is a Member. The result is sorted admins-first,
 * then alphabetically by full name.
 *
 * Reuses the `club-all-members` query key so the members screen refreshes
 * instantly whenever a member is removed elsewhere in the app.
 */
export function useClubAllMembers(clubId: string | null) {
  return useQuery({
    queryKey: ["club-all-members", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("club_members")
        .select("user_id, role")
        .eq("club_id", clubId!);

      if (error) throw error;

      // Resolve the club creator to flag admins and to include the creator
      // even when no `club_members` row exists (legacy created clubs).
      let creatorId: string | null = null;
      try {
        const { data: club } = await supabase
          .from("clubs")
          .select("created_by")
          .eq("id", clubId!)
          .maybeSingle();
        creatorId = club?.created_by ?? null;
      } catch {
        creatorId = null;
      }

      const roleByUser = new Map<string, string>();
      (rows ?? []).forEach((row: any) => {
        if (typeof row?.user_id === "string") roleByUser.set(row.user_id, row.role ?? "member");
      });

      // Guarantee the creator is present.
      if (creatorId) {
        roleByUser.set(creatorId, roleByUser.get(creatorId) ?? "owner");
      }

      const userIds = Array.from(roleByUser.keys());

      const profileMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        (profiles ?? []).forEach((profile: any) => {
          if (profile?.id) profileMap.set(profile.id, profile);
        });
      }

      const members: ClubMember[] = userIds.map((id) => {
        const profile = profileMap.get(id) ?? {};
        const isAdmin = id === creatorId || roleByUser.get(id) === "owner";
        return {
          user_id: id,
          full_name: profile.full_name ?? "Utilisateur",
          username: profile.username ?? "utilisateur",
          avatar_url: profile.avatar_url ?? null,
          role: isAdmin ? "admin" : "member",
          is_admin: isAdmin,
        };
      });

      members.sort((a, b) => {
        if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;
        return a.full_name.toLowerCase().localeCompare(b.full_name.toLowerCase());
      });

      return members;
    },
  });
}