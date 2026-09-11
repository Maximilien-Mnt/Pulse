# Feed pagination — migration plan for remaining lists

Feed (`hooks/useFeed.ts` + `app/(tabs)/feed/index.tsx`) is the reference
implementation. Do NOT modify the lists below in the same task; migrate one
list at a time following this recipe.

## Reference pattern (feed, done)

- `useInfiniteQuery` with pages shaped `{ items, nextCursor }`.
- Explicit column list (never `select("*")`).
- Stable order: primary timestamp `created_at DESC` + `id DESC` tie-breaker.
- Keyset cursor `{ created_at, id }`, `.limit(PAGE + 1)` lookahead.
  `getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined`
  (returning `undefined` is what flips `hasNextPage` to false).
- `mergeFeedPages()`-style dedupe by id on flatten; deleted rows are safe
  (they simply never appear — no tombstones).
- List: `pages.flatMap` → dedupe by id, `onEndReached` guarded by
  `hasNextPage && !isFetchingNextPage && !isFetching && !isError`,
  `RefreshControl refreshing={isRefetching || ...}` bound to query state,
  footer = loading skeleton / inline retry (`isFetchNextPageError`) /
  end marker (`!hasNextPage`), empty state, full-screen retry on initial error.
- Invalidate behavior preserved: `["feed"]` query key unchanged, so
  `usePostLike` / `usePostComment` `setQueriesData` + `invalidateQueries`
  keep working after create/delete/like/comment.
- Server index: `idx_posts_created_id_desc (created_at DESC, id DESC)`
  (migration `036_feed_cursor_index`).

## Per-list plan

### Explore — `useClubs` / `useEvents` + `app/(tabs)/explore/index.tsx`
- Current: offset `range(from, to)`, `PAGE = 20`, clubs uses `select("*")`.
- Target: keep offset (sorts vary: name / members / recent / nearby) but:
  1. `PAGE = 25`, explicit columns for clubs (mirror feed's allow-list).
  2. Append `id` tie-break to every `order()` branch
     (e.g. `.order("created_at", ...).order("id", ...)`).
  3. Same footer/guard/refresh recipe as feed; dedupe by id on flatten.
- Nearby RPCs already take `p_limit / p_offset` — bump to 25, no change needed.

### Comments — `CommentPanel` / `[postId]/comments`
- Current: unbounded `useQuery` + `select("*")` on `post_comments`.
- Target: `useInfiniteQuery`, page 20, explicit columns,
  `order(created_at DESC, id DESC)`, keyset cursor, profile batch per page
  (existing `.in(id, ids)` join stays, bounded to page ids).

### Members — `useClubMembers` / `useClubAllMembers` + `members.tsx`
- Current: `limit(20)` one-shot / unbounded `select(user_id, role)`.
- Target: `useInfiniteQuery` on `club_members` ordered by stable key
  (`created_at`/`id` or `user_id`), page 25, profile batch per page.
  Keep admins-first sort client-side only for small clubs; for large clubs
  move role ordering server-side.

### Notifications — `useNotifications`
- Current: `useQuery` + `range(offset, offset+limit-1)`, default 50, `select("*")`.
- Target: `useInfiniteQuery`, page 25, explicit columns,
  `order(created_at DESC, id DESC)` keyset; push `status` filter server-side
  where possible instead of client filtering.

### Messages — conversation detail (`[conversationId]`, `useMessageActions`)
- Target: same recipe — `order(created_at ASC/DESC + id)`, page 25–30,
  `useInfiniteQuery`, explicit columns, realtime prepend with id dedupe.

## Validation checklist per list
1. Focused hook test (mocked supabase): bounded page, cursor progression,
   end-of-list (`hasNextPage === false`), dedupe, refresh reset.
2. `npx jest <test>` green + `npx tsc --noEmit` clean for touched files.
3. Manual: scroll to end (footer → end marker), pull-to-refresh, create /
   delete / like / comment then verify list refreshes without duplicates.
