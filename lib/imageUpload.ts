import { Platform } from "react-native";
// @ts-ignore - expo-file-system is not available on web
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "@/lib/supabase";

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
// ---------------------------------------------------------------------------

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
};

/**
 * Upload an image to Supabase Storage and return its public URL.
 * Works on web, iOS, and Android.
 */
export async function uploadImageToStorage({
  bucket,
  path,
  uri,
  contentType = "image/jpeg",
  upsert = false,
  cacheBust = false,
}: UploadImageOptions): Promise<string> {
  const arrayBuffer = await uriToArrayBuffer(uri);
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    upsert,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return cacheBust ? `${data.publicUrl}?t=${Date.now()}` : data.publicUrl;
}