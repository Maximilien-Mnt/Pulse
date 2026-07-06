import type { SignupSportSelection } from "@/types";
import { create } from "zustand";

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
  heightCm?: string;
  weightKg?: string;
};

export type SignupStep5 = {
  bio?: string;
  avatarLocalUri?: string | null;
  discovery?: string;
};

type SignupState = {
  step1: SignupStep1 | null;
  step2: SignupStep2 | null;
  step3: SignupSportSelection[];
  step4: SignupStep4 | null;
  step5: SignupStep5 | null;
  setStep1: (v: SignupStep1) => void;
  setStep2: (v: SignupStep2) => void;
  setStep3: (v: SignupSportSelection[]) => void;
  setStep4: (v: SignupStep4) => void;
  setStep5: (v: SignupStep5) => void;
  reset: () => void;
};

const initial = {
  step1: null,
  step2: null,
  step3: [] as SignupSportSelection[],
  step4: null,
  step5: null,
};

export const useSignupStore = create<SignupState>((set) => ({
  ...initial,
  setStep1: (step1) => set({ step1 }),
  setStep2: (step2) => set({ step2 }),
  setStep3: (step3) => set({ step3 }),
  setStep4: (step4) => set({ step4 }),
  setStep5: (step5) => set({ step5 }),
  reset: () => set(initial),
}));
