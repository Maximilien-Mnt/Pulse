// ---------------------------------------------------------------------------
// PULSE — Consistent user-facing error messages (translation keys only)
// ---------------------------------------------------------------------------

import type { TranslationKey } from "@/lib/translations";
import { translate } from "@/lib/i18n";

export type UserErrorKind =
  | "generic"
  | "network"
  | "offline"
  | "unauthorized"
  | "notFound"
  | "validation";

const KEY_BY_KIND: Record<UserErrorKind, TranslationKey> = {
  generic: "errors.generic",
  network: "errors.network",
  offline: "errors.offline",
  unauthorized: "errors.unauthorized",
  notFound: "errors.notFound",
  validation: "errors.generic",
};

/** Resolve a localized, non-technical message. Never returns raw error text. */
export function userFacingMessage(kind: UserErrorKind = "generic"): string {
  try {
    return translate(KEY_BY_KIND[kind]);
  } catch {
    return translate("errors.generic");
  }
}

/** Classify a normalized/raw error into a user-facing kind. */
export function classifyUserError(error: unknown): UserErrorKind {
  try {
    const msg = error instanceof Error ? error.message : typeof error === "string" ? error : "";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: unknown }).status)
        : NaN;
    if (status === 401 || status === 403 || code === "unauthorized") return "unauthorized";
    if (status === 404 || code === "not_found") return "notFound";
    if (/network|fetch|failed to fetch|econn|etimedout|timeout/i.test(`${msg} ${code}`))
      return "network";
    return "generic";
  } catch {
    return "generic";
  }
}

/** Convenience: classify + translate in one call. */
export function userFacingMessageFor(error: unknown): string {
  return userFacingMessage(classifyUserError(error));
}
