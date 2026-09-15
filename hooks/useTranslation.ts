import { useLanguageStore } from "@/stores/languageStore";
import { translations, TranslationKey } from "@/lib/translations";
import { translatePluralFor, type PluralBaseKey } from "@/lib/i18n";

const cache = new Map<string, string>();

/**
 * Reactive translator for React components.
 *
 * Returns:
 *   - `t(key, variables?)`  — flat key lookup (existing behaviour),
 *   - `tp(baseKey, count)`   — plural-aware lookup (`<baseKey>.zero|one|other`),
 *   - `language`             — active language, so callers can format
 *                              dates/numbers with the matching Intl locale.
 *
 * Both translators are re-created on language change, which re-renders the
 * component with the new strings.
 */
export function useTranslation() {
  const language = useLanguageStore((s) => s.language);

  const t = (key: TranslationKey, variables?: Record<string, string | number>) => {
    const lang = language;
    const cached = cache.get(`${lang}:${key}`);
    const template = cached ?? translations[lang][key] ?? key;
    if (!cached) cache.set(`${lang}:${key}`, template);

    if (variables) {
      return Object.entries(variables).reduce(
        (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
        template
      );
    }

    return template;
  };

  const tp = (
    baseKey: PluralBaseKey,
    count: number,
    variables?: Record<string, string | number>
  ) => translatePluralFor(language, baseKey, count, variables);

  return { t, tp, language };
}

/**
 * Standalone translator usable outside React components (module-level
 * constants, hooks helpers, error messages). Reads the current language
 * non-reactively from the zustand store. Prefer `useTranslation()` inside
 * components so the UI re-renders on language change.
 */
export function t(key: TranslationKey, variables?: Record<string, string | number>) {
  const language = useLanguageStore.getState().language;
  const template = translations[language][key] ?? key;
  if (variables) {
    return Object.entries(variables).reduce(
      (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
      template
    );
  }
  return template;
}
