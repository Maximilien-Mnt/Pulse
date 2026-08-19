# Post Likes System - Complete Architecture

## Overview

The post likes system has been completely rewritten to ensure:
- ✅ **Instant UI updates** via optimistic cache manipulation
- ✅ **Data persistence** across app refreshes
- ✅ **Clean architecture** with centralized logic
- ✅ **Error resilience** with proper rollback mechanisms
- ✅ **Future-proof** design for additional features

## Architecture Components

### 1. Database Layer (Migration 001)

**Table: `post_likes`**
- Primary key: `(post_id, user_id)` - prevents duplicate likes
- Foreign keys to `posts` and `profiles` with CASCADE delete
- Created_at timestamp for analytics

**Trigger: `adjust_post_likes_count()`**
- Automatically increments `likes_count` on INSERT
- Automatically decrements `likes_count` on DELETE (using `greatest()` to prevent negative values)
- Single source of truth for likes count

**Why this works:**
The database trigger ensures the count is ALWAYS correct, regardless of:
- How many times the app is refreshed
- Network failures or race conditions
- Multiple devices being used simultaneously

### 2. Centralized Hook: `hooks/usePostLike.ts`

**Purpose:** Single source of truth for like/unlike logic

**Key Features:**

#### Optimistic Updates
```typescript
onMutate: async () => {
  // 1. Cancel pending refetches
  await queryClient.cancelQueries({ queryKey: ["feed"] });
  
  // 2. Snapshot current values for rollback
  const previousLiked = initialLiked;
  const previousLikesCount = initialLikesCount;
  
  // 3. Calculate new values
  const newLiked = !initialLiked;
  const newLikesCount = initialLikesCount + (newLiked ? 1 : -1);
  
  // 4. Update ALL relevant queries in cache instantly
  queryClient.setQueriesData({ queryKey: ["feed"] }, updatePostInCache);
  queryClient.setQueriesData({ queryKey: ["user-posts-with-author"] }, updatePostInCache);
  
  // 5. Return snapshot for potential rollback
  return { liked: previousLiked, likesCount: previousLikesCount };
}
```

#### Error Rollback
```typescript
onError: (_err, _vars, context) => {
  if (context) {
    // Restore previous values in all caches
    queryClient.setQueriesData({ queryKey: ["feed"] }, rollbackPostInCache);
    queryClient.setQueriesData({ queryKey: ["user-posts-with-author"] }, rollbackPostInCache);
  }
}
```

#### Server Synchronization
```typescript
onSuccess: async () => {
  // Refetch to ensure cache matches server state
  await queryClient.invalidateQueries({ queryKey: ["feed"] });
  await queryClient.invalidateQueries({ queryKey: ["user-posts-with-author"] });
}
```

### 3. Component Integration: `PostCard.tsx`

**Before (Old Approach):**
```typescript
// Inline mutation logic - scattered and hard to maintain
const likeMutation = useMutation({
  mutationFn: async () => {
    // Delete/insert post_likes
    // Call RPC functions (redundant!)
    // Manual state management
  },
  onMutate: () => setIsMutating(true),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    setTimeout(() => setIsMutating(false), 300);
  }
});
```

**After (New Approach):**
```typescript
// Clean, declarative usage
const { liked, likesCount, isPending, toggleLike } = usePostLike({
  postId: post.id,
  initialLiked: post.liked_by_me,
  initialLikesCount: post.likes_count,
  onOptimisticUpdate: (postId, newLiked, newLikesCount) => {
    if (newLiked) setShowRing(true); // Trigger animation
  }
});

// Simple handler
const handleLike = useCallback(() => {
  void toggleLike();
}, [toggleLike]);
```

## Data Flow

### When User Likes a Post:

```
1. User taps heart button
   ↓
2. toggleLike() called
   ↓
3. onMutate() fires:
   - Cancel pending refetches
   - Snapshot current state
   - Update ALL cache entries instantly
   - UI re-renders with new count ← INSTANT!
   ↓
4. mutationFn() executes:
   - INSERT INTO post_likes
   - Database trigger fires: likes_count++
   ↓
5. onSuccess() fires:
   - Invalidate queries (triggers refetch)
   - Server data confirms our optimistic update
   ↓
6. Refetch completes with authoritative server data
   - Cache now has server-confirmed values
```

### When User Unlikes a Post:

```
1. User taps heart button
   ↓
2. toggleLike() called
   ↓
3. onMutate() fires:
   - Cancel pending refetches
   - Snapshot current state
   - Update ALL cache entries instantly
   - UI re-renders with decremented count ← INSTANT!
   ↓
4. mutationFn() executes:
   - DELETE FROM post_likes
   - Database trigger fires: likes_count--
   ↓
5. onSuccess() fires:
   - Invalidate queries (triggers refetch)
   - Server data confirms our optimistic update
   ↓
6. Refetch completes with authoritative server data
   - Cache now has server-confirmed values
```

## Cache Invalidation Strategy

### Queries Affected by Likes:

1. **Feed queries** - `["feed"]` (infinite query with pages)
   - Home feed
   - Tag-filtered feed
   - Following feed
   - Sport-specific feed

2. **User posts queries** - `["user-posts-with-author"]`
   - User profile posts
   - Public profile posts

### Why We Invalidate Multiple Query Keys:

