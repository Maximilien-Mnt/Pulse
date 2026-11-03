// ---------------------------------------------------------------------------
// PULSE — User content escaping utilities
//---------------------------------------------------------------------------
// Escapes HTML entities in user-generated content to prevent XSS and ensure
// safe rendering in the UI and when sharing via Share.share().
//---------------------------------------------------------------------------

/**
 * Escape HTML entities in a string to prevent XSS and ensure safe rendering.
 * This is the main function for escaping user content.
 *
 * @param value - The string to escape (can be null/undefined)
 * @returns The escaped string, or empty string if value is null/undefined
 *
 * Escapes: & -> &, < -> <, > -> >, " -> ", ' -> '
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null || value === undefined) return "";
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "\"")
    .replace(/'/g, "'");
}

/**
 * Escape content for safe use in Share.share() message.
 * This strips or escapes characters that could cause issues with the Share API.
 *
 * @param value - The string to escape for sharing
 * @returns The share-safe string
 */
export function escapeForShare(value: string | null | undefined): string {
  if (value == null || value === undefined) return "";
  // Remove or escape characters that could break Share API
  return value
    .replace(/[<>'"&]/g, (char) => {
      const htmlMap: Record<string, string> = {
        "<": "<",
        ">": ">",
        '"': '"',
        "'": "'",
        "&": "&",
      };
      return htmlMap[char];
    })
    .trim();
}

/**
 * Sanitize user content for database storage (Supabase JSONB).
 * Strips HTML tags and escapes dangerous characters.
 *
 * @param value - The string to sanitize for storage
 * @returns The sanitized string safe for JSONB storage
 */
export function sanitizeForDatabase(value: string | null | undefined): string {
  if (value == null || value === undefined) return "";
  // First escape HTML, then strip any remaining tags
  const escaped = escapeHtml(value);
  // Remove any HTML tags that might have been injected
  return escaped.replace(/<[^>]*>/g, "").trim();
}

/**
 * Get a truncated, escaped version of user content.
 * Useful for display in limited-space UI elements like cards or tags.
 *
 * @param value - The string to escape and truncate
 * @param maxLength - Maximum length in characters (default: 100)
 * @returns The escaped and potentially truncated string
 */
export function escapeAndTruncate(
  value: string | null | undefined,
  maxLength: number = 100
): string {
  if (value == null || value === undefined) return "";
  const escaped = escapeHtml(value);
  if (escaped.length <= maxLength) return escaped;
  return escaped.slice(0, maxLength - 3) + "...";
}

export default {
  escapeHtml,
  escapeForShare,
  sanitizeForDatabase,
  escapeAndTruncate,
};
