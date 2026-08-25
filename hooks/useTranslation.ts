import { useLanguageStore } from "@/stores/languageStore";
import { translations, TranslationKey } from "@/lib/translations";

const cache = new Map<string, string>();

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

  return { t, language };
}
