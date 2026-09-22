// ---------------------------------------------------------------------------
// PULSE — Event media helpers
//
// Single place that knows where event images live (Supabase Storage bucket
// "events"), which media role each one uses, and how many optional photos an
// event carries (the cover image is a separate, single field).
//
// Shared by both event creation forms and the event edit sheet so add / change
// / remove behave identically everywhere.
// ---------------------------------------------------------------------------

import { removeFromStorageByUrl, uploadImageToStorage } from "@/lib/imageUpload";

/** Supabase Storage bucket holding every event image. */
export const EVENTS_BUCKET = "events";

/** Maximum number of optional event photos (cover image excluded). */
export const MAX_EVENT_PHOTOS = 5;

/** Upload the optional cover image (single slot: add / change / remove). */
export async function uploadEventCover(userId: string, uri: string): Promise<string> {
  return uploadImageToStorage({
    bucket: EVENTS_BUCKET,
    path: `${userId}/cover-${Date.now()}.jpg`,
    uri,
    upsert: true,
    role: "cover",
  });
}

/** Upload one optional event photo (0–MAX_EVENT_PHOTOS per event). */
export async function uploadEventPhoto(userId: string, uri: string, index: number): Promise<string> {
  return uploadImageToStorage({
    bucket: EVENTS_BUCKET,
    path: `${userId}/photo-${Date.now()}-${index}.jpg`,
    uri,
    upsert: true,
    role: "gallery",
  });
}

/**
 * Best-effort deletion of an already-uploaded event image. Used when a cover or
 * a photo is replaced or removed so storage never keeps orphaned files.
 * Never throws: cleanup must not block a save.
 */
export async function deleteEventMedia(publicUrl?: string | null): Promise<void> {
  if (!publicUrl || !publicUrl.includes(`/object/public/${EVENTS_BUCKET}/`)) return;
  try {
    await removeFromStorageByUrl(publicUrl, EVENTS_BUCKET);
  } catch {
    // Ignore: an unreachable/stale object must never fail the user's action.
  }
}
