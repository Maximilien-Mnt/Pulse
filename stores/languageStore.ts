import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const LANG_STORAGE_KEY = "pulse:lang";

export type Language = "fr" | "en";

type LanguageState = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggle: () => void;
  hydrate: () => Promise<void>;
};

async function persistLang(lang: Language) {
  await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
}

export const useLanguageStore = create<LanguageState>()((set, get) => ({
  language: "fr",
  setLanguage: (lang) => {
    set({ language: lang });
    void persistLang(lang);
  },
  toggle: () => {
    const next = get().language === "fr" ? "en" : "fr";
    get().setLanguage(next);
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "fr" || stored === "en") {
      set({ language: stored });
    }
  },
}));
