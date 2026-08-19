# Comment Likes System - Architecture

## Overview

The comment likes system follows the same proven pattern as the post likes system (`hooks/usePostLike.ts`), ensuring:
- ✅ **Instant UI updates** via optimistic cache manipulation
- ✅ **Data persistence** across app refreshes
- ✅ **Clean architecture** with centralized logic
- ✅ **Error resilience** with proper rollback mechanisms

## Architecture Components

### 1. Database Layer (Migration 001)

**Table: `comment_likes`**
- Primary key: `(comment_id, user_id)` - prevents duplicate likes
- Foreign keys to `post_comments` and `profiles` with CASCADE delete
- Created_at timestamp for analytics

**Trigger: `adjust_comment_likes_count()`**
- Automatically increments `likes_count` on INSERT
- Automatically decrements `likes_count` on DELETE (using `greatest()` to prevent negative values)
- Single source of truth for comment likes count

### 2. Centralized Hook: `hooks/useCommentLike.ts`

**Purpose:** Single source of truth for comment like/unlike logic

**Key Features:**

#### Optimistic Updates
```typescript
onMutate: async () => {
  // 1. Cancel pending refetches
  await queryClient.cancelQueries({ queryKey: ["comments", postId] });
  
  // 2. Snapshot current values for rollback
  const previousLiked = initialLiked;
  const previousLikesCount = initialLikesCount;
  
  // 3. Calculate new values
  const newLiked = !initialLiked;
  const newLikesCount = initialLikesCount + (newLiked ? 1 : -1);
  
  // 4. Update cache instantly
  queryClient.setQueriesData({ queryKey: ["comments", postId] }, updateCommentInCache);
  
  // 5. Return snapshot for potential rollback
  return { liked: previousLiked, likesCount: previousLikesCount };
}
```

#### Error Rollback
```typescript
onError: (_err, _vars, context) => {
  if (context) {
    // Restore previous values in cache
    queryClient.setQueriesData({ queryKey: ["comments", postId] }, rollbackCommentInCache);
  }
}
```

#### Server Synchronization
```typescript
onSuccess: async () => {
  // Refetch to ensure cache matches server state
  await queryClient.invalidateQueries({ queryKey: ["comments", postId] });
  await queryClient.invalidateQueries({ queryKey: ["feed"] });
}
```

### 3. Component Integration: `components/feed/CommentItem.tsx`

**Before (Old Approach):**
```typescript
// Inline mutation logic - scattered and problematic
const likeMut = useMutation({
  mutationFn: async () => {
    // Delete/insert comment_likes
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["comments", comment.post_id] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  },
  onError: () => Toast.show({ type: "error", text1: "Erreur like commentaire" }),
});
```

**After (New Approach):**
```typescript
// Clean, declarative usage
const { liked, likesCount, isPending, toggleLike } = useCommentLike({
  commentId: comment.id,
  postId: comment.post_id,
  initialLiked: !!comment.liked_by_me,
  initialLikesCount: comment.likes_count,
});

// Simple handler
<Pressable onPress={toggleLike} disabled={!userId || isPending}>
  <Ionicons name={liked ? "heart" : "heart-outline"} size={18} color={liked ? "#EF4444" : "#94A3B8"} />
  <Text className="text-xs text-neutral-500">{likesCount}</Text>
</Pressable>
```

## Data Flow

### When User Likes a Comment:

```
1. User taps heart button
   ↓
2. toggleLike() called
   ↓
3. onMutate() fires:
   - Cancel pending refetches
   - Snapshot current state
   - Update cache instantly
   - UI re-renders with new count ← INSTANT!
   ↓
4. mutationFn() executes:
   - INSERT INTO comment_likes
   - Database trigger fires: likes_count++
   ↓
5. onSuccess() fires:
   - Invalidate queries (triggers refetch)
   - Server data confirms our optimistic update
   ↓
6. Refetch completes with authoritative server data
```

### When User Unlikes a Comment:

```
1. User taps heart button
   ↓
2. toggleLike() called
   ↓
3. onMutate() fires:
   - Cancel pending refetches
   - Snapshot current state
   - Update cache instantly
   - UI re-renders with decremented count ← INSTANT!
   ↓
4. mutationFn() executes:
   - DELETE FROM comment_likes
   - Database trigger fires: likes_count--
   ↓
5. onSuccess() fires:
   - Invalidate queries (triggers refetch)
   - Server data confirms our optimistic update
   ↓
6. Refetch completes with authoritative server data
```

