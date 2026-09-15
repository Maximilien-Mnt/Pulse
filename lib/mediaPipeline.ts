// ---------------------------------------------------------------------------
// PULSE — Shared, typed media pipeline for image uploads.
//
// Single source of truth for everything between "user picks an image" and
// "bytes hit Supabase Storage":
//   1. validate file type + maximum bytes
//   2. inspect dimensions + resize to a documented max edge (per role)
//   3. re-encode with a consistent JPEG/WebP quality policy
//   4. produce stable storage paths + replace/cleanup semantics
//
// Video flows are intentionally OUT of scope — never route a video through
// here. The picker is still used directly for video; this module only deals
// with still images.
// ---------------------------------------------------------------------------

import { Platform } from "react-native";
// @ts-ignore - expo-file-system is not available on web
import * as FileSystem from "expo-file-system/legacy";
import { getImageDimensions, resizeToMaxEdge, SaveFormat } from "./imageManipulation";

// ---------------------------------------------------------------------------
// Roles — max-edge rationale (based on actual render sites in this codebase):
//   avatar      — 40–80 px circular (Avatar.tsx)              → max edge 512
//   cover       — full-width hero, contentMax 760–920 px
//                 (ClubHeroBar coverH 180–280, cards 16:9)    → max edge 1920
//   gallery     — post image, screenWidth-32, height 200–300 → max edge 1920
//   thumbnail   — grid/list cards, ~150–250 px wide           → max edge 1024
//   publicPhoto — public profile photos, 80 px previews       → max edge 1024
// ---------------------------------------------------------------------------

export type MediaRole = "avatar" | "cover" | "gallery" | "thumbnail" | "publicPhoto";

export type MediaRoleConfig = {
  maxEdge: number;
  maxBytes: number;
  quality: number;
  format: "jpeg" | "webp";
  contentType: string;
};

export const MEDIA_ROLE_CONFIG: Record<MediaRole, MediaRoleConfig> = {
  avatar: { maxEdge: 512, maxBytes: 4 * 1024 * 1024, quality: 0.82, format: "jpeg", contentType: "image/jpeg" },
  cover: { maxEdge: 1920, maxBytes: 8 * 1024 * 1024, quality: 0.82, format: "jpeg", contentType: "image/jpeg" },
  gallery: { maxEdge: 1920, maxBytes: 8 * 1024 * 1024, quality: 0.82, format: "jpeg", contentType: "image/jpeg" },
  thumbnail: { maxEdge: 1024, maxBytes: 5 * 1024 * 1024, quality: 0.82, format: "jpeg", contentType: "image/jpeg" },
  publicPhoto: { maxEdge: 1024, maxBytes: 5 * 1024 * 1024, quality: 0.82, format: "jpeg", contentType: "image/jpeg" },
};

export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif",
]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", heic: "image/heic", heif: "image/heif",
};

// ---------------------------------------------------------------------------
// Typed errors — each carries a translation key for localized call-site toasts.
// ---------------------------------------------------------------------------

export type MediaErrorCode = "invalidType" | "oversized" | "resizeFailed";

export class MediaNormalizationError extends Error {
  constructor(
    public readonly code: MediaErrorCode,
    public readonly translationKey: string,
    public readonly translationParams?: Record<string, string | number>,
  ) {
    super(code);
    this.name = "MediaNormalizationError";
  }

  /** Alias for `translationKey` — convenient for call-site toasts. */
  get key(): string {
    return this.translationKey;
  }
}

/**
 * Sentinel thrown when the picker was cancelled or the operation aborted by
 * the user. Callers must treat this as a silent no-op (no toast), never as a
 * failure. Use `error instanceof MediaCancelledError` to discriminate.
 */
export class MediaCancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "MediaCancelledError";
  }
}

// ---------------------------------------------------------------------------
// MIME detection
// ---------------------------------------------------------------------------

function mimeFromExtension(uri: string): string | null {
  const clean = uri.split("?")[0] ?? uri;
  const dot = clean.lastIndexOf(".");
  if (dot < 0) return null;
  return EXT_TO_MIME[clean.slice(dot + 1).toLowerCase()] ?? null;
}

