# Implementation Plan — V1 Gaps

[Overview]
This plan closes the remaining gaps between the original V1 specification (`V1_prompt.md`) and the current Pulse codebase, while preserving all V2 (profil public, création clubs/événements publics/privés, groupes) and V3 (recherche avancée, géolocalisation, vidéos, invitations, seed-external) features that have already been added. Every item listed here corresponds to a feature that V1 explicitly required but that is currently missing or implemented only as a placeholder. The V1 spec's design system, schemas, and component primitives are reused; nothing existing is rewritten.

Scope decisions:
- **Strict V1 gaps only** — no new ideas, no UX beyond what V1 required.
- **Migrate token storage to `expo-secure-store`** because V1 explicitly required it (`lib/supabase.ts` currently uses `AsyncStorage`). This is the only architectural change. It will sign out all existing users once, exactly as the spec demands.
- All migrations are additive: no existing column is dropped, no existing policy is replaced.

The 21 gaps are grouped into 10 work units to minimise merge conflicts and keep the order logical (DB constants → auth → feed → clubs → events → conversations → create → profile → polish).

[Types]
No new database types are introduced. Three TypeScript types are added to `types/index.ts` to support the new V1 surfaces:

```ts
// types/index.ts additions
export type ConversationListItemDownload = {
  type: "message";
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  is_deleted: boolean;
}[];

// Helper for tag input
export type TagSuggestion = { tag: string; count: number };

// Edit-profile patch used by useProfile mutation
export type ProfileUpdate = {
  full_name?: string;
  bio?: string | null;
  city?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  avatar_url?: string | null;
  language?: string;
};
```

The `Database["public"]["Tables"]` mapping is reused everywhere; no schema change. The `Club`, `EventRow`, `Message`, and `Profile` row types already include every field V1 needs (`founded_date`, `league`, `age_min`, `age_max`, `required_level`, `contact_email`, `source_url`, `places_total`, `places_left`, `club_id`, `is_deleted`, `language`). No new columns are required.

[Files]

### New files
- `lib/storage.ts` — small wrapper around `expo-secure-store` that exposes the same `getItem/setItem/removeItem` signature `supabase-js` expects for `auth.storage`. This is the only new module needed.
- `components/clubs/ClubMembersStrip.tsx` — horizontal `FlatList` of avatar + name, non-clickable, V1 spec.
- `components/feed/TagInput.tsx` — text input with `#` prefix and live suggestions from existing `posts.tags` (deduped, top 10 by frequency).
- `components/profile/ProfileClubsSection.tsx` — list of `ClubCard` (compact) for clubs the user is a member of.
- `components/profile/ProfileEventsSection.tsx` — list of `EventCard` (compact) for upcoming events the user is registered to.
- `components/profile/EditProfileSheet.tsx` — extracted from the inline modal in `profile/index.tsx` and extended with: photo, height, weight, language, objectives, sports.
- `components/profile/DeleteAccountSheet.tsx` — password input → `supabase.auth.signInWithPassword` (re-auth) → `supabase.auth.deleteUser()` → soft delete `profiles.deleted_at = now()`.
- `components/profile/SecuritySection.tsx` — `collapsible` showing email + password with show/hide eye toggles (display only; no re-auth flow in V1).
- `components/feed/TagFilterBanner.tsx` — small bar above the `FlashList` showing the active tag from `useFeedStore.activeTag` with a clear button.
- `utils/countries.ts` — full ISO 3166-1 alpha-2 list (249 entries) with French labels. (Replaces the current 57-entry list inside `lib/constants.ts`.)

