import { supabase } from "@/lib/supabase";
import type { FeedPost } from "@/types";
import { useInfiniteQuery } from "@tanstack/react-query";

type FeedPage = {
  items: FeedPost[];
  nextCursor: string | null;
};

function normalizeFeedPost(row: any): FeedPost {
  return {
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
  };
}

async function fetchFeedPage(cursor: string | null, tag: string | null): Promise<FeedPage> {
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
      author:profiles (
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

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []).map(normalizeFeedPost);

  return {
    items: rows,
    nextCursor: rows.length ? rows[rows.length - 1]!.created_at : null,
  };
}

export function useFeed(tag?: string | null) {
  return useInfiniteQuery({
    queryKey: ["feed", tag],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam ?? null, tag ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}