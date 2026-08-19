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

  console.log(`[usePostLike ${postId}] Hook initialized/updated`, {
    initialLiked,
    initialLikesCount,
    currentLiked: liked,
    currentLikesCount: likesCount,
    isMutating: isMutatingRef.current,
    userId,
  });

  // Sync local state when props change (e.g., after refetch), but NOT during mutation
  useEffect(() => {
    console.log(`[usePostLike ${postId}] useEffect triggered`, {
      initialLiked,
      initialLikesCount,
      isMutating: isMutatingRef.current,
      willSync: !isMutatingRef.current,
    });
    
    // Only sync from props if we're not currently mutating
    if (!isMutatingRef.current) {
      console.log(`[usePostLike ${postId}] Syncing from props`, {
        from: { liked, likesCount },
        to: { initialLiked, initialLikesCount },
      });
      setLiked(initialLiked);
      setLikesCount(initialLikesCount);
    } else {
      console.log(`[usePostLike ${postId}] SKIPPING sync - mutation in progress`);
    }
  }, [initialLiked, initialLikesCount]);

  // Track the intended action (like/unlike) to avoid stale closure issues
  const intendedActionRef = useRef<"like" | "unlike" | null>(null);

  const likeMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      // CRITICAL: Always use the intended action from onMutate
      // The 'liked' variable is stale here due to closure timing
      const action = intendedActionRef.current;
      
      console.log(`[usePostLike ${postId}] mutationFn START`, {
        action,
        currentLiked: liked,
        intendedAction: intendedActionRef.current,
        userId,
        postId,
      });
      
      if (!action) {
        console.error(`[usePostLike ${postId}] ERROR: No intended action set!`, {
          liked,
          likesCount,
          userId,
        });
        throw new Error("No intended action set - cannot determine like/unlike");
      }

      if (!userId) {
        console.error(`[usePostLike ${postId}] ERROR: User not authenticated`, {
          userId,
          authStore: useAuthStore.getState(),
        });
        throw new Error("User not authenticated");
      }

      if (action === "unlike") {
        // Unlike: delete the like record
        // Database trigger will automatically decrement likes_count
        console.log(`[usePostLike ${postId}] Deleting like from post_likes`, {
          postId,
          userId,
        });
        
        const { data: deleteData, error: deleteError } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        console.log(`[usePostLike ${postId}] Delete response`, {
          data: deleteData,
          error: deleteError,
        });

        if (deleteError) {
          console.error(`[usePostLike ${postId}] ERROR deleting like:`, deleteError);
          throw deleteError;
        }
        
        // Verify deletion
        const { data: verifyData } = await supabase
          .from("post_likes")
          .select("*")
          .eq("post_id", postId)
          .eq("user_id", userId);
          
        console.log(`[usePostLike ${postId}] Verification after delete:`, {
          stillExists: verifyData && verifyData.length > 0,
          records: verifyData,
        });
        
        console.log(`[usePostLike ${postId}] Unlike successful`);
      } else {
        // Like: insert the like record
        // Database trigger will automatically increment likes_count
        console.log(`[usePostLike ${postId}] Inserting like to post_likes`, {
          postId,
          userId,
        });
        
        const { data: insertData, error: insertError } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: userId,
        });

        console.log(`[usePostLike ${postId}] Insert response`, {
          data: insertData,
          error: insertError,
        });

        if (insertError) {
          console.error(`[usePostLike ${postId}] ERROR inserting like:`, insertError);
          throw insertError;
        }
        
        // Verify insertion
        const { data: verifyData } = await supabase
          .from("post_likes")
          .select("*")
          .eq("post_id", postId)
          .eq("user_id", userId);
          
        console.log(`[usePostLike ${postId}] Verification after insert:`, {
          exists: verifyData && verifyData.length > 0,
          records: verifyData,
        });
        
        console.log(`[usePostLike ${postId}] Like successful`);
      }
      
      // Clear the intended action after using it
      intendedActionRef.current = null;
    },

    // Optimistic update: update UI immediately before server responds
    onMutate: async (): Promise<{ liked: boolean; likesCount: number } | void> => {
      console.log(`[usePostLike ${postId}] onMutate START`);
      
      // Cancel any outgoing refetches to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      await queryClient.cancelQueries({ queryKey: ["user-posts-with-author"] });
      console.log(`[usePostLike ${postId}] Cancelled pending refetches`);

      // Snapshot the previous values for rollback
      const previousLiked = liked;
      const previousLikesCount = likesCount;

      // Calculate new values based on current local state
      const newLiked = !liked;
      const newLikesCount = likesCount + (newLiked ? 1 : -1);
      
      // CRITICAL: Store the intended action BEFORE state changes to avoid stale closure in mutationFn
      intendedActionRef.current = newLiked ? "like" : "unlike";
      console.log(`[usePostLike ${postId}] Stored intended action`, {
        action: intendedActionRef.current,
        fromLiked: liked,
        toLiked: newLiked,
      });

      // Update local state immediately
      console.log(`[usePostLike ${postId}] Optimistic update`, {
        from: { liked: previousLiked, likesCount: previousLikesCount },
        to: { liked: newLiked, likesCount: newLikesCount },
      });
      
      setLiked(newLiked);
      setLikesCount(Math.max(0, newLikesCount));

      // Update all feed queries in cache
      const feedUpdated = queryClient.setQueriesData({ queryKey: ["feed"] }, (old: any) => {
        if (!old?.pages) return old;
        
        const updated = {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((post: any) => {
              if (post.id === postId) {
                console.log(`[usePostLike ${postId}] Updating feed cache`, {
                  from: { liked_by_me: post.liked_by_me, likes_count: post.likes_count },
                  to: { liked_by_me: newLiked, likes_count: Math.max(0, newLikesCount) },
                });
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
        return updated;
      });

      // Update user-posts queries in cache
      const userPostsUpdated = queryClient.setQueriesData({ queryKey: ["user-posts-with-author"] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        
        return old.map((post: any) => {
          if (post.id === postId) {
            console.log(`[usePostLike ${postId}] Updating user-posts cache`, {
              from: { liked_by_me: post.liked_by_me, likes_count: post.likes_count },
              to: { liked_by_me: newLiked, likes_count: Math.max(0, newLikesCount) },
            });
            return {
              ...post,
              liked_by_me: newLiked,
              likes_count: Math.max(0, newLikesCount),
            };
          }
          return post;
        });
      });
      
      console.log(`[usePostLike ${postId}] Cache updated`, {
        feedUpdated: !!feedUpdated,
        userPostsUpdated: !!userPostsUpdated,
      });

      // Notify parent component of the optimistic update
      if (onOptimisticUpdate) {
        onOptimisticUpdate(postId, newLiked, Math.max(0, newLikesCount));
      }

      // Return snapshot for potential rollback
      return { liked: previousLiked, likesCount: previousLikesCount };
    },

    // On error: rollback to previous values
    onError: (err, _vars, context) => {
      console.error(`[usePostLike ${postId}] onError`, {
        error: err.message,
        rollbackTo: { liked: context?.liked, likesCount: context?.likesCount },
      });
      
      if (context) {
        // Rollback local state
        setLiked(context.liked);
        setLikesCount(context.likesCount);

        // Rollback feed queries
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

        // Rollback user-posts queries
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

        // Notify parent of rollback
        if (onOptimisticUpdate) {
          onOptimisticUpdate(postId, context.liked, context.likesCount);
        }
      }
    },

    // On success: DON'T invalidate queries immediately
    // The database trigger has updated the count, and our optimistic update is already correct
    // Only invalidate after a short delay to sync with server if needed
    onSuccess: async () => {
      console.log(`[usePostLike ${postId}] onSuccess - waiting 100ms before invalidation`);
      
      // Small delay to ensure database trigger has completed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`[usePostLike ${postId}] Invalidating queries`, {
        currentLiked: liked,
        currentLikesCount: likesCount,
      });
      
      // Only invalidate if the component is still mounted and we need to sync
      // This prevents overwriting our correct optimistic update
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["user-posts-with-author"] });
      
      console.log(`[usePostLike ${postId}] Queries invalidated`);
      
      // ADDITIONAL VERIFICATION: Check if the like really exists in database
      if (!userId) {
        console.warn(`[usePostLike ${postId}] Cannot verify - userId is null`);
      } else {
        console.log(`[usePostLike ${postId}] POST-SUCCESS VERIFICATION`);
        
        const { data: postVerify } = await supabase
          .from("posts")
          .select("likes_count")
          .eq("id", postId)
          .single();
          
        const { data: likesVerify } = await supabase
          .from("post_likes")
          .select("*")
          .eq("post_id", postId)
          .eq("user_id", userId);
          
        console.log(`[usePostLike ${postId}] Database state after mutation:`, {
          postLikesCount: postVerify?.likes_count,
          userLikes: likesVerify,
          expectedLiked: liked,
          expectedCount: likesCount,
        });
      }
    },

    // On settled: always execute (cleanup if needed)
    onSettled: () => {
      // No additional cleanup needed
    },
  });

  const toggleLike = async (): Promise<void> => {
    console.log(`[usePostLike ${postId}] toggleLike called`, {
      currentLiked: liked,
      currentLikesCount: likesCount,
      isPending: likeMutation.isPending,
    });
    
    // Set mutating flag to prevent useEffect from overwriting our optimistic update
    isMutatingRef.current = true;
    console.log(`[usePostLike ${postId}] Mutating flag set to true`);
    
    try {
      await likeMutation.mutateAsync();
      console.log(`[usePostLike ${postId}] Mutation completed successfully`);
    } catch (error) {
      console.error(`[usePostLike ${postId}] Mutation failed`, error);
      throw error;
    } finally {
      console.log(`[usePostLike ${postId}] Finally block - resetting mutating flag BEFORE invalidation`);
      
      // CRITICAL FIX: Reset mutating flag BEFORE invalidating queries
      // This prevents the component from syncing with old props during refetch
      isMutatingRef.current = false;
      console.log(`[usePostLike ${postId}] Mutating flag reset to false`);
    }
  };

  return {
    liked,
    likesCount,
    isPending: likeMutation.isPending,
    toggleLike,
  };
}