### Modified files
- `lib/supabase.ts` — switch `auth.storage` to the new `lib/storage.ts` wrapper.
- `lib/constants.ts` — `COUNTRIES` is re-exported from `utils/countries.ts`; nothing else changes. Also fix the two invalid Ionicons in `SPORTS` (`hand-left-outline` → `hand-right-outline`, `water-outline` → `swim-outline`).
- `hooks/useFeed.ts` — accept an optional `tag: string | null` filter; merge it with the cursor query.
- `hooks/useClubs.ts` — no change (query already supports all V1 fields).
- `hooks/useEvents.ts` — no change.
- `hooks/useProfile.ts` — accept an optional `patch: ProfileUpdate` mutation helper. (Used by the new `EditProfileSheet`.)
- `stores/feedStore.ts` — no change (already stores `activeTag`).
- `app/auth/signup/step5.tsx` — when `data.session == null` (email confirmation required), the profile + sports + objectives inserts still run **after** the user confirms and signs in. We move the insert into a single idempotent SQL function `complete_signup(profile_row, sports[], objectives[])` invoked by a trigger `on auth.users insert`, OR (chosen) we keep the client-side insert and add a small `useEffect` in `useAuth.ts` that, when a user becomes authenticated and has no profile row, replays the queued signup data from `AsyncStorage` key `pulse:pending-signup`. This is the smallest, most reliable change.
- `app/(tabs)/feed/index.tsx` — read `useFeedStore.activeTag` and pass it to `useFeed()`; render `<TagFilterBanner />` when set; clicking a tag in `PostCard` now triggers a real filter instead of a toast (the toast remains for the first 1 s to give feedback).
- `components/feed/PostCard.tsx` — keep the `onAuthorPress` navigation (V2 added the public profile page) but also keep the V1 "toast 'soon'" behavior for the *author click* if the user is on a profile that doesn't have a public profile — handled by `usePublicProfile`-style guard. (Strict reading: the V1 spec said toast; we honor that when the target profile is not public, and route when it is.)
- `app/(tabs)/clubs/[clubId].tsx` — add the five missing fields, hero gallery, source link, members strip.
- `app/(tabs)/events/[eventId].tsx` — add `places_total`/`places_left` and the linked club block.
- `app/(tabs)/conversations/[conversationId].tsx` — date-grouped section headers, `KeyboardAvoidingView` already correct, real `Supprimer`/`Masquer` actions.
- `app/(tabs)/conversations/index.tsx` — no change (V1 spec didn't ask for grouping here).
- `components/conversations/ConversationItem.tsx` — replace the `Share.share` text with a real `.jsonl` file write (`expo-file-system`) and `expo-sharing`.
- `components/conversations/MessageBubble.tsx` — wire long-press actions: own message → `is_deleted = true`; other → insert `message_hidden`.
- `app/(tabs)/create/index.tsx` — add 500 ms debounce to the username search; add title/description counters + `maxLength`; replace the tags `TextInput` with `TagInput`.
- `app/(tabs)/profile/index.tsx` — add `<ProfileClubsSection>`, `<ProfileEventsSection>`, `<SecuritySection>`, replace inline edit modal with `<EditProfileSheet>`, replace "Supprimer mon compte" button with `<DeleteAccountSheet>`.
- `app/(tabs)/feed/_layout.tsx` — no change.
- `app/_layout.tsx` — no change (the new `lib/storage.ts` is wired from `lib/supabase.ts`).

### Configuration files
- No change to `app.json`, `babel.config.js`, `tailwind.config.js`, `tsconfig.json`.
- `package.json` already has `expo-secure-store` and `expo-file-system` declared.

[Functions]
- **`supabase.auth.signOut`** is unchanged; on next launch the user signs in again, which is expected after the secure-store migration.
- **`complete_signup` client function** (new, `utils/signup.ts`): replays queued signup data from AsyncStorage into `profiles` + `user_sports` + `user_objectives`. Idempotent via `ON CONFLICT (id) DO NOTHING`.
- **`exportConversationToJsonl`** (new, `utils/conversationExport.ts`): reads the full `messages` history for a conversation, builds JSON-lines content, writes to `FileSystem.cacheDirectory + 'pulse-conversation-${id}.jsonl'`, returns the `uri` for `expo-sharing`.
- **`fetchTagSuggestions`** (new, `hooks/useTagSuggestions.ts`): selects the top 30 distinct `posts.tags` with their counts; returns the first 10 that fuzzy-match the current input.
- **`useProfile`** (modified) — adds `useUpdateProfile` mutation that calls `.update(patch).eq('id', userId)` and invalidates `['profile', userId]`.
- **`useFeed`** (modified) — adds `tag?: string | null` parameter; if present, includes `.contains('tags', [tag])` in the PostgREST query. Invalidation in `PostCard` still calls `setActiveTag` (no API change).
- **`useClubMembers`** (new, `hooks/useClubMembers.ts`): fetches the first 20 `club_members` of a club joined with `profiles(id, full_name, username, avatar_url)`. V1 spec: non-clickable.
- **`useMyClubMemberships`** (new, `hooks/useMyClubMemberships.ts`): for the profile, `select * from club_members where user_id = ?` joined with `clubs(*)`.
- **`useMyUpcomingEvents`** (new, `hooks/useMyUpcomingEvents.ts`): `event_participants` joined with `events(*)` where `start_date > now()`.
- **`useDeleteAccount`** (new, `hooks/useDeleteAccount.ts`): password re-auth → `supabase.auth.signInWithPassword` → `supabase.auth.updateUser({ password })` is NOT needed; instead, directly call `supabase.auth.deleteUser()` then `from('profiles').update({ deleted_at: now() }).eq('id', userId)`.

[Classes]
No new classes. The codebase is functional. All "classes" are React components:
- **`ClubMembersStrip`** (new) — pure presentational; no state.
- **`TagInput`** (new) — controlled component; debounces suggestions fetch.
- **`ProfileClubsSection`** / **`ProfileEventsSection`** (new) — `useQuery` wrappers.
- **`EditProfileSheet`** (new) — full edit form with the seven V1 fields (name, bio, city, height, weight, language, photo, objectives, sports).
- **`DeleteAccountSheet`** (new) — single-form modal.
- **`SecuritySection`** (new) — show/hide email + password (read-only toggles; V1 spec did not require re-auth here).
- **`TagFilterBanner`** (new) — single-line, dismissable.

[Dependencies]
No new package needed. All required packages are already in `package.json`:
- `expo-secure-store` (used by the new `lib/storage.ts`)
- `expo-file-system` (used by `exportConversationToJsonl`)
- `expo-sharing` (already used elsewhere)
- `dayjs` (already used)

`@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `@expo/vector-icons` are already present.

[Testing]
There is no test suite in V1; we add manual smoke checks per work unit. Each work unit documents 3-5 manual checks in the implementation task. The new components are typed with strict TypeScript (`tsc --noEmit` must pass). The existing RLS policies already permit every query and mutation we add (verified below):
- `club_members_select` → `USING (true)` ✓
- `posts_select` → `USING (true)` (tag filter uses only public posts) ✓
- `messages_update_own` → owner can `is_deleted` ✓
- `message_hidden_own` → owner can insert ✓
- `profiles_update_own` → `id = auth.uid()` ✓
- `events_select` → public ✓
- `event_participants_select` → public ✓

Edge cases covered in each work unit: empty state, network error (`ErrorState`), skeleton loading on first load.

[Implementation Order]
Steps are sequenced to keep the working tree compilable at every step and to avoid two open files editing the same screen.

1. **Storage + countries constants** — `lib/storage.ts`, `utils/countries.ts`, `lib/constants.ts` re-export, `lib/supabase.ts` switch. Verify: sign-out + sign-in still works.
2. **Signup email-confirmation fix** — `utils/signup.ts`, hook in `useAuth.ts`. Verify: sign up with email confirmation ON, confirm, sign in → profile row appears.
3. **Ionicons audit** — fix the two invalid glyphs in `lib/constants.ts`. Verify: no missing-glyph warnings.
4. **Tag filter in feed** — `hooks/useFeed.ts` tag param, `useTagSuggestions`, `TagInput`, `TagFilterBanner`, `app/(tabs)/feed/index.tsx`, `components/feed/PostCard.tsx`. Verify: clicking a tag filters the feed; clear button restores.
5. **Club detail enrichment** — `hooks/useClubMembers.ts`, `components/clubs/ClubMembersStrip.tsx`, rewrite `app/(tabs)/clubs/[clubId].tsx`. Verify: hero gallery scrolls, source link opens in browser, members strip renders.
6. **Event detail enrichment** — `app/(tabs)/events/[eventId].tsx`. Verify: places and linked club visible.
7. **Conversation features** — date grouping in `app/(tabs)/conversations/[conversationId].tsx`, real `Supprimer`/`Masquer` in `MessageBubble`, real `.jsonl` export in `ConversationItem` via `utils/conversationExport.ts`. Verify: long-press deletes or hides; download produces a `.jsonl` file.
8. **Create screen polish** — debounce user search, title/description counters, `TagInput`. Verify: typing pauses 500 ms before searching; counters update.
9. **Profile enrichment** — `hooks/useMyClubMemberships.ts`, `hooks/useMyUpcomingEvents.ts`, `components/profile/ProfileClubsSection.tsx`, `components/profile/ProfileEventsSection.tsx`, `components/profile/SecuritySection.tsx`, `components/profile/EditProfileSheet.tsx`, `hooks/useDeleteAccount.ts`, `components/profile/DeleteAccountSheet.tsx`, `app/(tabs)/profile/index.tsx`. Verify: edit modal updates height/weight/photo/objectives/sports/language; delete account signs out and soft-deletes.
10. **Final sweep** — `tsc --noEmit`, manual walkthrough on a clean database with the seed data.

Each step ends with a single, self-contained commit message and a `tsc --noEmit` check.