```typescript
// Posts can appear in multiple places simultaneously:
// - Main feed (home)
// - User's profile
// - Search results
// - Club/event pages (if shared)

// Updating all ensures consistency everywhere
await queryClient.invalidateQueries({ queryKey: ["feed"] });
await queryClient.invalidateQueries({ queryKey: ["user-posts-with-author"] });
```

## Removed Redundancy

### Migration 028 (Old - Now Redundant):
```sql
-- These RPC functions are NO LONGER NEEDED
CREATE FUNCTION increment_post_likes(post_id uuid);
CREATE FUNCTION decrement_post_likes(post_id uuid);
```

**Why removed:** The database trigger `adjust_post_likes_count()` from migration 001 already handles this automatically. Calling both the trigger AND the RPC was causing double-updates.

### Migration 031 (New - Cleanup):
```sql
-- Remove the redundant RPC functions
DROP FUNCTION IF EXISTS public.increment_post_likes(uuid);
DROP FUNCTION IF EXISTS public.decrement_post_likes(uuid);

-- Keep the trigger from migration 001 - it's the single source of truth
```

## Error Handling

### Network Failure Scenario:

```
1. User likes post
   ↓
2. Optimistic update shows +1 instantly
   ↓
3. Network request fails
   ↓
4. onError() fires:
   - Rollback ALL cache entries to previous values
   - UI instantly reverts to old count
   ↓
5. User sees error and can retry
```

### Race Condition Prevention:

```typescript
onMutate: async () => {
  // Cancel any ongoing refetches BEFORE making changes
  await queryClient.cancelQueries({ queryKey: ["feed"] });
  await queryClient.cancelQueries({ queryKey: ["user-posts-with-author"] });
  
  // Now safe to update cache without interference
  // ...
}
```

## Testing Checklist

### Basic Functionality:
- [ ] Like a post with 0 likes → count increases to 1
- [ ] Unlike a post with 1 like → count decreases to 0
- [ ] Like animation plays when liking
- [ ] Heart icon changes color (primary when liked)
- [ ] Button is disabled while mutation is pending
- [ ] Cannot double-click (isPending prevents it)

### Persistence:
- [ ] Like a post
- [ ] Close the app completely
- [ ] Reopen the app
- [ ] Verify the like and count persist

### Cache Consistency:
- [ ] Like a post in the feed
- [ ] Navigate to user's profile
- [ ] Verify count is updated there too
- [ ] Go back to feed
- [ ] Verify count is still correct

### Error Handling:
- [ ] Enable airplane mode
- [ ] Try to like a post
- [ ] Verify optimistic update shows temporarily
- [ ] Verify UI rolls back on error
- [ ] Disable airplane mode
- [ ] Verify normal operation resumes

### Edge Cases:
- [ ] Like while scrolling fast
- [ ] Like during feed refresh
- [ ] Like same post from two different screens
- [ ] Unlike immediately after liking
- [ ] Rapid multiple likes/unlikes (should be prevented by isPending)

## Implementation Files

### New Files:
- `hooks/usePostLike.ts` - Centralized like management hook
- `supabase/migrations/031_deprecate_redundant_likes_rpc.sql` - Database cleanup

### Modified Files:
- `components/feed/PostCard.tsx` - Uses new hook, removed inline mutation logic

### Unchanged Files:
- `hooks/useFeed.ts` - Still fetches liked status correctly
- `hooks/useUserPosts.ts` - Still normalizes post data correctly
- Database tables and triggers (migration 001) - Already working correctly

## Future Enhancements

The new architecture makes it easy to add:

1. **Like analytics** - Track when and how often users like posts
2. **Unlike confirmation** - Add a dialog before unliking
3. **Like notifications** - Notify post authors when their posts are liked
4. **Batch operations** - Like multiple posts at once (e.g., from search results)
5. **Optimistic reactions** - Extend the pattern to comments and other reactions
6. **Offline support** - Queue likes for when network returns

## Migration Guide for Other Components

If you need to add like functionality to other components (e.g., ClubCard, EventCard):

```typescript
import { usePostLike } from "@/hooks/usePostLike";

function MyComponent({ post }) {
  const { liked, likesCount, isPending, toggleLike } = usePostLike({
    postId: post.id,
    initialLiked: post.liked_by_me,
    initialLikesCount: post.likes_count,
  });

  return (
    <Pressable onPress={toggleLike} disabled={isPending}>
      <Text>{likesCount} likes</Text>
    </Pressable>
  );
}
```

## Common Pitfalls to Avoid

1. **Don't bypass the hook** - Always use `usePostLike` for like/unlike operations
2. **Don't manually update post.likes_count** - Let the hook and database handle it
3. **Don't call invalidateQueries in multiple places** - The hook handles it
4. **Don't use local state for likes_count** - It's managed by the hook via cache
5. **Don't forget to pass the post ID** - Each component instance needs its own `postId`

## Performance Considerations

- **Optimistic updates happen synchronously** - No waiting for server
- **Cache updates are O(n)** where n = number of posts in cache (usually < 100)
- **Single mutation per like action** - Not multiple RPC calls
- **Smart invalidation** - Only refetches affected queries, not everything

## Summary

This implementation provides a robust, instant, and maintainable likes system that:
1. Updates UI immediately (optimistic updates)
2. Persists across app refreshes (database trigger)
3. Handles errors gracefully (rollback mechanism)
4. Prevents race conditions (cache cancellation)
5. Works across all views (multiple query invalidation)
6. Is easy to extend (centralized hook pattern)