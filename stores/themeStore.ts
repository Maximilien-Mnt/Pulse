import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ThemeState = {
  isDark: boolean;
  setDark: (v: boolean) => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      setDark: (isDark) => set({ isDark }),
      toggle: () => set({ isDark: !get().isDark }),
    }),
    { name: "pulse-theme", storage: createJSONStorage(() => AsyncStorage) }
  )
);
