// ---------------------------------------------------------------------------
// PULSE — i18n core
//
// Standalone (non-React) translation function. Safe to use outside React
// components (hooks, utils, stores) by reading the current language directly
// from the zustand store. `useTranslation` wraps this for React components so
// they re-render when the language changes.
//
// Also exposes localized data-catalog helpers (sports, levels, practices,
// objectives, statuses, event categories, sort options, weekdays, countries).
// DB values stay language-independent (stable ids / French origin strings);
// these helpers map them to the active language at render time.
// ---------------------------------------------------------------------------

import { translations, type TranslationKey } from "@/lib/translations";
import { useLanguageStore, type Language } from "@/stores/languageStore";
import { EN_LABELS } from "@/lib/localizedData";
import { getCountryLabel, getCountryDisplay } from "@/utils/countries";
import { SPORTS, CLUB_SORT_OPTIONS, EVENT_SORT_OPTIONS } from "@/lib/constants";

const cache = new Map<string, string>();

function resolve(lang: Language, key: string): string {
  const cacheKey = `${lang}:${key}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const template = (translations[lang] as Record<string, string>)[key] ?? key;
  cache.set(cacheKey, template);
  // Dev-time safety net: any key rendered in English must exist in the EN block.
  if (__DEV__ && lang === "en" && !(translations.en as Record<string, string>)[key]) {
    console.warn(`[i18n] Missing "en" translation for key "${key}".`);
  }
  return template;
}

export function translate(
  key: TranslationKey,
  variables?: Record<string, string | number>
): string {
  const lang = useLanguageStore.getState().language;
  const template = resolve(lang, key as string);

  if (variables) {
    return Object.entries(variables).reduce(
      (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
      template
    );
  }

  return template;
}

/** Current interface language (non-reactive — read the store in components). */
export function getCurrentLanguage(): Language {
  return useLanguageStore.getState().language;
}

// ---------------------------------------------------------------------------
// Data-catalog helpers
//
// These helpers resolve display strings that are NOT app chrome: sport names,
// levels, practice types, objectives, public statuses, event categories, sort
// options, weekdays and country names. The canonical persisted values are the
// French labels / stable ids found in lib/constants.ts and utils/countries.ts.
// In FR mode we return them as-is; in other languages we map to EN via the
// localized-data dictionaries, falling back to the original value when a
// mapping is absent (so nothing renders as a raw key or empty string).
// ---------------------------------------------------------------------------

/** Localized display label for a stored French metric/status/category/… value. */
export function getLabel(value: string | null | undefined): string {
  if (!value) return "";
  const lang = getCurrentLanguage();
  return lang === "fr" ? value : (EN_LABELS[value] ?? value);
}

/** Localized display label for a sport id ("running" → "Course à pied" / "Running"). */
export function getSportLabel(id: string | null | undefined): string {
  if (!id) return "";
  const definition = SPORTS.find((s) => s.id === id);
  const frFallback = definition?.label ?? id;
  const key = `sports.${id}` as TranslationKey;
  const localized = translate(key);
  return localized === key ? getLabel(frFallback) : localized;
}

/** Localized label for a sort-option value ("relevance" → "Pertinence" / "Relevance"). */
export function getSortLabel(value: string | null | undefined): string {
  if (!value) return "";
  const frFallback =
    CLUB_SORT_OPTIONS.find((o) => o.value === value)?.label ??
    EVENT_SORT_OPTIONS.find((o) => o.value === value)?.label ??
    value;
  const key = `sort.${value}` as TranslationKey;
  const localized = translate(key);
  return localized === key ? getLabel(frFallback) : localized;
}

/** Localized weekday name for a numeric weekday index (0 = Monday … 6 = Sunday). */
export function getWeekdayLabel(index: number | null | undefined): string {
  const i = typeof index === "number" && index >= 0 && index <= 6 ? index : 0;
  return translate(`weekdays.${i}` as TranslationKey);
}

/** Language-aware country helpers (re-exported from @/utils/countries). */
export { getCountryLabel, getCountryDisplay };