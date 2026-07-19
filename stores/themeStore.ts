import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const THEME_STORAGE_KEY = "pulse:theme-dark";

type ThemeState = {
  isDark: boolean;
  setDark: (v: boolean) => void;
  toggle: () => void;
  /** Hydrate theme from storage and/or system preference. Call once on app start. */
  hydrate: () => Promise<void>;
};

async function persistDark(v: boolean) {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, v ? "true" : "false");
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  isDark: false,
  setDark: (isDark) => {
    set({ isDark });
    void persistDark(isDark);
  },
  toggle: () => {
    const next = !get().isDark;
    get().setDark(next);
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored !== null) {
      set({ isDark: stored === "true" });
    } else {
      // Fall back to OS-level preference
      const { useColorScheme } = await import("react-native");
      const systemDark = useColorScheme() === "dark";
      set({ isDark: systemDark });
      void persistDark(systemDark);
    }
  },
}));
