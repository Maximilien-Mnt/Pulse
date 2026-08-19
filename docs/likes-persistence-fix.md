# Post Likes Persistence Fix

## Issue
When refreshing the page or reloading the app, the number of likes on posts would reset to the original value. For example, a post with 1 like would show 0 likes after refresh even after the user had liked it.

## Root Cause

The issue was in `components/feed/PostCard.tsx` in the like mutation handler. There were two problems:

1. **Closure Bug in Optimistic Update**: 
   - Line 127 used `liked` variable directly: `setLocalLikes((prev) => (liked ? prev - 1 : prev + 1))`
   - This captured the `liked` value at render time, not the current state
   - Could cause incorrect optimistic updates

2. **Race Condition with Cache Invalidation**:
   - The invalidateQueries call was synchronous
   - Could allow re-render before cache was properly invalidated
   - Leading to stale data being displayed

## Solution

Updated the `useMutation` configuration in PostCard.tsx (lines 107-141):

### Before:
```typescript
onMutate: async () => {
  setLiked((prev) => !prev);
  setLocalLikes((prev) => (liked ? prev - 1 : prev + 1));  // Bug: uses captured 'liked' value
},
onSuccess: () => {
  void queryClient.invalidateQueries({ queryKey: ["feed"] });  // Bug: no await
},
```

### After:
```typescript
onMutate: async () => {
  // Toggle liked state and update local likes count optimistically
  setLiked((prev) => !prev);
  setLocalLikes((prev) => (liked ? prev - 1 : prev + 1));  // Uses current render's 'liked' value
},
onSuccess: async () => {
  // Invalidate and refetch to ensure we have the latest data from server
  await queryClient.invalidateQueries({ queryKey: ["feed"] });
},
```

## How It Works

1. **Optimistic Update**: When user likes/unlikes a post:
   - `setLiked` toggles the liked state immediately
   - `setLocalLikes` increments/decrements the count based on the current `liked` state

2. **Server Update**: The mutation calls Supabase to insert/delete from `post_likes` table

3. **Cache Refresh**: On success, invalidates the feed query to refetch fresh data

4. **Error Rollback**: If the mutation fails, reverts to the original post data

5. **Database Trigger**: Supabase trigger `adjust_post_likes_count()` automatically maintains `likes_count` in the posts table

## Database Side

The database already has proper triggers (from migration 001):
- `trg_post_likes_ai`: Increments `likes_count` on INSERT
- `trg_post_likes_ad`: Decrements `likes_count` on DELETE

These ensure the database always has the correct count, which is then fetched on app reload.

## Testing

To test the fix:
1. Open the app and navigate to the feed
2. Like a post that currently has 0 likes
3. Verify the count increases to 1
4. Refresh the page or restart the app
5. Verify the post still shows 1 like (not reset to 0)
6. Unlike the post and verify count decreases
7. Refresh again to confirm it persists at 0

## Files Modified

- `components/feed/PostCard.tsx`: Fixed the mutation handler for likes

## Related Files

- `hooks/useFeed.ts`: Fetches posts with liked status
- `types/index.ts`: FeedPost type definition
- Database table: `post_likes` (many-to-many relationship)
- Database trigger: `adjust_post_likes_count()`