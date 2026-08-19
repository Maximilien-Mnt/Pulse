import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const NAVBAR_STORAGE_KEY = "pulse:navbar-position";

export type NavbarPosition = "left" | "bottom";

type NavbarState = {
  position: NavbarPosition;
  setPosition: (p: NavbarPosition) => void;
  toggle: () => void;
  /** Hydrate navbar position from storage. Call once on app start. */
  hydrate: () => Promise<void>;
};

async function persistPosition(p: NavbarPosition) {
  await AsyncStorage.setItem(NAVBAR_STORAGE_KEY, p);
}

export const useNavbarStore = create<NavbarState>()((set, get) => ({
  position: "left",
  setPosition: (position) => {
    set({ position });
    void persistPosition(position);
  },
  toggle: () => {
    const next = get().position === "left" ? "bottom" : "left";
    get().setPosition(next);
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(NAVBAR_STORAGE_KEY);
    if (stored === "left" || stored === "bottom") {
      set({ position: stored });
    }
  },
}));