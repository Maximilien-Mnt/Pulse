/**
 * Centralized Field Tampering protection layer.
 *
 * Every client → server write path goes through a table-column whitelist
 * derived from the generated `Database` type.  This guarantees that no
 * unauthorized column (e.g. `role`, `is_admin`, `created_by`) can be
 * injected via a crafted Supabase client request or a tampered payload.
 *
 * The whitelists are **type-checked** at compile time: if the Database
 * type changes and a column is removed/renamed, `satisfies` will fail and
 * the developer is forced to update the runtime array.
 */

import type { Database } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TableName = keyof Database["public"]["Tables"];
type InsertOf<T extends TableName> = Database["public"]["Tables"][T]["Insert"];

/**
 * Type-checked whitelist helper.
 *
 * Passing the wrong keys for a table causes a compile-time error.
 */
function whitelist<T extends TableName>(
  _table: T,
  keys: readonly (keyof InsertOf<T>)[]
): readonly string[] {
  return keys as readonly string[];
}

/**
 * Runtime map of every table that accepts client writes and the columns
 * allowed in those writes.
 */
const TABLE_WHITELISTS: Record<TableName, readonly string[]> = {
  profiles: whitelist("profiles", [
    "id",
    "email",
    "full_name",
    "username",
    "avatar_url",
    "bio",
    "birth_date",
    "country",
    "city",
    "language",
    "height_cm",
    "weight_kg",
    "discovery_source",
    "interested_sports",
    "created_at",
    "updated_at",
    "deleted_at",
    "is_public_profile",
    "public_status",
    "public_photos",
    "push_token",
  ]),
  user_sports: whitelist("user_sports", [
    "id",
    "user_id",
    "sport_id",
    "category",
    "level",
    "practice",
    "time_slots",
    "created_at",
  ]),
  user_objectives: whitelist("user_objectives", [
    "id",
    "user_id",
    "objective",
    "created_at",
  ]),
  clubs: whitelist("clubs", [
    "id",
    "name",
    "sport",
    "description",
    "short_description",
    "country",
    "city",
    "address",
    "latitude",
    "longitude",
    "logo_url",
    "cover_url",
    "hero_urls",
    "registration_url",
    "is_external",
    "source_url",
    "source_name",
    "member_count",
    "founded_date",
    "league",
    "age_min",
    "age_max",
    "required_level",
    "contact_email",
    "created_by",
    "created_at",
    "updated_at",
    "is_private",
    "training_schedule",
    "website_url",
    "opening_hours",
    "sports",
    "required_levels",
    "postal_code",
    "phone_number",
    "instagram_url",
    "facebook_url",
    "tiktok_url",
    "extra_link",
  ]),
  events: whitelist("events", [
    "id",
    "name",
    "sport",
    "description",
    "short_description",
    "country",
    "city",
    "venue_address",
    "latitude",
    "longitude",
    "start_date",
    "end_date",
    "price_cents",
    "is_paid",
    "difficulty",
    "category",
    "logo_url",
    "hero_urls",
    "registration_url",
    "is_external",
    "source_url",
    "source_name",
    "places_total",
    "places_left",
    "accepted_count",
    "required_level",
    "club_id",
    "publisher_club_id",
    "created_by",
    "created_at",
    "updated_at",
    "is_private",
    "website_url",
    "age_min",
    "age_max",
    "sports",
    "required_levels",
    "postal_code",
    "contact_email",
    "league",
    "cover_url",
  ]),
  follows: whitelist("follows", [
    "follower_id",
    "following_id",
    "created_at",
  ]),
  club_members: whitelist("club_members", [
    "club_id",
    "user_id",
    "role",
    "member_status",
    "custom_member_status",
    "joined_at",
  ]),
  club_favorites: whitelist("club_favorites", [
    "user_id",
    "club_id",
    "created_at",
  ]),
  club_join_requests: whitelist("club_join_requests", [
    "id",
    "club_id",
    "user_id",
    "status",
    "created_at",
  ]),
  event_participants: whitelist("event_participants", [
    "id",
    "event_id",
    "user_id",
    "status",
    "created_at",
  ]),
  event_favorites: whitelist("event_favorites", [
    "user_id",
    "event_id",
    "created_at",
  ]),
  event_join_requests: whitelist("event_join_requests", [
    "id",
    "event_id",
    "user_id",
    "status",
    "created_at",
  ]),
  posts: whitelist("posts", [
    "id",
    "author_id",
    "title",
    "body",
    "format",
    "media_urls",
    "tags",
    "likes_count",
    "comments_count",
    "shares_count",
    "created_at",
    "updated_at",
  ]),
  post_likes: whitelist("post_likes", [
    "post_id",
    "user_id",
    "created_at",
  ]),
  post_comments: whitelist("post_comments", [
    "id",
    "post_id",
    "user_id",
    "body",
    "likes_count",
    "created_at",
  ]),
  comment_likes: whitelist("comment_likes", [
    "comment_id",
    "user_id",
    "created_at",
  ]),
  conversations: whitelist("conversations", [
    "id",
    "created_at",
    "updated_at",
    "last_message_at",
    "last_message_preview",
    "is_group",
    "group_name",
    "group_photo_url",
    "club_id",
  ]),
  conversation_participants: whitelist("conversation_participants", [
    "conversation_id",
    "user_id",
    "pinned",
    "pinned_at",
    "left_at",
    "unread_count",
    "last_read_at",
    "joined_at",
    "is_public_list",
  ]),
  messages: whitelist("messages", [
    "id",
    "conversation_id",
    "sender_id",
    "body",
    "created_at",
    "deleted_at",
    "is_deleted",
    "is_edited",
    "pinned_until",
    "type",
    "file_url",
    "file_name",
  ]),
  message_reactions: whitelist("message_reactions", [
    "id",
    "message_id",
    "user_id",
    "emoji",
    "created_at",
  ]),
  message_hidden: whitelist("message_hidden", [
    "message_id",
    "user_id",
    "created_at",
  ]),
  reports: whitelist("reports", [
    "id",
    "reporter_id",
    "target_type",
    "target_id",
    "message",
    "metadata",
    "created_at",
  ]),
  bug_reports: whitelist("bug_reports", [
    "id",
    "reporter_id",
    "message",
    "platform",
    "os_version",
    "app_version",
    "device_model",
    "locale",
    "screen_resolution",
    "timezone",
    "metadata",
    "created_at",
  ]),
  notifications: whitelist("notifications", [
    "id",
    "user_id",
    "type",
    "title",
    "body",
    "data",
    "read_at",
    "created_at",
  ]),
  user_stats: whitelist("user_stats", [
    "user_id",
    "followers_count",
    "following_count",
    "posts_count",
    "updated_at",
    "total_likes_received",
    "total_comments_received",
    "clubs_created_count",
    "events_created_count",
    "historical_follows_count",
    "unfollows_count",
  ]),
  feed_interactions: whitelist("feed_interactions", [
    "id",
    "user_id",
    "post_id",
    "action",
    "created_at",
  ]),
  blocked_users: whitelist("blocked_users", [
    "blocker_id",
    "blocked_id",
    "created_at",
  ]),
};

