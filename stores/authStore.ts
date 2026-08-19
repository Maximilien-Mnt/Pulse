import { create } from "zustand";

type AuthState = {
  userId: string | null;
  initialized: boolean;
  setUserId: (id: string | null) => void;
  setInitialized: (v: boolean) => void;
  /** True when a password-recovery session is active (user clicked the reset link). */
  recoverySession: boolean;
  setRecoverySession: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  initialized: false,
  setUserId: (userId) => set({ userId }),
  setInitialized: (initialized) => set({ initialized }),
  recoverySession: false,
  setRecoverySession: (recoverySession) => set({ recoverySession }),
}));
