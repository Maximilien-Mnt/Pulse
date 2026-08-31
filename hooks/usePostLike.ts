import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface UsePostLikeOptions {
  postId: string;
  initialLiked: boolean;
  initialLikesCount: number;
  /** Called whenever the displayed state changes (optimistic or server-confirmed). */
  onLikedChange?: (postId: string, liked: boolean, likesCount: number) => void;
}

interface UsePostLikeResult {
  liked: boolean;
  likesCount: number;
  isPending: boolean;
  toggleLike: () => void;
}

type TogglePostLikeRow = { liked: boolean; likes_count: number };

/**
 * Centralized post-like management.
 *
 * Reads/writes a single source of truth — the `toggle_post_like` database RPC,
 * which atomically likes/unlikes and returns the exact new state
 * `{ liked, likes_count }`. The composite PK (post_id, user_id) guarantees a
 * user can only ever submit one like per post, and the count the UI shows is
 * always the exact count the database computed.
 *
 * The UI is updated optimistically (instant feedback + animation), then
 * reconciled with the authoritative server response.
 */
export function usePostLike({
  postId,
  initialLiked,
  initialLikesCount,
  onLikedChange,
}: UsePostLikeOptions): UsePostLikeResult {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);

  // The server is the source of truth for the count. Keep a flag so we never
  // let a refetched prop overwrite a pending optimistic change mid-flight.
  const isMutatingRef = useRef(false);

  // Sync local state when the server data changes (e.g. after refetch/refresh).
  useEffect(() => {
    if (isMutatingRef.current) return;
    setLiked(initialLiked);
    setLikesCount(initialLikesCount);
  }, [initialLiked, initialLikesCount]);

  // Write the new state everywhere the post is cached (feed, user posts,
  // public profile galleries) so every screen stays consistent.
  const applyState = useCallback(
    (newLiked: boolean, newLikesCount: number) => {
      const updater = (old: any) => {
        if (!old) return old;

        // Pages shape used by the infinite feed query: { pages: [{ items }] }
        if (Array.isArray(old.pages)) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: updatePost(page.items, postId, newLiked, newLikesCount),
            })),
          };
        }

        // Plain array shape used by user-posts / profile galleries.
        if (Array.isArray(old)) {
          return updatePost(old, postId, newLiked, newLikesCount);
        }

        return old;
      };

      queryClient.setQueriesData({ queryKey: ["feed"] }, updater);
      queryClient.setQueriesData({ queryKey: ["user-posts-with-author"] }, updater);
      queryClient.setQueriesData({ queryKey: ["user-posts"] }, updater);
    },
    [postId, queryClient]
  );

  const notifyChange = useCallback(
    (newLiked: boolean, newLikesCount: number) => {
      onLikedChange?.(postId, newLiked, newLikesCount);
    },
    [postId, onLikedChange]
  );

  const likeMutation = useMutation({
    mutationFn: async (): Promise<TogglePostLikeRow> => {
      if (!userId) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("toggle_post_like", {
        target_post_id: postId,
      });

      if (error) throw error;

      const row = data?.[0];
      if (!row) throw new Error("toggle_post_like returned no result");

      return row;
    },

    // Optimistic update: flip UI immediately, roll back on error.
    onMutate: async (): Promise<{ prevLiked: boolean; prevLikesCount: number }> => {
      // Stop any in-flight refetch from clobbering our optimistic snapshot.
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      await queryClient.cancelQueries({ queryKey: ["user-posts-with-author"] });
      await queryClient.cancelQueries({ queryKey: ["user-posts"] });

      const prevLiked = liked;
      const prevLikesCount = likesCount;
      const nextLiked = !prevLiked;
      const nextLikesCount = Math.max(0, prevLikesCount + (nextLiked ? 1 : -1));

      isMutatingRef.current = true;
      setLiked(nextLiked);
      setLikesCount(nextLikesCount);
      applyState(nextLiked, nextLikesCount);
      notifyChange(nextLiked, nextLikesCount);

      return { prevLiked, prevLikesCount };
    },

    onError: (_err, _vars, context) => {
      if (!context) return;
      setLiked(context.prevLiked);
      setLikesCount(context.prevLikesCount);
      applyState(context.prevLiked, context.prevLikesCount);
      notifyChange(context.prevLiked, context.prevLikesCount);
    },

    // Server truth always wins: show exactly what the database computed.
    onSuccess: (row) => {
      setLiked(row.liked);
      setLikesCount(row.likes_count);
      applyState(row.liked, row.likes_count);
      notifyChange(row.liked, row.likes_count);
    },

    onSettled: () => {
      isMutatingRef.current = false;
      // Revalidate all post queries so any other screen shows the same truth.
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["user-posts-with-author"] });
      void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
  });

  const toggleLike = useCallback(() => {
    if (!userId || likeMutation.isPending) return;
    likeMutation.mutate();
  }, [userId, likeMutation.isPending, likeMutation.mutate]);

  return {
    liked,
    likesCount,
    isPending: likeMutation.isPending,
    toggleLike,
  };
}

/** Returns the array with the target post's like fields rewritten. */
function updatePost(
  posts: any[],
  postId: string,
  liked: boolean,
  likesCount: number
): any[] {
  return posts.map((post: any) => {
    if (post?.id !== postId) return post;
    return {
      ...post,
      liked_by_me: liked,
      likes_count: Math.max(0, likesCount),
    };
  });
}