import { supabase } from "@/lib/supabase";
import type { Club, EventRow, FeedPost, Post } from "@/types";
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
    queryFn: async (): Promise<FeedPost[]> => {
      // Check if target user is blocked
      if (currentUserId && userId) {
        const blockedIds = await fetchBlockedUserIds(currentUserId);
        if (blockedIds.includes(userId)) {
          return []; // Return empty array if user is blocked
        }
      }

      // Fetch posts in chronological order (oldest first)
      const { data: posts, error } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      // Fetch author profile for these posts (the profile of the user whose posts we're viewing)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, city")
        .eq("id", userId!);

      const profile = profiles?.[0];
      const author = profile ? {
        id: profile.id,
        full_name: profile.full_name,
        username: profile.username,
        avatar_url: profile.avatar_url,
      } : {
        id: userId!,
        full_name: "Utilisateur",
        username: "utilisateur",
        avatar_url: null,
      };

      // Transform to FeedPost format with author data
      return (posts as Post[]).map((post) => ({
        ...post,
        author,
        liked_by_me: false,
      }));
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
