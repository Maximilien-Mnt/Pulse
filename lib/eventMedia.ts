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
import type { PickedImage } from "@/lib/mediaPipeline";

/** Supabase Storage bucket holding every event image. */
export const EVENTS_BUCKET = "events";

/** Maximum number of optional event photos (cover image excluded). */
export const MAX_EVENT_PHOTOS = 5;

/**
 * Upload the optional cover image (single slot: add / change / remove).
 *
 * Takes the *whole* picked asset, not just its uri: the pipeline needs the
 * picker's `mimeType` to validate web `blob:` URLs (which have no file
 * extension) and its dimensions/byte size to avoid re-probing them.
 */
export async function uploadEventCover(userId: string, image: PickedImage): Promise<string> {
  return uploadImageToStorage({
    bucket: EVENTS_BUCKET,
    path: `${userId}/cover-${Date.now()}.jpg`,
    uri: image.uri,
    upsert: true,
    role: "cover",
    pickerMeta: {
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      fileSize: image.fileSize,
    },
  });
}

/** Upload one optional event photo (0–MAX_EVENT_PHOTOS per event). */
export async function uploadEventPhoto(
  userId: string,
  image: PickedImage,
  index: number,
): Promise<string> {
  return uploadImageToStorage({
    bucket: EVENTS_BUCKET,
    path: `${userId}/photo-${Date.now()}-${index}.jpg`,
    uri: image.uri,
    upsert: true,
    role: "gallery",
    pickerMeta: {
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      fileSize: image.fileSize,
    },
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
