// ---------------------------------------------------------------------------
// PULSE — Notifications localization
//
// Covers the plural-aware translator, the notification-type label mapping
// (incl. safe fallbacks for unknown server values), the locale-aware time
// formatters and the locale-aware number/currency helpers. Language switching
// and zero / one / many counts are exercised end-to-end.
// ---------------------------------------------------------------------------

import { useLanguageStore, type Language } from "@/stores/languageStore";
import { translations, type TranslationKey } from "@/lib/translations";
import { translateFor, translatePlural, translatePluralFor } from "@/lib/i18n";
import {
  NOTIFICATION_TYPE_KEYS,
  getNotificationTypeKey,
  getNotificationTypeLabel,
  resolveNotificationTitle,
} from "@/lib/notifications/labels";
import { getIntlLocale } from "@/lib/locale";
import { formatDateTimeLocalized, formatRelativeLocalized } from "@/utils/date";
import { formatCount, formatCurrencyFromCents } from "@/utils/format";

function setLanguage(language: Language) {
  useLanguageStore.getState().setLanguage(language);
}

/** Translator bound to the active language, mirroring the screen's `t`. */
function currentT(key: TranslationKey, variables?: Record<string, string | number>) {
  return translateFor(useLanguageStore.getState().language, key, variables);
}

beforeEach(() => setLanguage("fr"));

describe("plural-aware translations", () => {
  it("handles zero / one / many in French", () => {
    expect(translatePlural("notifications.unread", 0)).toBe("Aucune notification non lue");
    expect(translatePlural("notifications.unread", 1)).toBe("1 non lue");
    expect(translatePlural("notifications.unread", 2)).toBe("2 non lues");
    expect(translatePlural("notifications.unread", 99)).toBe("99 non lues");
  });

  it("handles zero / one / many in English after a language switch", () => {
    setLanguage("en");
    expect(translatePlural("notifications.unread", 0)).toBe("No unread notifications");
    expect(translatePlural("notifications.unread", 1)).toBe("1 unread");
    expect(translatePlural("notifications.unread", 7)).toBe("7 unread");
  });

  it("pluralizes member and comment counts in both languages", () => {
    expect(translatePlural("members.count", 1)).toBe("1 membre");
    expect(translatePlural("members.count", 4)).toBe("4 membres");
    expect(translatePlural("members.count", 0)).toBe("Aucun membre");
    expect(translatePlural("comments.count", 1)).toBe("1 commentaire");
    expect(translatePlural("comments.count", 3)).toBe("3 commentaires");

    setLanguage("en");
    expect(translatePlural("members.count", 1)).toBe("1 member");
    expect(translatePlural("members.count", 4)).toBe("4 members");
    expect(translatePlural("members.count", 0)).toBe("No members");
    expect(translatePlural("comments.count", 1)).toBe("1 comment");
    expect(translatePlural("comments.count", 3)).toBe("3 comments");
  });

  it("formats the {count} placeholder with the locale-aware number formatter", () => {
    expect(translatePlural("members.count", 1234)).toContain(formatCount(1234, "fr"));
    setLanguage("en");
    expect(translatePlural("members.count", 1234)).toContain(formatCount(1234, "en"));
  });

  it("falls back to a language-aware rule when Intl.PluralRules is unavailable", () => {
    const original = Intl.PluralRules;
    // Simulate a Hermes build without Intl.PluralRules.
    (Intl as unknown as { PluralRules?: unknown }).PluralRules = undefined;
    try {
      // No `.zero` form on time keys → the language rule decides.
      expect(translatePluralFor("fr", "time.daysAgo", 0)).toBe("Il y a 0 jour");
      expect(translatePluralFor("fr", "time.daysAgo", 1)).toBe("Il y a 1 jour");
      expect(translatePluralFor("fr", "time.daysAgo", 3)).toBe("Il y a 3 jours");
      expect(translatePluralFor("en", "time.daysAgo", 1)).toBe("1 day ago");
      expect(translatePluralFor("en", "time.daysAgo", 3)).toBe("3 days ago");
    } finally {
      (Intl as unknown as { PluralRules?: unknown }).PluralRules = original;
    }
  });

  it("never renders a raw key for malformed counts", () => {
    expect(translatePlural("comments.count", Number.NaN)).toBe("Aucun commentaire");
    expect(translatePluralFor("en", "comments.count", Number.NaN)).toBe("No comments");
  });
});
describe("notification type labels", () => {
  it("maps every known server type to a key present in FR and EN", () => {
    const entries = Object.entries(NOTIFICATION_TYPE_KEYS);
    expect(entries).toHaveLength(21);
    entries.forEach(([type, key]) => {
      expect(typeof translations.fr[key]).toBe("string");
      expect(typeof translations.en[key]).toBe("string");
      expect(type).toMatch(/^[a-z_]+$/);
    });
  });

  it("localizes known types to the viewer's language, not the stored title", () => {
    // Titles are written in the sender's language at insert time.
    const notification = { type: "club_join_request", title: "Demande d'adhésion" };
    expect(resolveNotificationTitle(notification, currentT)).toBe("Demande d'adhésion");

    setLanguage("en");
    expect(resolveNotificationTitle(notification, currentT)).toBe("Club join request");
  });

  it("falls back to the stored title for unknown server values", () => {
    const notification = { type: "some_future_type", title: "Something new" };
    expect(resolveNotificationTitle(notification, currentT)).toBe("Something new");
  });

  it("falls back to the generic label when nothing usable is stored", () => {
    expect(resolveNotificationTitle({ type: "some_future_type" }, currentT)).toBe("Notification");
    expect(resolveNotificationTitle({ type: null, title: "   " }, currentT)).toBe("Notification");
    expect(resolveNotificationTitle({}, currentT)).toBe("Notification");
    expect(
      resolveNotificationTitle({ type: 42, title: 7 } as never, currentT)
    ).toBe("Notification");
  });

  it("never leaks a raw snake_case id", () => {
    expect(getNotificationTypeLabel("new_follower")).toBe("Nouvel abonné");
    setLanguage("en");
    expect(getNotificationTypeLabel("new_follower")).toBe("New follower");
    expect(getNotificationTypeLabel("unknown_future_type")).toBe("Notification");
    expect(getNotificationTypeLabel(undefined)).toBe("Notification");
    expect(getNotificationTypeKey("unknown_future_type")).toBeNull();
    expect(getNotificationTypeKey(123)).toBeNull();
  });
});

