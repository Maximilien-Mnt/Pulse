import { useLanguageStore } from "@/stores/languageStore";
import { translations, TranslationKey } from "@/lib/translations";

const cache = new Map<string, string>();

export function useTranslation() {
  const language = useLanguageStore((s) => s.language);

  const t = (key: TranslationKey, variables?: Record<string, string | number>) => {
    const lang = language;
    const cached = cache.get(`${lang}:${key}`);
    if (cached) {
      if (variables) {
        return variables
          ? Object.entries(variables).reduce(
              (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
              cached
            )
          : cached;
      }
      return cached;
    }

    let template = translations[lang][key] ?? key;
    if (variables) {
      template = Object.entries(variables).reduce(
        (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
        template
      );
    }
    cache.set(`${lang}:${key}`, template);
    return template;
  };

  return { t, language };
}
