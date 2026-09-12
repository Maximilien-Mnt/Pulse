// ---------------------------------------------------------------------------
// PULSE — Safe query-error logging
//
// Log data-loading failures for diagnostics without ever surfacing raw
// technical details to the UI. Callers render a localized, non-technical
// message (see events.list.* / events.detail.* keys) and pass the raw error
// here so it is captured in dev logs + PostHog with no PII.
// ---------------------------------------------------------------------------

/** Best-effort, PII-free error logging for query failures. Never throws. */
export function logQueryError(scope: string, error: unknown): void {
  try {
    const name =
      error instanceof Error ? error.name : typeof error === "object" && error !== null ? "QueryError" : "UnknownError";
    if (__DEV__) {
      console.warn(`[${scope}] query failed: ${name}`);
    }
    try {
      // Lazy require so unit tests / non-native environments without the
      // PostHog native module don't crash on import.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PostHog } = require("posthog-react-native") as {
        PostHog?: { capture?: (event: string, props?: Record<string, unknown>) => void };
      };
      PostHog?.capture?.("query_error", { scope, error_name: name });
    } catch {
      // Analytics is best-effort — ignore.
    }
  } catch {
    // Logging must never break the UI.
  }
}
