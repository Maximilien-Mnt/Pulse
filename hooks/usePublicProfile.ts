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

      const [{ data: sports, error: se }, { data: stats, error: stE }, { data: objectives, error: obE }] =
        await Promise.all([
          supabase.from("user_sports").select("*").eq("user_id", userId!),
          supabase.from("user_stats").select("*").eq("user_id", userId!).maybeSingle(),
          supabase.from("user_objectives").select("*").eq("user_id", userId!),
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

      return {
        ...(profile as PublicProfile),
        sports: (sports ?? []) as UserSport[],
        stats: (stats as UserStats | null) ?? null,
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
