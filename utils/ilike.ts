/**
 * Escape LIKE wildcards so a free-text search term cannot inject `%`, `_` or
 * `\` patterns (LIKE-semantics abuse and slow full-table ILIKE scans). The
 * value is still sent as a bound parameter by supabase-js; this only limits
 * the wildcard characters the user controls. Also trims and caps length.
 *
 * Shared by the events and clubs list hooks so the escaping rule has a single
 * source of truth.
 */
export function escapeIlikeTerm(value: string): string {
  return value.trim().slice(0, 60).replace(/[\\%_]/g, "\\$&");
}
