import { supabase } from "@/lib/supabase";
import type { FeedPost } from "@/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type { FeedFilter } from "@/stores/feedStore";

async function fetchBlockedIds(userId: string): Promise<string[]> {
  // Never let a blocked_users failure break the whole feed.
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

type FeedPage = {
  items: FeedPost[];
  nextCursor: string | null;
};

function normalizeFeedPost(row: any, likedByMeSet?: Set<string>): FeedPost {
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
    author: {
      id: row.author?.id ?? row.author_id ?? "",
      full_name: row.author?.full_name ?? row.author?.display_name ?? "Utilisateur",
      username: row.author?.username ?? "utilisateur",
      avatar_url: row.author?.avatar_url ?? null,
    },
    liked_by_me: false,
  };
  
  // Check if user has liked this post
  if (likedByMeSet && likedByMeSet.has(post.id)) {
    post.liked_by_me = true;
  }
  
  return post;
}

/**
 * Fetches the list of user IDs the current user follows (for the
 * "Abonnements" feed filter).
 */
async function fetchFollowingIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (error) {
    if (__DEV__) {
      console.error("[useFeed] fetchFollowingIds error", { userId, error });
    }
    throw error;
  }
  return (data ?? []).map((row) => row.following_id);
}

async function fetchFeedPage(
  cursor: string | null,
  tag: string | null,
  userId: string | null,
  filter: FeedFilter
): Promise<FeedPage> {
  let query = supabase
    .from("posts")
    .select(
      `
      id,
      author_id,
      title,
      body,
      format,
      media_urls,
      tags,
      likes_count,
      comments_count,
      shares_count,
      created_at,
      updated_at,
      video_url,
      video_thumbnail,
      video_duration,
      author:profiles!author_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  // ── Feed filter: sport → server-side tag match ─────────────────
  if (filter.type === "sport") {
    query = query.contains("tags", [filter.sport]);
  }

  // ── Feed filter: tag → server-side tag match ──────────────────
  if (filter.type === "tag") {
    query = query.contains("tags", [filter.tag]);
  }

  // ── Feed filter: following → only posts by followed authors ────
  if (filter.type === "following") {
    const followingIds = await fetchFollowingIds(userId);
    if (followingIds.length === 0) {
      if (__DEV__) {
        console.warn("[useFeed] following filter: no followed users found", { userId });
      }
      // No followed users → empty feed
      return { items: [], nextCursor: null };
    }
    query = query.in("author_id", followingIds);
  }

  // ── Blocked users filter ───────────────────────────────────────
  if (userId) {
    const blockedIds = await fetchBlockedIds(userId);
    if (blockedIds.length > 0) {
      query = query.not("author_id", "in", blockedIds);
    }
  }

  // `video_*` columns were added by migration 026 but aren't in the generated types yet.
  const { data, error } = (await query) as any;
  if (error) throw error;

  // Get liked status for the current user if authenticated
  let likedByMeSet: Set<string> | undefined;
  if (userId && data && data.length > 0) {
    try {
      const postIds = data.map((row: any) => row.id);

      const { data: likesData, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);

      if (likesError) {
        if (__DEV__) {
          console.warn("[useFeed] Failed to load liked status", { userId, error: likesError });
        }
      } else if (likesData && likesData.length > 0) {
        likedByMeSet = new Set(likesData.map((like) => like.post_id));
      }
    } catch (e) {
      if (__DEV__) {
        console.warn("[useFeed] Failed to load liked status", e);
      }
    }
  }

  const rows = (data ?? []).map((row: any) => normalizeFeedPost(row, likedByMeSet));

  return {
    items: rows,
    nextCursor: rows.length ? rows[rows.length - 1]!.created_at : null,
  };
}

export function useFeed(tag: string | null | undefined, filter: FeedFilter = { type: "for-you" }) {
  const userId = useAuthStore((s) => s.userId);
  
  return useInfiniteQuery({
    queryKey: ["feed", tag, filter, userId],
    queryFn: async ({ pageParam }) => {
      const result = await fetchFeedPage(pageParam ?? null, tag ?? null, userId, filter);
      return result;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
