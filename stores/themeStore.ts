import { create } from "zustand";

type ThemeState = {
  isDark: boolean;
  setDark: (v: boolean) => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>()((set, get) => ({
  isDark: false,
  setDark: (isDark) => set({ isDark }),
  toggle: () => set({ isDark: !get().isDark }),
}));