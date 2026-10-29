import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stripUnknownFields } from "@/utils/protectedMutations";

export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, avatar_url, bio, country, city, language, interested_sports, created_at, updated_at, is_public_profile, public_status, public_photos"
        )
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!userId) throw new Error("auth");
      const clean = stripUnknownFields("profiles", patch);
      const { error } = await supabase
        .from("profiles")
        .update(clean)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) {
        void qc.invalidateQueries({ queryKey: ["profile", userId] });
      }
    },
  });
}