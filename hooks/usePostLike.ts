import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface UsePostLikeOptions {
  postId: string;
  initialLiked: boolean;
  initialLikesCount: number;
  onOptimisticUpdate?: (postId: string, liked: boolean, likesCount: number) => void;
}

interface UsePostLikeResult {
  liked: boolean;
  likesCount: number;
  isPending: boolean;
  toggleLike: () => Promise<void>;
}

/**
 * Centralized hook for managing post likes with optimistic updates
 * 
 * Features:
 * - Instant UI updates via optimistic cache manipulation
 * - Proper rollback on errors
 * - Centralized likes count management
 * - Automatic cache invalidation for all relevant queries
 * - Prevents race conditions and ensures data consistency
 * - Manages local state to prevent stale prop overwrites
 */
export function usePostLike({
  postId,
  initialLiked,
  initialLikesCount,
  onOptimisticUpdate,
}: UsePostLikeOptions): UsePostLikeResult {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  // Local state management to prevent stale props from overwriting optimistic updates
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  
  // Track when mutation is in progress to prevent useEffect from overwriting optimistic updates
  const isMutatingRef = useRef(false);

  // Sync local state when props change (e.g., after refetch), but NOT during mutation
  useEffect(() => {
    // Only sync from props if we're not currently mutating
    if (!isMutatingRef.current) {
      setLiked(initialLiked);
      setLikesCount(initialLikesCount);
    }
  }, [initialLiked, initialLikesCount]);

  // Track the intended action (like/unlike) to avoid stale closure issues
  const intendedActionRef = useRef<"like" | "unlike" | null>(null);

  const likeMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      // CRITICAL: Always use the intended action from onMutate
      // The 'liked' variable is stale here due to closure timing
      const action = intendedActionRef.current;

      if (!action) {
        console.error(`[usePostLike ${postId}] No intended action set`);
        throw new Error("No intended action set - cannot determine like/unlike");
      }

      if (!userId) {
        console.error(`[usePostLike ${postId}] User not authenticated`);
        throw new Error("User not authenticated");
      }

      if (action === "unlike") {
        const { error: deleteError } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (deleteError) {
          console.error(`[usePostLike ${postId}] Unlike failed`, deleteError);
          throw deleteError;
        }
      } else {
        const { error: insertError } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: userId,
        });

        if (insertError) {
          console.error(`[usePostLike ${postId}] Like failed`, insertError);
          throw insertError;
        }
      }

      intendedActionRef.current = null;
    },

    // Optimistic update: update UI immediately before server responds
    onMutate: async (): Promise<{ liked: boolean; likesCount: number } | void> => {
      // Cancel any outgoing refetches to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      await queryClient.cancelQueries({ queryKey: ["user-posts-with-author"] });

      const previousLiked = liked;
      const previousLikesCount = likesCount;
      const newLiked = !liked;
      const newLikesCount = likesCount + (newLiked ? 1 : -1);

      intendedActionRef.current = newLiked ? "like" : "unlike";

      setLiked(newLiked);
      setLikesCount(Math.max(0, newLikesCount));

      queryClient.setQueriesData({ queryKey: ["feed"] }, (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((post: any) => {
              if (post.id === postId) {
                return {
                  ...post,
                  liked_by_me: newLiked,
                  likes_count: Math.max(0, newLikesCount),
                };
              }
              return post;
            }),
          })),
        };
      });

      queryClient.setQueriesData({ queryKey: ["user-posts-with-author"] }, (old: any) => {
        if (!Array.isArray(old)) return old;

        return old.map((post: any) => {
          if (post.id === postId) {
            return {
              ...post,
              liked_by_me: newLiked,
              likes_count: Math.max(0, newLikesCount),
            };
          }
          return post;
        });
      });

      if (onOptimisticUpdate) {
        onOptimisticUpdate(postId, newLiked, Math.max(0, newLikesCount));
      }

      return { liked: previousLiked, likesCount: previousLikesCount };
    },

    onError: (err, _vars, context) => {
      console.error(`[usePostLike ${postId}] Mutation failed`, err);

      if (context) {
        setLiked(context.liked);
        setLikesCount(context.likesCount);

        queryClient.setQueriesData({ queryKey: ["feed"] }, (old: any) => {
          if (!old?.pages) return old;

          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((post: any) => {
                if (post.id === postId) {
                  return {
                    ...post,
                    liked_by_me: context.liked,
                    likes_count: context.likesCount,
                  };
                }
                return post;
              }),
            })),
          };
        });

        queryClient.setQueriesData({ queryKey: ["user-posts-with-author"] }, (old: any) => {
          if (!Array.isArray(old)) return old;

          return old.map((post: any) => {
            if (post.id === postId) {
              return {
                ...post,
                liked_by_me: context.liked,
                likes_count: context.likesCount,
              };
            }
            return post;
          });
        });

        if (onOptimisticUpdate) {
          onOptimisticUpdate(postId, context.liked, context.likesCount);
        }
      }
    },

    onSuccess: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["user-posts-with-author"] });
    },

    // On settled: always execute (cleanup if needed)
    onSettled: () => {
      // No additional cleanup needed
    },
  });

  const toggleLike = async (): Promise<void> => {
    isMutatingRef.current = true;

    try {
      await likeMutation.mutateAsync();
    } catch (error) {
      console.error(`[usePostLike ${postId}] toggleLike failed`, error);
      throw error;
    } finally {
      isMutatingRef.current = false;
    }
  };

  return {
    liked,
    likesCount,
    isPending: likeMutation.isPending,
    toggleLike,
  };
}
