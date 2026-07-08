import { supabase } from "@/lib/supabase";
import type { PublicProfile, PublicStatusMap, UserSport, UserStats } from "@/types";
import { useQuery } from "@tanstack/react-query";

export type PublicProfileData = PublicProfile & {
  sports: UserSport[];
  stats: UserStats | null;
};

export function usePublicProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["public-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PublicProfileData | null> => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, avatar_url, bio, country, city, is_public_profile, public_status, public_photos"
        )
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;

      const [{ data: sports, error: se }, { data: stats, error: stE }] = await Promise.all([
        supabase.from("user_sports").select("*").eq("user_id", userId!),
        supabase.from("user_stats").select("*").eq("user_id", userId!).maybeSingle(),
      ]);
      if (se) throw se;
      if (stE) throw stE;

      return {
        ...(profile as PublicProfile),
        sports: (sports ?? []) as UserSport[],
        stats: (stats as UserStats | null) ?? null,
      };
    },
  });
}

export function parsePublicStatus(raw: unknown): PublicStatusMap {
  if (!raw || typeof raw !== "object") return {};
  return raw as PublicStatusMap;
}
