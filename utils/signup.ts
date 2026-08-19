import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import type { SignupSportSelection } from "@/types";
import { uploadImageToStorage } from "@/lib/imageUpload";

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

  const { error: pe } = await supabase.from("profiles").upsert(
    {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      username: profile.username,
      avatar_url: avatarUrl,
      bio: profile.bio,
      birth_date: profile.birth_date,
      country: profile.country,
      city: profile.city,
      language: profile.language,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      discovery_source: profile.discovery_source,
      interested_sports: profile.interested_sports,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (pe) throw pe;

  for (const s of sports) {
    const { error: se } = await supabase.from("user_sports").upsert(
      {
        user_id: profile.id,
        sport_id: s.sportId,
        level: s.level,
        practice: s.practice,
        weekdays: s.weekdays,
        start_hour: s.startHour,
        end_hour: s.endHour,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (se) throw se;
  }

  for (const o of objectives) {
    const { error: oe } = await supabase.from("user_objectives").upsert(
      {
        user_id: profile.id,
        objective: o,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (oe) throw oe;
  }
}