import dayjs from "dayjs";
import type { SignupStep1, SignupStep2, SignupStep4 } from "@/stores/signupStore";
import type { SignupSportSelection } from "@/types";

/**
 * Pure builder for the signup edge-function payload.
 *
 * Extracted from `app/auth/signup/step5.tsx` so the exact request contract
 * (field names, number coercion, date formatting, empty-slot handling) can
 * be unit-tested without rendering the screen or touching the network.
 * The shape here MUST stay in sync with `supabase/functions/signup/index.ts`
 * (`isValidPayload`).
 */

export type SignupPayload = {
  email: string;
  password: string;
  full_name: string;
  username: string;
  birth_date: string;
  country: string;
  city: string | null;
  language: string;
  height_cm: number | null;
  weight_kg: number | null;
  bio: string | null;
  avatar_url: string | null;
  discovery_source: string | null;
  interested_sports: string[];
  sports: {
    sportId: string;
    level: string;
    practice: string;
    timeSlots: { weekday: number; startHour: number; endHour: number }[];
    levelOther?: string;
    practiceOther?: string;
  }[];
  objectives: string[];
  objectives_details?: string;
};

export type SignupPayloadInput = {
  step1: SignupStep1;
  step2: SignupStep2;
  step3: SignupSportSelection[];
  step4: SignupStep4;
  bio: string | null;
  avatarUrl: string | null;
  discoverySource: string | null;
};

/** Number coercion used by the form: empty string → null. */
function toNum(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildSignupPayload(input: SignupPayloadInput): SignupPayload {
  const { step1, step2, step3, step4, bio, avatarUrl, discoverySource } = input;

  return {
    email: step1.email,
    password: step1.password,
    full_name: step1.fullName,
    username: step1.username,
    birth_date: dayjs(step2.birthDate).format("YYYY-MM-DD"),
    country: step2.country,
    city: step2.city ?? null,
    language: step1.language,
    height_cm: toNum(step4.heightCm),
    weight_kg: toNum(step4.weightKg),
    bio: bio || null,
    avatar_url: avatarUrl,
    discovery_source: discoverySource,
    interested_sports: step4.interestedSports,
    sports: step3.map((s) => ({
      sportId: s.sportId,
      level: s.level,
      practice: s.practice,
      timeSlots: s.timeSlots ?? [],
      levelOther: s.levelOther,
      practiceOther: s.practiceOther,
    })),
    objectives: step4.objectives,
    objectives_details: step4.objectivesDetails,
  };
}