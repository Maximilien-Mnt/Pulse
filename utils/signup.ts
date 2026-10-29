import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import type { SignupSportSelection } from "@/types";
import { uploadImageToStorage } from "@/lib/imageUpload";
import { isUnderageFromISO, isValidBirthDateISO } from "@/utils/signupDate";
import { composeOtherOption } from "@/lib/constants";
import { stripUnknownFields } from "@/utils/protectedMutations";

const PENDING_SIGNUP_KEY = "pulse:pending-signup";

export type PendingSignupData = {
  profile: {
    id: string;
    email: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    avatarLocalUri: string | null;
    bio: string | null;
    birth_date: string;
    country: string;
    city: string | null;
    language: string;
    height_cm: number | null;
    weight_kg: number | null;
    discovery_source: string | null;
    interested_sports: string[];
  };
  sports: SignupSportSelection[];
  objectives: string[];
};

/**
 * Persist signup data so it can be replayed after email confirmation.
 */
export async function savePendingSignup(data: PendingSignupData): Promise<void> {
  await AsyncStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(data));
}

/**
 * Load and remove pending signup data.
 */
export async function loadPendingSignup(): Promise<PendingSignupData | null> {
  const raw = await AsyncStorage.getItem(PENDING_SIGNUP_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);
  try {
    return JSON.parse(raw) as PendingSignupData;
  } catch {
    return null;
  }
}

/**
 * Replay a pending signup: insert profile, user_sports, user_objectives.
 * Idempotent via ON CONFLICT (id) DO NOTHING on profiles.
 */
export async function completeSignup(data: PendingSignupData): Promise<void> {
  const { profile, sports, objectives } = data;

  if (!isValidBirthDateISO(profile.birth_date)) {
    throw new Error("INVALID_DATE");
  }

  if (isUnderageFromISO(profile.birth_date)) {
    throw new Error("UNDERAGE");
  }

  let avatarUrl = profile.avatar_url;
  if (!avatarUrl && profile.avatarLocalUri) {
    try {
      avatarUrl = await uploadImageToStorage({
        bucket: "avatars",
        path: `${profile.id}/avatar.jpg`,
        uri: profile.avatarLocalUri,
        upsert: true,
        cacheBust: true,
      });
    } catch (e) {
      console.warn("Failed to upload pending signup avatar", e);
    }
  }

  // Insert into profiles WITHOUT sensitive columns (they live in profile_private)
  const { error: pe } = await supabase.from("profiles").upsert(
    stripUnknownFields("profiles", {
      id: profile.id,
      full_name: profile.full_name,
      username: profile.username,
      avatar_url: avatarUrl,
      bio: profile.bio,
      country: profile.country,
      city: profile.city,
      language: profile.language,
      interested_sports: profile.interested_sports,
      is_public_profile: false,
      public_status: {},
      public_photos: [],
    }) as any,
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (pe) throw pe;

  // Insert sensitive columns into profile_private (RLS owner-only)
  const { error: ppe } = await supabase.from("profile_private").upsert(
    {
      user_id: profile.id,
      email: profile.email,
      birth_date: profile.birth_date,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      discovery_source: profile.discovery_source,
      push_token: null,
    },
    { onConflict: "user_id" }
  );
  if (ppe) throw ppe;

  for (const s of sports) {
    const { error: se } = await supabase.from("user_sports").upsert(
      stripUnknownFields("user_sports", {
        user_id: profile.id,
        sport_id: s.sportId,
        // Signup sports are always *practiced* sports. Without this the
        // column default ('practiced') was applied implicitly — and any
        // future change of the default would silently corrupt signup data.
        category: "practiced",
        // Pending signups store the raw selection, where an "Autre" pick keeps
        // its detail in `levelOther` / `practiceOther` — compose it into the
        // final value exactly like buildSignupPayload does.
        level: composeOtherOption(s.level, s.levelOther),
        practice: composeOtherOption(s.practice, s.practiceOther),
        time_slots: (s.timeSlots ?? []).map((slot) => ({
          weekday: slot.weekday,
          startHour: slot.startHour,
          endHour: slot.endHour,
        })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
      // row instead of inserting a duplicate (the old `onConflict: "id"` never
      // matched, since `id` is generated and not supplied).
      { onConflict: "user_id,sport_id,category", ignoreDuplicates: false }
    );
    if (se) throw se;
  }

  for (const o of objectives) {
    const { error: oe } = await supabase.from("user_objectives").upsert(
      stripUnknownFields("user_objectives", {
        user_id: profile.id,
        objective: o,
      }) as any,
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (oe) throw oe;
  }
}