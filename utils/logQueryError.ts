// ---------------------------------------------------------------------------
// PULSE — Safe query-error logging (delegates to the reporting layer)
// ---------------------------------------------------------------------------

import { reportError } from "@/lib/reporting/errorReport";

/** Best-effort, PII-free error logging for query failures. Never throws. */
export function logQueryError(scope: string, error: unknown): void {
  try {
    reportError(error, { operation: scope });
  } catch {
    // Logging must never break the UI.
  }
}
