import { create } from "zustand";

type AuthState = {
  userId: string | null;
  initialized: boolean;
  setUserId: (id: string | null) => void;
  setInitialized: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  initialized: false,
  setUserId: (userId) => set({ userId }),
  setInitialized: (initialized) => set({ initialized }),
}));
