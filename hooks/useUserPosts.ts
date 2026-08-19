import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { Post } from "@/types";
import type { FeedPost } from "@/types";

function normalizeUserPost(row: any, profileMap: Map<string, { id: string; full_name: string; username: string; avatar_url: string | null }>): FeedPost {
  const post: FeedPost = {
    id: row.id,
    author_id: row.author_id,
    title: row.title,
    body: row.body ?? null,
    format: row.format,
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    likes_count: row.likes_count ?? 0,
    comments_count: row.comments_count ?? 0,
    shares_count: row.shares_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    video_url: row.video_url ?? null,
    video_thumbnail: row.video_thumbnail ?? null,
    video_duration: row.video_duration ?? null,
    author: profileMap.get(row.author_id) ?? {
      id: row.author_id,
      full_name: "Utilisateur",
      username: "utilisateur",
      avatar_url: null,
    },
    liked_by_me: false,
  };
  
  return post;
}

/**
 * Fetches all posts created by a specific user with author data
 */
export function useUserPosts(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["user-posts-with-author", userId],
    enabled: !!userId,
    queryFn: async (): Promise<FeedPost[]> => {
      if (!userId) return [];

      const { data: posts, error } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      // Fetch author profiles
      const postsWithAuthor = posts as Post[];
      const authorIds = [...new Set(postsWithAuthor.map((p) => p.author_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, city")
        .in("id", authorIds);

      const profileMap = new Map<string, { id: string; full_name: string; username: string; avatar_url: string | null }>();
      (profiles ?? []).forEach((p) => profileMap.set(p.id, {
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        avatar_url: p.avatar_url,
      }));

      // Transform to FeedPost format with proper normalization
      return postsWithAuthor.map((post) => normalizeUserPost(post, profileMap));
    },
  });
}

// Keep backward-compatible export with simpler type
export type UserPostsResult = Post[];