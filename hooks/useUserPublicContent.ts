import { supabase } from "@/lib/supabase";
import type { Club, EventRow, Post } from "@/types";
import { useQuery } from "@tanstack/react-query";

export function useUserPublicContent(userId: string | null | undefined) {
  const postsQuery = useQuery({
    queryKey: ["user-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  const clubsQuery = useQuery({
    queryKey: ["user-clubs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("created_by", userId!)
        .eq("is_private", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Club[];
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["user-events", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", userId!)
        .eq("is_private", false)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  return { postsQuery, clubsQuery, eventsQuery };
}