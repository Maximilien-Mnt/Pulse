import { supabase } from "@/lib/supabase";
import type { Club, EventRow, Post } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";

async function fetchBlockedUserIds(userId: string): Promise<string[]> {
  // Never let a blocked_users failure break the calling query.
  try {
    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", userId);

    if (error) return [];
    return (data ?? []).map((row) => row.blocked_id);
  } catch {
    return [];
  }
}

export function useUserPublicContent(userId: string | null | undefined) {
  const currentUserId = useAuthStore((s) => s.userId);

  const postsQuery = useQuery({
    queryKey: ["user-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Check if target user is blocked
      if (currentUserId && userId) {
        const blockedIds = await fetchBlockedUserIds(currentUserId);
        if (blockedIds.includes(userId)) {
          return []; // Return empty array if user is blocked
        }
      }

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
      // Check if target user is blocked
      if (currentUserId && userId) {
        const blockedIds = await fetchBlockedUserIds(currentUserId);
        if (blockedIds.includes(userId)) {
          return []; // Return empty array if user is blocked
        }
      }

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
      // Check if target user is blocked
      if (currentUserId && userId) {
        const blockedIds = await fetchBlockedUserIds(currentUserId);
        if (blockedIds.includes(userId)) {
          return []; // Return empty array if user is blocked
        }
      }

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
