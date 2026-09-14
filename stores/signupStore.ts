import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SignupSportSelection } from "@/types";
import { create } from "zustand";

const SIGNUP_STORAGE_KEY = "pulse:signup";

// ---------------------------------------------------------------------------
// Draft persistence — privacy decision
//
// The draft written to device storage is DELIBERATELY SANITIZED: we persist
// progress so a user who kills the app mid-signup doesn't lose their work, but
// we NEVER persist:
//   - step1.password  (a credential must never live in plaintext AsyncStorage)
//   - step5.avatarLocalUri (a transient local file:// reference that doesn't
//                           survive a restart and would render as a broken
//                           image if replayed)
//
// After a cold restart the user simply re-enters their password and re-picks
// their avatar; all other valid progress (name, birthdate, sports,
// availability, objectives, bio, discovery…) restores.
// ---------------------------------------------------------------------------

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

/**
 * The exact subset of state we are willing to write to device storage.
 * Anything omitted here is deliberately excluded from the persisted draft
 * (see the privacy note at the top of the file).
 */
type PersistedStep1 = Omit<SignupStep1, "password">;
type PersistedStep5 = Omit<SignupStep5, "avatarLocalUri">;

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

/** Strip fields we never persist (password + transient avatar URI). */
function sanitizeForStorage(state: Pick<SignupState, "step1" | "step2" | "step3" | "step3NoSport" | "step4" | "step5">): {
  step1: PersistedStep1 | null;
  step2: SignupStep2 | null;
  step3: SignupSportSelection[];
  step3NoSport: boolean;
  step4: SignupStep4 | null;
  step5: PersistedStep5 | null;
} {
  const { step1, step2, step3, step3NoSport, step4, step5 } = state;
  // Rest-spread keeps the persisted types exact: the password and the
  // transient avatar URI are dropped, not merely set to undefined.
  const persistedStep1: PersistedStep1 | null = step1
    ? (({ password: _pw, ...rest }) => { void _pw; return rest; })(step1)
    : null;
  const persistedStep5: PersistedStep5 | null = step5
    ? (({ avatarLocalUri: _av, ...rest }) => { void _av; return rest; })(step5)
    : null;
  return {
    step1: persistedStep1,
    step2,
    step3,
    step3NoSport,
    step4,
    step5: persistedStep5,
  };
}

async function persistStore(state: Pick<SignupState, "step1" | "step2" | "step3" | "step3NoSport" | "step4" | "step5">) {
  await AsyncStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify(sanitizeForStorage(state)));
}

/**
 * Rebuild an in-memory `SignupState` from a sanitized persisted draft.
 * - Revives the birthDate string back to a Date so the picker works.
 * - Reconstructs a full `SignupStep1` with an empty password (the password
 *   was deliberately never persisted — the user re-types it after a restart).
 * - Drops the whole draft if any tracked step is corrupt, so a bad/legacy
 *   blob can never wedge the flow with half-formed data.
 */
function deserializeState(raw: string | null): Partial<SignupState> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const step1 = parsed.step1 ?? null;
    if (step1 !== null) {
      if (typeof step1 !== "object") return null;
      const hasRequiredStep1 =
        typeof step1.language === "string" &&
        typeof step1.fullName === "string" &&
        typeof step1.username === "string" &&
        typeof step1.email === "string";
      if (!hasRequiredStep1) return null;
    }

    const step2 = parsed.step2 ?? null;
    if (step2 !== null) {
      if (typeof step2 !== "object") return null;
      // JSON turns dates into strings; revive birthDate so DatePicker works.
      if (typeof step2.birthDate === "string") {
        step2.birthDate = new Date(step2.birthDate);
      }
      if (!(step2.birthDate instanceof Date) || isNaN(step2.birthDate.getTime())) return null;
      if (typeof step2.country !== "string") return null;
    }

    const step4 = parsed.step4 ?? null;
    if (step4 !== null && typeof step4 !== "object") return null;

    const step5 = parsed.step5 ?? null;
    if (step5 !== null && typeof step5 !== "object") return null;

    const state = {
      ...initial,
      step1: step1 ? { ...(step1 as Omit<SignupStep1, "password">), password: "" } : null,
      step2,
      step3: Array.isArray(parsed.step3) ? (parsed.step3 as SignupSportSelection[]) : [],
      step3NoSport: !!parsed.step3NoSport,
      step4,
      step5,
    };
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
