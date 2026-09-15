// ---------------------------------------------------------------------------
// PULSE — Notification presentation labels
//
// Server `notifications.type` values are stable snake_case ids written by the
// client hooks and the database triggers. The stored `title` is written in the
// *sender's* language at insert time, so the Notifications screen derives its
// label from the type instead — that way the *viewer* always reads it in their
// own language.
//
// Unknown / future server values must never break or leak into the UI: an
// unmapped type falls back to the stored title, then to the generic
// "Notification" label. Raw snake_case ids are never rendered.
// ---------------------------------------------------------------------------

import { translate } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";

/** Every `notifications.type` value the app and the database can emit. */
export const NOTIFICATION_TYPE_KEYS: Record<string, TranslationKey> = {
  // Join requests + their answers (004 trigger, useNotifications)
  club_join_request: "notifications.type.clubJoinRequest",
  event_join_request: "notifications.type.eventJoinRequest",
  club_join_request_response_accept: "notifications.type.clubJoinRequestResponseAccept",
  event_join_request_response_accept: "notifications.type.eventJoinRequestResponseAccept",
  club_join_request_response_refuse: "notifications.type.clubJoinRequestResponseRefuse",
  event_join_request_response_refuse: "notifications.type.eventJoinRequestResponseRefuse",
  // Deletions (023 / 045)
  conversation_deleted: "notifications.type.conversationDeleted",
  club_deleted: "notifications.type.clubDeleted",
  event_deleted: "notifications.type.eventDeleted",
  // Membership changes
  club_member_left: "notifications.clubMemberLeft.title",
  club_member_removed: "notifications.clubMemberRemoved.title",
  event_participant_removed: "notifications.eventParticipantRemoved.title",
  // Updates
  club_updated: "updateClub.modified",
  event_updated: "updateEvent.modified",
  event_cancelled: "events.canceled",
  // Invitations / creations
  club_invitation: "clubs.invite",
  event_invitation: "events.create.invitation",
  event_notification: "create.event.newInClub",
  followed_user_new_club: "create.newClub",
  followed_user_new_event: "create.event.new",
  // Social
  new_follower: "follow.newFollower",
};

/** Translation key for a server type, or `null` when the value is unknown. */
export function getNotificationTypeKey(type: unknown): TranslationKey | null {
  if (typeof type !== "string") return null;
  return NOTIFICATION_TYPE_KEYS[type] ?? null;
}

/**
 * Safe label for a server type — always a localized string, never a raw id.
 * Useful when no stored title is available (badges, logs, a11y).
 */
export function getNotificationTypeLabel(type: unknown): string {
  const key = getNotificationTypeKey(type);
  return translate(key ?? "notifications.type.default");
}

type StoredTextSource = { type?: unknown; title?: unknown };

/**
 * Title shown for a notification.
 *
 * Known types always render their localized label (viewer's language). An
 * unknown type falls back to the stored title, then to the generic label, so a
 * new server value degrades gracefully instead of showing a snake_case id.
 */
export function resolveNotificationTitle(
  notification: StoredTextSource,
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string
): string {
  const key = getNotificationTypeKey(notification.type);
  if (key) return t(key);
  return getNotificationStoredText(notification.title) || t("notifications.type.default");
}

/**
 * Stored, user-authored or server-generated free text (message, requester
 * name, body…). Returned verbatim — it is content, never chrome, so it must
 * not go through the translation system.
 */
export function getNotificationStoredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}