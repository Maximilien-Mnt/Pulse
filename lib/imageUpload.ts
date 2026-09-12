import { Platform } from "react-native";
// @ts-ignore - expo-file-system is not available on web
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "@/lib/supabase";
import { normalizeImageForRole, type MediaRole } from "./mediaPipeline";

// ---------------------------------------------------------------------------
// Cross-platform image upload helpers for Supabase Storage.
//
// expo-image-picker returns a local file URI. Reading that file differs by
// platform:
//  - Web: the URI is a blob:/data: URL. We fetch() it and read the ArrayBuffer
//    directly. expo-file-system's readAsStringAsync is native-only and throws
//    on web, so we must never call it there.
//  - Native (iOS/Android): read the file as base64 via expo-file-system, then
//    decode it to an ArrayBuffer.
//
// When `role` is supplied the image is run through the shared media pipeline
// (type + size validation, dimension inspection, resize to a documented max
// edge) BEFORE it is read for upload. This keeps uploads consistent and
// bounded. Video uploads bypass this — they must NOT set `role`.
// ---------------------------------------------------------------------------

/** Coarse upload progress callback (0 = started, 1 = done). */
export type UploadProgressCallback = (fraction: number) => void;

/** Decode a base64 string to an ArrayBuffer (web native atob + RN fallback). */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const binary = typeof globalThis.atob === "function" ? globalThis.atob(base64) : atobPolyfill(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Manual base64 decoder for environments without a global atob (older RN/Hermes).
function atobPolyfill(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = "";
  let i = 0;
  while (i < input.length) {
    const enc1 = chars.indexOf(input.charAt(i++));
    const enc2 = chars.indexOf(input.charAt(i++));
    const enc3 = chars.indexOf(input.charAt(i++));
    const enc4 = chars.indexOf(input.charAt(i++));
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    if (enc3 === 64) str += String.fromCharCode(chr1);
    else if (enc4 === 64) str += String.fromCharCode(chr1, chr2);
    else str += String.fromCharCode(chr1, chr2, chr3);
  }
  return str;
}

/**
 * Read a local image URI (e.g. from expo-image-picker result.assets[i].uri)
 * into an ArrayBuffer, on web, iOS, and Android.
 */
export async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    // Web: fetched the blob URL the picker produced. Never touch FileSystem here.
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.arrayBuffer();
  }
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  return base64ToArrayBuffer(base64);
}

export type UploadImageOptions = {
  /** Supabase Storage bucket name (e.g. "avatars", "posts", "clubs", "events"). */
  bucket: string;
  /** Full path inside the bucket. */
  path: string;
  /** Local URI of the picked image. */
  uri: string;
  /** MIME type of the uploaded file. Defaults to "image/jpeg". */
  contentType?: string;
  /** Overwrite existing file at the same path. Defaults to false. */
  upsert?: boolean;
  /**
   * Append `?t=<Date.now()>` to the returned public URL so expo-image refetches
   * it instead of serving a cached copy. Useful when the path is stable
   * (e.g. `${userId}/avatar.jpg`).
   */
  cacheBust?: boolean;
  /**
   * When set, the image is validated + resized via the shared media pipeline
   * before upload. Supplies picker metadata so the pipeline can skip redundant
   * probes. Do NOT set for video uploads.
   */
  role?: MediaRole;
  /** Picker-supplied dimensions/mime/size — avoids re-probing in the pipeline. */
  pickerMeta?: {
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
    fileSize?: number | null;
  };
  /** Coarse progress hook (0 = started, 1 = done). */
  onProgress?: UploadProgressCallback;
};

/**
 * Upload an image to Supabase Storage and return its public URL.
 * Works on web, iOS, and Android.
 *
 * When `role` is provided the source is validated + resized via the shared
 * media pipeline first. Progress fires 0 before upload and 1 after it settles.
 */
export async function uploadImageToStorage({
  bucket,
  path,
  uri,
  contentType = "image/jpeg",
  upsert = false,
  cacheBust = false,
  role,
  pickerMeta,
  onProgress,
}: UploadImageOptions): Promise<string> {
  onProgress?.(0);

  // Run the shared pipeline when a role is given. This validates type + size,
  // inspects dimensions and resizes to the role's documented max edge.
  let uploadUri = uri;
  let uploadContentType = contentType;
  if (role) {
    const normalized = await normalizeImageForRole(
      {
        uri,
        mimeType: pickerMeta?.mimeType,
        width: pickerMeta?.width,
        height: pickerMeta?.height,
        fileSize: pickerMeta?.fileSize,
      },
      role,
    );
    uploadUri = normalized.uri;
    uploadContentType = normalized.contentType;
  }

  const arrayBuffer = await uriToArrayBuffer(uploadUri);
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: uploadContentType,
    upsert,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  onProgress?.(1);
  return cacheBust ? `${data.publicUrl}?t=${Date.now()}` : data.publicUrl;
}

/**
 * Remove an object from Supabase Storage by bucket + path. Used to clean up a
 * previously uploaded image when it is replaced, preventing orphaned files.
 * Fails quietly for unknown/unparseable URLs.
 */
export async function removeFromStorage(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

/**
 * Extract the storage path from a Supabase public URL and delete the object.
 * Accepts the URL shape `${origin}/storage/v1/object/public/${bucket}/${path}`.
 * Returns false (no-op) if the URL is not a matching public URL.
 */
export async function removeFromStorageByUrl(publicUrl: string, bucket: string): Promise<boolean> {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return false;
  const path = publicUrl.slice(idx + marker.length);
  if (!path) return false;
  await removeFromStorage(bucket, path);
  return true;
}