describe("locale-aware time formatting", () => {
  const iso = "2026-01-02T14:30:00.000Z";
  const at = (millisAfter: number) => Date.parse(iso) + millisAfter;

  it("renders 'just now' under a minute in both languages", () => {
    expect(formatRelativeLocalized(iso, { language: "fr", now: at(30_000) })).toBe("À l'instant");
    expect(formatRelativeLocalized(iso, { language: "en", now: at(30_000) })).toBe("Just now");
  });

  it("renders locale-aware minutes, hours and days", () => {
    expect(formatRelativeLocalized(iso, { language: "fr", now: at(5 * 60_000) })).toContain("5 minutes");
    expect(formatRelativeLocalized(iso, { language: "en", now: at(5 * 60_000) })).toContain("5 minutes");
    expect(formatRelativeLocalized(iso, { language: "fr", now: at(3 * 3_600_000) })).toContain("3 heures");
    expect(formatRelativeLocalized(iso, { language: "en", now: at(3 * 3_600_000) })).toContain("3 hours");
    // FR Intl.RelativeTimeFormat renders "-2 days" idiomatically as
    // "avant-hier"; EN uses the numeric form.
    expect(formatRelativeLocalized(iso, { language: "fr", now: at(2 * 86_400_000) })).toContain("avant-hier");
    expect(formatRelativeLocalized(iso, { language: "en", now: at(2 * 86_400_000) })).toContain("2 days");
  });

  it("falls back to translated plural keys without Intl.RelativeTimeFormat", () => {
    const original = Intl.RelativeTimeFormat;
    (Intl as unknown as { RelativeTimeFormat?: unknown }).RelativeTimeFormat = undefined;
    try {
      expect(formatRelativeLocalized(iso, { language: "en", now: at(60_000) })).toBe("1 minute ago");
      expect(formatRelativeLocalized(iso, { language: "en", now: at(5 * 60_000) })).toBe(
        "5 minutes ago"
      );
      expect(formatRelativeLocalized(iso, { language: "fr", now: at(5 * 60_000) })).toBe(
        "Il y a 5 minutes"
      );
    } finally {
      (Intl as unknown as { RelativeTimeFormat?: unknown }).RelativeTimeFormat = original;
    }
  });

  it("formats absolute timestamps in the requested timezone", () => {
    const utc = formatDateTimeLocalized(iso, { language: "en", timeZone: "UTC" });
    const newYork = formatDateTimeLocalized(iso, { language: "en", timeZone: "America/New_York" });
    const french = formatDateTimeLocalized(iso, { language: "fr", timeZone: "UTC" });

    expect(utc).toContain("2026");
    expect(newYork).toContain("2026");
    expect(utc).not.toBe(newYork);
    expect(french).toContain("2026");
    expect(french).not.toBe(utc);
  });

  it("returns an empty string for missing or invalid timestamps", () => {
    expect(formatRelativeLocalized(null)).toBe("");
    expect(formatRelativeLocalized("not-a-date")).toBe("");
    expect(formatDateTimeLocalized(undefined)).toBe("");
  });
});

describe("locale-aware numbers and currency", () => {
  it("resolves the Intl locale from the app language", () => {
    expect(getIntlLocale("fr")).toBe("fr-FR");
    expect(getIntlLocale("en")).toBe("en-GB");
  });

  it("formats counts per locale", () => {
    expect(formatCount(1234, "en")).toBe("1,234");
    expect(formatCount(1234, "fr")).toContain("234");
    expect(formatCount(Number.NaN, "en")).toBe("0");
  });

  it("formats currency per language", () => {
    const fr = formatCurrencyFromCents(1800, { language: "fr" });
    const en = formatCurrencyFromCents(1800, { language: "en" });
    expect(fr).toContain("18");
    expect(fr).toContain("€");
    expect(en).toContain("18");
    expect(en).toContain("€");
    expect(fr).not.toBe(en);
  });
});