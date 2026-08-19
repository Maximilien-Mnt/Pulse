import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface UseCommentLikeOptions {
  commentId: string;
  postId: string;
  initialLiked: boolean;
  initialLikesCount: number;
  onOptimisticUpdate?: (commentId: string, liked: boolean, likesCount: number) => void;
}

interface UseCommentLikeResult {
  liked: boolean;
  likesCount: number;
  isPending: boolean;
  toggleLike: () => Promise<void>;
}

export function useCommentLike({
  commentId,
  postId,
  initialLiked,
  initialLikesCount,
  onOptimisticUpdate,
}: UseCommentLikeOptions): UseCommentLikeResult {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const isMutatingRef = useRef(false);
  const intendedActionRef = useRef<"like" | "unlike" | null>(null);

  useEffect(() => {
    if (!isMutatingRef.current) {
      setLiked(initialLiked);
      setLikesCount(initialLikesCount);
    }
  }, [initialLiked, initialLikesCount]);

  const likeMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const action = intendedActionRef.current;
      if (!action) {
        throw new Error("No intended action set - cannot determine like/unlike");
      }
      if (!userId) {
        throw new Error("User not authenticated");
      }

      if (action === "unlike") {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("comment_likes")
          .upsert(
            { comment_id: commentId, user_id: userId },
            { onConflict: "comment_id,user_id" }
          );

        if (error) throw error;
      }

      intendedActionRef.current = null;
    },

    onMutate: async (): Promise<{ liked: boolean; likesCount: number } | void> => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });

      const previousLiked = liked;
      const previousLikesCount = likesCount;

      const newLiked = !liked;
      const newLikesCount = likesCount + (newLiked ? 1 : -1);

      intendedActionRef.current = newLiked ? "like" : "unlike";

      setLiked(newLiked);
      setLikesCount(Math.max(0, newLikesCount));

      // Update comment list queries in cache
      queryClient.setQueriesData({ queryKey: ["comments", postId] }, (old: any) => {
        if (!Array.isArray(old)) return old;

        return old.map((comment: any) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              liked_by_me: newLiked,
              likes_count: Math.max(0, newLikesCount),
            };
          }
          return comment;
        });
      });

      // Also update any feed queries that may include comment counts
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
                  comments_count: Math.max(0, (post.comments_count ?? 0) + (newLiked ? 0 : 0)),
                };
              }
              return post;
            }),
          })),
        };
      });

      if (onOptimisticUpdate) {
        onOptimisticUpdate(commentId, newLiked, Math.max(0, newLikesCount));
      }

      return { liked: previousLiked, likesCount: previousLikesCount };
    },

    onError: (_err, _vars, context) => {
      if (context) {
        setLiked(context.liked);
        setLikesCount(context.likesCount);

        queryClient.setQueriesData({ queryKey: ["comments", postId] }, (old: any) => {
          if (!Array.isArray(old)) return old;

          return old.map((comment: any) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                liked_by_me: context.liked,
                likes_count: context.likesCount,
              };
            }
            return comment;
          });
        });

        if (onOptimisticUpdate) {
          onOptimisticUpdate(commentId, context.liked, context.likesCount);
        }
      }

      intendedActionRef.current = null;
    },

    onSuccess: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      await queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const toggleLike = async (): Promise<void> => {
    isMutatingRef.current = true;

    try {
      await likeMutation.mutateAsync();
    } catch (error) {
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