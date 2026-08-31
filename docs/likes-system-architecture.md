# Post Likes System - Complete Architecture

## Overview

The post likes system has been **completely rewritten** to guarantee one thing:
**the count you see is always the exact number of likes that exist for a post.**

The previous implementation suffered from a critical database bug: the trigger
`adjust_post_likes_count()` was `SECURITY INVOKER`, so when a **non-author**
liked a post, the trigger's `UPDATE posts SET likes_count = likes_count + 1`
ran under the RLS policy `posts_update_own` (`author_id = auth.uid()`) and
silently updated **0 rows**. The counter only ever went up for the author's own
self-likes, so the stored counts drifted below the real counts.

The rewrite fixes the root cause at the database level and simplifies the client.

## Architecture Components

### 1. Database Layer (Migration 039)

**Table: `post_likes`** (unchanged)
- Composite primary key `(post_id, user_id)` — **enforces at most one like per
  user per post at the database level**. Duplicate likes are impossible.
- Foreign keys to `posts` and `profiles` with CASCADE delete.

**Trigger: `adjust_post_likes_count()`** (rewritten)
- Now `SECURITY DEFINER` — RLS can never block the counter update.
- **Recomputes the exact count** (`COUNT(*)`) on every INSERT/DELETE instead of
  incrementing/decrementing. Self-healing: any edge case always converges.

**RPC: `toggle_post_like(target_post_id)`** (new, the single write path)
- `SECURITY INVOKER` (RLS still applies: users can only touch their own rows).
- Atomically likes or unlikes for `auth.uid()`.
- **Returns the exact new state** `{ liked, likes_count }` computed from the
  `post_likes` table — the server is the source of truth.
- Raises `NOT_AUTHENTICATED` if no user, `POST_NOT_FOUND` if the post is gone.

**Author stats** (`refresh_author_likes_received()`) — fixed with the same
SECURITY DEFINER + exact `COUNT(*)` treatment so `user_stats.total_likes_received`
(shown on profiles) never drifts either.

### 2. Client: `hooks/usePostLike.ts`

One mutation, one RPC, no magic:

```typescript
const { liked, likesCount, isPending, toggleLike } = usePostLike({
  postId: post.id,
  initialLiked: post.liked_by_me ?? false,
  initialLikesCount: post.likes_count ?? 0,
});
```

**Flow on tap:**
1. `toggleLike()` → `supabase.rpc("toggle_post_like", ...)`.
2. Optimistic update flips the UI instantly (heart + count) for immediate feedback.
3. Server returns the authoritative `{ liked, likes_count }` — this value wins
   and is written to every cached query (`feed`, `user-posts-with-author`,
   `user-posts`).
4. On error, the optimistic snapshot is rolled back everywhere.
5. `onSettled` invalidates the post queries so any other screen stays in sync.

Refreshing the app, changing settings, or anything else never adds/cancels a
like — a like is only ever created/removed by the user action, persisted in
`post_likes`, and read back from there.

### 3. UI: `components/feed/LikeButton.tsx`

- `liked` → **blue, filled heart** (`primary` token); not liked → default icon.
- Small **pop animation** on every like AND unlike (respects reduced motion).
- Count rendered next to the icon comes straight from the hook (server-exact).

`components/feed/PostCard.tsx` uses `<LikeButton>` and nothing else.

### 4. Like-state loading across every screen

- `hooks/useFeed.ts` — batched `post_likes` lookup → `liked_by_me` per row.
- `hooks/useUserPosts.ts` — now loads the viewer's liked ids (was hardcoded `false`).
- `hooks/useUserPublicContent.ts` — same fix for public profile galleries.

## Verification

### Database level (migration 039 applied)
- [x] `posts.likes_count` reconciled → **zero** posts with drift.
- [x] `user_stats.total_likes_received` reconciled → **zero** drift.
- [x] `toggle_post_like` tested: unlike → 2→1, like → 1→2, exact each time.
- [x] Composite PK verified: `COUNT(DISTINCT (post_id, user_id))` equals `COUNT(*)`.

### Client level
- [ ] Like a post → heart turns blue instantly, count +1.
- [ ] Unlike → default icon, count -1.
- [ ] Refresh / refetch → state persists (comes from `post_likes`).
- [ ] Same post on profile pages shows the same blue heart / count.
- [ ] Double-tap cannot create a second like (RPC + PK).

## Implementation Files

- `supabase/migrations/039_rewrite_post_likes_(done).sql` — trigger + RPC + reconciliation.
- `hooks/usePostLike.ts` — rewritten against `toggle_post_like`.
- `components/feed/LikeButton.tsx` — new button with pop animation.
- `components/feed/PostCard.tsx` — uses LikeButton, dropped the old ring hack.
- `hooks/useFeed.ts`, `hooks/useUserPosts.ts`, `hooks/useUserPublicContent.ts` —
  all load real `liked_by_me` + exact counts.
- `types/index.ts` — typed `toggle_post_like` (dropped the deleted RPCs).

## Summary

This implementation guarantees a **clean, always-right likes system**:
1. One like per user per post — enforced by the composite PK.
2. Exact counts — recomputed from the data on every change, and on write the
   RPC returns the exact number.
3. Persists across refresh — stored in `post_likes`, loaded back on every fetch.
4. Optimistic UI with pop animation — instant feedback.
5. Consistent across every screen — the hook patches all post caches.
6. No drift — SECURITY DEFINER triggers and one-time reconciliation.