import { supabase } from "@/lib/supabase";
import { useFeedStore } from "@/stores/feedStore";
import { useAuthStore } from "@/stores/authStore";
import type { FeedPost, Post } from "@/types";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE = 20;

type ProfileMini = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
};

async function mapPostsWithAuthors(posts: Post[], userId: string | null): Promise<FeedPost[]> {
  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  if (authorIds.length === 0) return [];
  const { data: profs, error: pe } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", authorIds);
  if (pe) throw pe;
  const map = Object.fromEntries((profs ?? []).map((p) => [p.id, p as ProfileMini]));
  const postIds = posts.map((p) => p.id);
  let liked = new Set<string>();
  if (userId && postIds.length) {
    const { data: likes, error: le } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds);
    if (le) throw le;
    liked = new Set((likes ?? []).map((l) => l.post_id));
  }
  return posts.map((p) => ({
    ...p,
    author: map[p.author_id] ?? {
      id: p.author_id,
      full_name: "Utilisateur",
      username: "inconnu",
      avatar_url: null,
    },
    liked_by_me: liked.has(p.id),
  }));
}

/**
 * Feed infini + filtre tag optionnel.
 */
export function useFeed() {
  const userId = useAuthStore((s) => s.userId);
  const activeTag = useFeedStore((s) => s.activeTag);

  return useInfiniteQuery({
    queryKey: ["feed", activeTag, userId],
    initialPageParam: 0,
    getNextPageParam: (lastPage: FeedPost[], allPages) =>
      lastPage.length < PAGE ? undefined : allPages.length,
    queryFn: async ({ pageParam }): Promise<FeedPost[]> => {
      const from = pageParam * PAGE;
      const to = from + PAGE - 1;
      let q = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (activeTag) {
        q = q.contains("tags", [activeTag]);
      }
      const { data, error } = await q;
      if (error) throw error;
      return mapPostsWithAuthors((data ?? []) as Post[], userId);
    },
  });
}