## Cache Invalidation Strategy

### Queries Affected by Comment Likes:

1. **Comment queries** - `["comments", postId]`
   - Comments list for a specific post
   - Supports sorting by date or likes

2. **Feed queries** - `["feed"]`
   - Main feed (in case post comment counts need updating)

### Why We Invalidate Multiple Query Keys:

```typescript
// Comment likes can affect:
// 1. The comment list itself (liked status and count)
// 2. Post metadata (though comment total count is managed separately)
await queryClient.invalidateQueries({ queryKey: ["comments", postId] });
await queryClient.invalidateQueries({ queryKey: ["feed"] });
```

## Consistency with Post Likes System

### Similarities:
- ✅ Same optimistic update pattern
- ✅ Same rollback mechanism
- ✅ Same state management approach (local state + refs)
- ✅ Same database trigger pattern
- ✅ Same cache invalidation strategy
- ✅ Same error handling

### Differences:
- Different table: `comment_likes` vs `post_likes`
- Different query keys: `["comments", postId]` vs `["feed"]`
- Different trigger function: `adjust_comment_likes_count()` vs `adjust_post_likes_count()`
- Additional parameter: `postId` (to track which post's comments to update)

## Common Pitfalls Avoided

1. **No stale closure issues** - Uses `intendedActionRef` to track intended action
2. **No race conditions** - Cancels pending refetches before optimistic update
3. **No prop overwrites** - `isMutatingRef` prevents useEffect from overwriting optimistic updates
4. **No double invalidation** - Single source of truth for cache updates
5. **No manual count management** - Database trigger handles count automatically

## Testing Checklist

### Basic Functionality:
- [ ] Like a comment with 0 likes → count increases to 1
- [ ] Unlike a comment with 1 like → count decreases to 0
- [ ] Heart icon changes color (red when liked)
- [ ] Button is disabled while mutation is pending
- [ ] Cannot double-click (isPending prevents it)

### Persistence:
- [ ] Like a comment
- [ ] Close the app completely
- [ ] Reopen the app
- [ ] Verify the like and count persist

### Cache Consistency:
- [ ] Like a comment in comments screen
- [ ] Navigate back to feed
- [ ] Verify comment count is still correct

### Error Handling:
- [ ] Enable airplane mode
- [ ] Try to like a comment
- [ ] Verify optimistic update shows temporarily
- [ ] Verify UI rolls back on error
- [ ] Disable airplane mode
- [ ] Verify normal operation resumes

## Implementation Files

### New Files:
- `hooks/useCommentLike.ts` - Centralized comment like management hook

### Modified Files:
- `components/feed/CommentItem.tsx` - Uses new hook, removed inline mutation logic

### Unchanged Files:
- `app/(tabs)/feed/[postId]/comments.tsx` - Already fetches liked status correctly
- `hooks/useFeed.ts` - No changes needed
- Database tables and triggers (migration 001) - Already working correctly

## Future Enhancements

The new architecture makes it easy to add:
1. **Comment like analytics** - Track when and how often users like comments
2. **Unlike confirmation** - Add a dialog before unliking
3. **Like notifications** - Notify comment authors when their comments are liked
4. **Batch operations** - Like multiple comments at once
5. **Optimistic reactions** - Extend pattern to other reaction types

## Migration Guide for Other Components

If you need to add comment like functionality to other components:

```typescript
import { useCommentLike } from "@/hooks/useCommentLike";

function MyComponent({ comment, postId }) {
  const { liked, likesCount, isPending, toggleLike } = useCommentLike({
    commentId: comment.id,
    postId: postId,
    initialLiked: comment.liked_by_me,
    initialLikesCount: comment.likes_count,
  });

  return (
    <Pressable onPress={toggleLike} disabled={isPending}>
      <Ionicons name={liked ? "heart" : "heart-outline"} size={18} color={liked ? "#EF4444" : "#94A3B8"} />
      <Text>{likesCount}</Text>
    </Pressable>
  );
}
```

## Summary

This implementation provides a robust, instant, and maintainable comment likes system that:
1. Updates UI immediately (optimistic updates)
2. Persists across app refreshes (database trigger)
3. Handles errors gracefully (rollback mechanism)
4. Prevents race conditions (cache cancellation)
5. Works across all views (multiple query invalidation)
6. Is easy to extend (centralized hook pattern)
7. Matches the proven post likes architecture exactly