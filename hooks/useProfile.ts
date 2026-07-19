import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

export function useUpdateProfile(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: any) => {
      if (!userId) throw new Error("auth");
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) {
        void qc.invalidateQueries({ queryKey: ["profile", userId] });
      }
    },
  });
}