export function resolveMimeType(uri: string, pickerMimeType?: string | null): string | null {
  if (pickerMimeType && ALLOWED_MIME_TYPES.has(pickerMimeType.toLowerCase())) {
    return pickerMimeType.toLowerCase();
  }
  return mimeFromExtension(uri);
}

export function isAllowedMimeType(uri: string, pickerMimeType?: string | null): boolean {
  return resolveMimeType(uri, pickerMimeType) !== null;
}

// ---------------------------------------------------------------------------
// File size probing (pre-resize). Best-effort: returns null if unknown.
// ---------------------------------------------------------------------------

async function probeFileSize(uri: string): Promise<number | null> {
  if (Platform.OS === "web") {
    try {
      if (uri.startsWith("blob:") || uri.startsWith("data:")) {
        const res = await fetch(uri);
        const blob = await res.blob();
        return blob.size;
      }
    } catch {
      return null;
    }
    return null;
  }
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof (info as { size?: unknown }).size === "number") {
      return (info as { size: number }).size;
    }
  } catch {
    // fall through
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public input + output shapes
// ---------------------------------------------------------------------------

export type PickedImage = {
  uri: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  canceled?: boolean;
};

export type PickResultCanceled = {
  canceled: true;
};

export type NormalizedImage = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  contentType: string;
  wasResized: boolean;
  byteSize: number;
};

// ---------------------------------------------------------------------------
// Core helper — validate type + bytes, then resize to the role's max edge.
// ---------------------------------------------------------------------------

export async function normalizeImageForRole(
  picked: PickedImage,
  role: MediaRole,
): Promise<NormalizedImage | PickResultCanceled> {
  const config = MEDIA_ROLE_CONFIG[role];

  // 0. Cancellation sentinel — when the picker reports canceled, we must not
  //    proceed to type/size checks that would crash on undefined fields.
  if (picked.canceled) {
    return { canceled: true } as PickResultCanceled;
  }

  const uri = picked.uri;
  if (!uri) {
    // Treat a missing uri as cancellation too (defensive for malformed results).
    return { canceled: true } as PickResultCanceled;
  }

  // 1. Type validation.
  const mime = resolveMimeType(uri, picked.mimeType);
  if (!mime) {
    throw new MediaNormalizationError("invalidType", "media.error.invalidType");
  }

  // 2. Size validation (pre-resize) — fail fast before spending time resizing.
  const probed = picked.fileSize ?? (await probeFileSize(uri));
  if (probed !== null && probed > config.maxBytes) {
    throw new MediaNormalizationError("oversized", "media.error.oversized", {
      mb: Math.round(config.maxBytes / (1024 * 1024)),
    });
  }

  // 3. Dimensions — prefer the picker's own width/height when present.
  const knownDims = picked.width && picked.height ? { width: picked.width, height: picked.height } : null;

  const result = await resizeToMaxEdge(uri, config.maxEdge, knownDims, {
    quality: config.quality,
    format: config.format === "webp" ? SaveFormat.WEBP : SaveFormat.JPEG,
  });

  // 4. Post-resize size (best effort).
  const finalSize = result.wasResized ? (await probeFileSize(result.uri)) ?? probed ?? 0 : probed ?? 0;

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: config.contentType,
    contentType: config.contentType,
    wasResized: result.wasResized,
    byteSize: finalSize,
  };
}

// ---------------------------------------------------------------------------
// Picker option presets — centralised so every call site agrees on images-only,
// full quality (we re-encode), no EXIF, no base64.
// ---------------------------------------------------------------------------

export type PickerImageOptions = {
  multiple?: boolean;
  selectionLimit?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
};

import type { ImagePickerOptions } from "expo-image-picker";

export function buildPickerImageOptions(opts: PickerImageOptions = {}): ImagePickerOptions {
  return {
    mediaTypes: ["images"] as ImagePickerOptions["mediaTypes"],
    quality: 1,
    exif: false,
    base64: false,
    allowsMultipleSelection: opts.multiple ?? false,
    allowsEditing: opts.allowsEditing ?? false,
    aspect: opts.aspect,
    selectionLimit: opts.selectionLimit,
  };
}
