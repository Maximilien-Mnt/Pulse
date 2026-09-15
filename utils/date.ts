import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

import { getCurrentLanguage, translateFor, translatePluralFor } from "@/lib/i18n";
import { getDeviceTimeZone, getIntlLocale } from "@/lib/locale";
import type { Language } from "@/stores/languageStore";

dayjs.extend(relativeTime);
dayjs.locale("fr");

/**
 * Formate une date ISO en texte relatif (ex. "il y a 2 heures").
 *
 * Legacy helper: dayjs is pinned to the French locale. Prefer
 * `formatRelativeLocalized` for anything rendered in the UI.
 */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  return dayjs(iso).fromNow();
}

/**
 * Formate une date pour affichage court type fil (ex. "12 mai 2026").
 */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  return dayjs(iso).format("D MMMM YYYY");
}

/**
 * Heure locale courte.
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return dayjs(iso).format("HH:mm");
}

export type LocalizedDateOptions = {
  /** Interface language used for the Intl locale (defaults to the store). */
  language?: Language;
  /** IANA timezone (defaults to the device timezone). */
  timeZone?: string;
};

/**
 * Locale-aware relative time — "il y a 5 minutes" / "5 minutes ago".
 *
 * Uses `Intl.RelativeTimeFormat` with the user's language when available and
 * falls back to the translated plural keys (`time.*Ago.one|other`) on runtimes
 * without it (some Hermes builds), so the result is always localized.
 */
export function formatRelativeLocalized(
  iso: string | null | undefined,
  options: LocalizedDateOptions & { now?: number } = {}
): string {
  if (!iso) return "";
  const date = new Date(iso);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";

  const lang = options.language ?? getCurrentLanguage();
  const elapsedMs = Math.max(0, (options.now ?? Date.now()) - time);

  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return translateFor(lang, "time.justNow");

  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const [unit, value]: ["minute" | "hour" | "day", number] =
    minutes < 60 ? ["minute", minutes] : hours < 24 ? ["hour", hours] : ["day", days];

  try {
    if (typeof Intl !== "undefined" && typeof Intl.RelativeTimeFormat === "function") {
      return new Intl.RelativeTimeFormat(getIntlLocale(lang), { numeric: "auto" }).format(
        -value,
        unit
      );
    }
  } catch {
    // Fall through to the translated plural keys.
  }

  const fallbackKey =
    unit === "minute"
      ? "time.minutesAgo"
      : unit === "hour"
        ? "time.hoursAgo"
        : "time.daysAgo";
  return translatePluralFor(lang, fallbackKey, value);
}

/**
 * Locale-aware absolute date + time in the user's timezone — used for the
 * exact timestamp behind a relative label (e.g. screen-reader descriptions).
 */
export function formatDateTimeLocalized(
  iso: string | null | undefined,
  options: LocalizedDateOptions & {
    dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
    timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  } = {}
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const locale = getIntlLocale(options.language);
  const timeZone = options.timeZone ?? getDeviceTimeZone();
  const dateStyle = options.dateStyle ?? "medium";
  const timeStyle = options.timeStyle ?? "short";

  try {
    return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle, timeZone }).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle }).format(date);
    } catch {
      return date.toISOString();
    }
  }
}

export { dayjs };
