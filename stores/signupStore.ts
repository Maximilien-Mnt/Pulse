import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SignupSportSelection } from "@/types";
import { create } from "zustand";

const SIGNUP_STORAGE_KEY = "pulse:signup";

export type SignupStep1 = {
  language: string;
  fullName: string;
  username: string;
  email: string;
  password: string;
};

export type SignupStep2 = {
  birthDate: Date;
  country: string;
  city?: string;
};

export type SignupStep4 = {
  interestedSports: string[];
  objectives: string[];
  objectivesDetails?: string;
  heightCm?: string;
  weightKg?: string;
};

export type SignupStep5 = {
  bio?: string;
  avatarLocalUri?: string | null;
  discovery?: string;
  discoveryDetails?: string;
};

type SignupState = {
  step1: SignupStep1 | null;
  step2: SignupStep2 | null;
  step3: SignupSportSelection[];
  step3NoSport: boolean;
  step4: SignupStep4 | null;
  step5: SignupStep5 | null;
  setStep1: (v: SignupStep1) => void;
  setStep2: (v: SignupStep2) => void;
  setStep3: (v: SignupSportSelection[]) => void;
  setStep3NoSport: (v: boolean) => void;
  setStep4: (v: SignupStep4) => void;
  setStep5: (v: SignupStep5) => void;
  reset: () => Promise<void>;
  hydrate: () => Promise<void>;
};

const initial = {
  step1: null,
  step2: null,
  step3: [] as SignupSportSelection[],
  step3NoSport: false,
  step4: null,
  step5: null,
};

async function persistStore(state: SignupState) {
  await AsyncStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify(state));
}

function deserializeState(raw: string | null): SignupState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const state = parsed as SignupState;
    // JSON turns dates into strings; revive birthDate so DatePicker still works.
    if (state.step2?.birthDate && typeof state.step2.birthDate === "string") {
      state.step2.birthDate = new Date(state.step2.birthDate);
    }
    return state;
  } catch {
    return null;
  }
}

export const useSignupStore = create<SignupState>((set, get) => ({
  ...initial,
  setStep1: (step1) => {
    const state = get();
    const newState = { ...state, step1 };
    set(newState);
    void persistStore(newState);
  },
  setStep2: (step2) => {
    const state = get();
    const newState = { ...state, step2 };
    set(newState);
    void persistStore(newState);
  },
  setStep3: (step3) => {
    const state = get();
    const newState = { ...state, step3 };
    set(newState);
    void persistStore(newState);
  },
  setStep3NoSport: (step3NoSport) => {
    const state = get();
    const newState = { ...state, step3NoSport };
    set(newState);
    void persistStore(newState);
  },
  setStep4: (step4) => {
    const state = get();
    const newState = { ...state, step4 };
    set(newState);
    void persistStore(newState);
  },
  setStep5: (step5) => {
    const state = get();
    const newState = { ...state, step5 };
    set(newState);
    void persistStore(newState);
  },
  reset: async () => {
    set(initial);
    await AsyncStorage.removeItem(SIGNUP_STORAGE_KEY);
  },
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(SIGNUP_STORAGE_KEY);
    const stored = deserializeState(raw);
    if (stored) {
      set(stored);
    }
  },
}));