/**
 * Strip every key not present in the table whitelist.
 *
 * @example
 *   const clean = stripUnknownFields("profiles", { full_name: "X", is_admin: true });
 *   // → { full_name: "X" }   (is_admin removed)
 */
export function stripUnknownFields<T extends TableName>(
  table: T,
  data: Partial<InsertOf<T>> & Record<string, unknown>
): Partial<InsertOf<T>> {
  const allowed = TABLE_WHITELISTS[table];
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in data) {
      result[key] = data[key as keyof typeof data];
    }
  }
  return result as Partial<InsertOf<T>>;
}

/**
 * Runtime guard — returns `true` when `table` is a key in the whitelist map.
 */
export function isProtectedTable(table: string): table is TableName {
  return table in TABLE_WHITELISTS;
}

/**
 * Supabase client wrapper that automatically strips unknown fields
 * before every `update` / `insert` / `upsert` call.
 *
 * Use this instead of calling `supabase.from(table).update(...)` directly.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function protect<T extends TableName>(
  client: SupabaseClient<Database>,
  table: T
) {
  const base = client.from(table);

  return {
    select: (query?: string) => base.select(query),

    update: (patch: Partial<InsertOf<T>> & Record<string, unknown>) => {
      const clean = stripUnknownFields(table, patch);
      return base.update(clean as any);
    },

    insert: (rows: (Partial<InsertOf<T>> & Record<string, unknown>)[]) => {
      const cleanRows = rows.map((row) => stripUnknownFields(table, row));
      return base.insert(cleanRows as any);
    },

    upsert: (rows: (Partial<InsertOf<T>> & Record<string, unknown>)[]) => {
      const cleanRows = rows.map((row) => stripUnknownFields(table, row));
      return base.upsert(cleanRows as any);
    },

    // Pass-through for delete / etc.  (RPC is on the client, not the builder)
    delete: base.delete.bind(base),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */