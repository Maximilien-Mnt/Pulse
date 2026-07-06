import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { useQuery } from "@tanstack/react-query";

/**
 * Profil Supabase (ligne `profiles`) pour un utilisateur donné.
 */
export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}
