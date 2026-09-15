// ---------------------------------------------------------------------------
// PULSE — Locale helpers
//
// Single place that maps the app language to an Intl locale and resolves the
// device timezone. Every locale-aware formatter (dates, relative times,
// numbers, currency) reads these two values so the UI follows the user's
// language AND their device timezone instead of a hardcoded French locale.
// ---------------------------------------------------------------------------

import { useLanguageStore, type Language } from "@/stores/languageStore";

/** BCP-47 locale used for Intl formatting, per app language. */
export const INTL_LOCALES: Record<Language, string> = {
  fr: "fr-FR",
  en: "en-GB",
};

/** Intl locale for a language (defaults to the active interface language). */
export function getIntlLocale(language?: Language): string {
  const lang = language ?? useLanguageStore.getState().language;
  return INTL_LOCALES[lang] ?? INTL_LOCALES.fr;
}

let cachedTimeZone: string | null = null;

function resolveDeviceTimeZone(): string {
  try {
    // Lazily required: on Jest / some web builds the native module is absent
    // and the import itself can throw (same reason lib/passwordStorage does it).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const localization = require("expo-localization") as {
      getCalendars?: () => Array<{ timeZone?: string | null }>;
    };
    const zone = localization.getCalendars?.()[0]?.timeZone;
    if (zone) return zone;
  } catch {
    // Fall through to Intl.
  }
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) return zone;
  } catch {
    // Fall through to UTC.
  }
  return "UTC";
}

/**
 * Device timezone ("Europe/Paris", "America/New_York", …).
 * Resolved once; never throws.
 */
export function getDeviceTimeZone(): string {
  if (cachedTimeZone === null) cachedTimeZone = resolveDeviceTimeZone();
  return cachedTimeZone;
}
