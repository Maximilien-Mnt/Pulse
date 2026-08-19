import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type SportCategory = "practiced" | "interested";

/**
 * Returns the list of sport_ids the user practices or is interested in,
 * sourced from the `user_sports` table.
 * 
 * @param userId - The user ID
 * @param category - Optional filter: 'practiced' or 'interested'. If not provided, returns all sports.
 */
export function useUserSports(userId: string | null, category?: SportCategory) {
  return useQuery({
    queryKey: ["user-sports", userId, category],
    enabled: !!userId,
    queryFn: async () => {
      // Build query with type assertion for new category column not yet in types
      let query = supabase
        .from("user_sports")
        .select("sport_id")
        .eq("user_id", userId!) as any;
      
      if (category) {
        query = query.eq("category", category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Deduplicate sport_ids in case of any data inconsistencies
      const sportIds = (data ?? []).map((s: { sport_id: string }) => s.sport_id);
      return [...new Set(sportIds)] as string[];
    },
  });
}
