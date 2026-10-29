import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type PrivateProfileFields = {
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  push_token: string | null;
};

export function usePrivateProfileFields() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ["private-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_private")
        .select("height_cm, weight_kg, birth_date, push_token")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as PrivateProfileFields | null;
    },
  });
}
