import { supabase } from "@/lib/supabase";
import type { PublicProfile, PublicStatusMap, UserSport, UserStats } from "@/types";
import { useQuery } from "@tanstack/react-query";

export type PublicProfileData = PublicProfile & {
  sports: UserSport[];
  stats: UserStats | null;
  interested_sports: string[];
  objectives: { id: string; objective: string }[];
};

export function usePublicProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["public-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PublicProfileData | null> => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, avatar_url, bio, country, city, is_public_profile, public_status, public_photos, interested_sports"
        )
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;

      const [
        // Only genuinely *practiced* sports belong in the "Statut" card.
        // (user_sports also stores 'interested' rows used by the edit screens;
        // interested sports displayed on profiles come from
        // profiles.interested_sports.)
        { data: sports, error: se },
        { data: stats, error: stE },
        { data: objectives, error: obE },
        { count: followersCount },
        { count: followingCount },
      ] = await Promise.all([
        supabase
          .from("user_sports")
          .select("*")
          .eq("user_id", userId!)
          .eq("category", "practiced")
          .order("created_at"),
        supabase.from("user_stats").select("*").eq("user_id", userId!).maybeSingle(),
        supabase.from("user_objectives").select("*").eq("user_id", userId!),
        // Subscribers/following counts are recomputed live from the
        // `follows` table (source of truth) on every fetch, so the value is
        // always correct on every refresh — never a drifted snapshot.
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId!),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId!),
      ]);
      if (se) throw se;
      if (stE) throw stE;
      if (obE) throw obE;

      const rawObjectives = (objectives ?? []) as { id: string; objective: string }[];
      const seen = new Set<string>();
      const uniqueObjectives = rawObjectives.filter((o) => {
        const key = o.id || o.objective;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Normalize: dedupe by sport_id (a sport can only appear once), and drop
      // rows without a valid sport_id so the display can never show garbage.
      const seenSports = new Set<string>();
      const practicedSports = ((sports ?? []) as UserSport[]).filter((s) => {
        if (!s?.sport_id || seenSports.has(s.sport_id)) return false;
        seenSports.add(s.sport_id);
        return true;
      });

      return {
        ...(profile as PublicProfile),
        sports: practicedSports,
        stats: stats
          ? {
              ...(stats as UserStats),
              followers_count: followersCount ?? 0,
              following_count: followingCount ?? 0,
            }
          : null,
        interested_sports: (profile.interested_sports as string[]) ?? [],
        objectives: uniqueObjectives,
      };
    },
  });
}

export function parsePublicStatus(raw: unknown): PublicStatusMap {
  if (!raw || typeof raw !== "object") return {};
  return raw as PublicStatusMap;
}
