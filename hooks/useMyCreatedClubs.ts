import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { Club } from "@/types";

/**
 * Fetches clubs created/managed by the user.
 */
export function useMyCreatedClubs(userId: string | null) {
  return useQuery({
    queryKey: ["my-created-clubs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("created_by", userId!)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []) as Club[];
    },
  });
}