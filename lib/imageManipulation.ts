// ---------------------------------------------------------------------------
// PULSE — Cross-platform image dimension inspection + resize.
//
// Thin wrapper around expo-image-manipulator. All functions are best-effort:
// if the native module is unavailable (e.g. unit tests, or a platform
// without a manipulator) they degrade gracefully instead of throwing, so the
// upload pipeline can still proceed with what it has.
// ---------------------------------------------------------------------------

import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { SaveOptions } from "expo-image-manipulator";

export type ImageDimensions = {
  width: number;
  height: number;
};

/** JPEG/WebP compression quality (0 = smallest, 1 = lossless). */
export const DEFAULT_IMAGE_QUALITY = 0.82;

/** The format we re-encode normalised images to when resizing. */
export const DEFAULT_IMAGE_FORMAT: SaveOptions["format"] = SaveFormat.JPEG;

/** Sniff the dimensions of an image without altering its content. */
export async function getImageDimensions(uri: string): Promise<ImageDimensions | null> {
  try {
    const result = await manipulateAsync(uri, [], { base64: false });
    if (result.width > 0 && result.height > 0) {
      return { width: result.width, height: result.height };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resize an image so its longest edge is at most `maxEdge` pixels, preserving
 * aspect ratio. If the image is already within bounds the original URI is
 * returned unchanged (no re-encode, no quality loss).
 *
 * `knownDims` lets callers pass already-known dimensions (e.g. from the picker
 * asset) so the helper only calls the native manipulator once.
 */
export async function resizeToMaxEdge(
  uri: string,
  maxEdge: number,
  knownDims?: ImageDimensions | null,
  opts: { quality?: number; format?: SaveOptions["format"] } = {},
): Promise<{ uri: string; width: number; height: number; wasResized: boolean }> {
  const quality = opts.quality ?? DEFAULT_IMAGE_QUALITY;
  const format = opts.format ?? DEFAULT_IMAGE_FORMAT;

  const dims = knownDims ?? (await getImageDimensions(uri));
  const longest = Math.max(dims?.width ?? 0, dims?.height ?? 0);

  if (!dims || longest <= maxEdge) {
    return { uri, width: dims?.width ?? 0, height: dims?.height ?? 0, wasResized: false };
  }

  const ratio = maxEdge / longest;
  // Resize along the longest axis only; expo-image-manipulator preserves the
  // aspect ratio when only one axis is supplied.
  const resize =
    dims.width >= dims.height
      ? { width: Math.round(dims.width * ratio) }
      : { height: Math.round(dims.height * ratio) };

  try {
    const result = await manipulateAsync(uri, [{ resize }], {
      compress: quality,
      format,
      base64: false,
    });
    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      wasResized: true,
    };
  } catch {
    // Fall back to the original rather than blocking the upload entirely.
    return { uri, width: dims.width, height: dims.height, wasResized: false };
  }
}

export { SaveFormat };
