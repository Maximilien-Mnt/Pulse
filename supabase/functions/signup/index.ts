import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handlePreflight, jsonWithCors } from "../_shared/cors.ts";

const MIN_AGE = 16;
const MAX_SPORTS = 10;
const MAX_OBJECTIVES = 10;
const MAX_BIO = 2000;
const MAX_STR = 500;

/**
 * Stable, machine-readable error codes. These are the ONLY contract the
 * client may rely on (see utils/signupChecklist.ts on the app side). Human
 * Postgres / GoTrue messages are never forwarded raw, because the pre-2026
 * versions leaked untyped messages that mapped to a generic toast on the
 * client and hid the real cause.
 *
 * Conventions:
 *  - INVALID_PAYLOAD   payload failed structural validation
 *  - INVALID_DATE      birth date is not a real calendar date
 *  - UNDERAGE          birth date is below MIN_AGE
 *  - SIGNUP_FAILED     account could not be created (generic: also covers
 *                      already-registered email / taken username so callers
 *                      cannot enumerate accounts)
 *  - AUTH_SIGNUP_FAILED auth.signUp rejected for any other reason
 *  - PROFILE_INSERT_FAILED / SPORTS_INSERT_FAILED / OBJECTIVES_INSERT_FAILED
 *                       row insert failed after the auth user was created
 *  - INTERNAL           unhandled exception (never leaks stack traces)
 */
const ERR = {
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  INVALID_DATE: "INVALID_DATE",
  UNDERAGE: "UNDERAGE",
  SIGNUP_FAILED: "SIGNUP_FAILED",
  EMAIL_TAKEN: "SIGNUP_FAILED",
  USERNAME_TAKEN: "SIGNUP_FAILED",
  AUTH_SIGNUP_FAILED: "AUTH_SIGNUP_FAILED",
  PROFILE_INSERT_FAILED: "PROFILE_INSERT_FAILED",
  SPORTS_INSERT_FAILED: "SPORTS_INSERT_FAILED",
  OBJECTIVES_INSERT_FAILED: "OBJECTIVES_INSERT_FAILED",
  INTERNAL: "INTERNAL",
} as const;

type ApiResponseBody = {
  ok: boolean;
  error?: string;
  detail?: string;
  userId?: string;
  email?: string;
  needsConfirmation?: boolean;
};

/** Always return JSON + allow-listed CORS, whatever status. */
function json(req: Request, body: ApiResponseBody, status = 200): Response {
  const { detail: _detail, ...safe } = body;
  return jsonWithCors(req, safe as unknown as Record<string, unknown>, status);
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[!@#$%^&]/.test(pw);
}

function isSafeUrlOrPath(v: string): boolean {
  if (v.length > MAX_STR) return false;
  return v.startsWith("https://") || v.startsWith("avatars/");
}

function isValidPayload(raw: unknown): {
  ok: true;
  data: {
    email: string;
    password: string;
    full_name: string;
    username: string;
    birth_date: string;
    country: string;
    city?: string;
    language: string;
    height_cm?: number;
    weight_kg?: number;
    bio?: string;
    avatar_url?: string;
    discovery_source?: string;
    interested_sports: string[];
    sports: {
      sportId: string;
      level: string;
      practice: string;
      timeSlots?: { weekday: number; startHour: number; endHour: number }[];
      levelOther?: string;
      practiceOther?: string;
    }[];
    objectives: string[];
  };
} | { ok: false; error: string } {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("email" in raw) ||
    !("password" in raw) ||
    !("full_name" in raw) ||
    !("username" in raw) ||
    !("birth_date" in raw) ||
    !("country" in raw) ||
    !("sports" in raw)
  ) {
    return { ok: false, error: "Invalid payload" };
  }

  const p = raw as Record<string, unknown>;
  const email = p.email;
  const password = p.password;
  const full_name = p.full_name;
  const username = p.username;
  const birth_date = p.birth_date;
  const country = p.country;
  const language = p.language;
  const height_cm = p.height_cm;
  const weight_kg = p.weight_kg;
  const bio = p.bio;
  const avatar_url = p.avatar_url;
  const discovery_source = p.discovery_source;
  const interested_sports = p.interested_sports;
  const sports = p.sports;
  const objectives = p.objectives;

  if (
    typeof email !== "string" ||
    !isValidEmail(email) ||
    typeof password !== "string" ||
    !isStrongPassword(password) ||
    typeof full_name !== "string" ||
    full_name.trim().length === 0 ||
    full_name.trim().length > 120 ||
    typeof username !== "string" ||
    !/^[a-zA-Z0-9_-]+$/.test(username) ||
    username.length < 3 ||
    username.length > 30 ||
    typeof birth_date !== "string" ||
    typeof country !== "string" ||
    country.trim().length === 0 ||
    country.trim().length > 120
  ) {
    return { ok: false, error: "Invalid payload" };
  }

  if (
    !Array.isArray(interested_sports) ||
    interested_sports.length > 30 ||
    !interested_sports.every((v) => typeof v === "string" && (v as string).length <= MAX_STR) ||
    !Array.isArray(sports) ||
    sports.length > MAX_SPORTS ||
    !Array.isArray(objectives) ||
    objectives.length > MAX_OBJECTIVES ||
    !objectives.every((v) => typeof v === "string" && (v as string).length <= MAX_STR)
  ) {
    return { ok: false, error: "Invalid payload" };
  }

  // The `sports` array was already validated as an array above. It may be empty
  // ("Aucun sport" path) which is a valid signup.
  for (const s of sports) {
    if (
      typeof s !== "object" ||
      s === null ||
      typeof (s as any).sportId !== "string" ||
      (s as any).sportId.length > MAX_STR ||
      typeof (s as any).level !== "string" ||
      (s as any).level.length > MAX_STR ||
      typeof (s as any).practice !== "string" ||
      (s as any).practice.length > MAX_STR
    ) {
      return { ok: false, error: "Invalid payload" };
    }
    // timeSlots is optional: users may sign up with practiced sports but no
    // availability windows. When present it must be an array of complete
    // slots: { weekday: number, startHour: number, endHour: number }.
    const timeSlots = (s as any).timeSlots;
    if (timeSlots !== undefined) {
      if (!Array.isArray(timeSlots) || timeSlots.length > 21) {
        return { ok: false, error: "Invalid payload" };
      }
      for (const slot of timeSlots) {
        const w = (slot as any)?.weekday;
        const sh = (slot as any)?.startHour;
        const eh = (slot as any)?.endHour;
        if (
          typeof slot !== "object" ||
          slot === null ||
          !Number.isInteger(w) || w < 0 || w > 6 ||
          typeof sh !== "number" || sh < 0 || sh > 24 ||
          typeof eh !== "number" || eh < 0 || eh > 24 ||
          !(eh > sh)
        ) {
          return { ok: false, error: "Invalid payload" };
        }
      }
    }
  }

  if (height_cm !== undefined && (typeof height_cm !== "number" || !Number.isFinite(height_cm) || height_cm < 50 || height_cm > 300)) {
    return { ok: false, error: "Invalid payload" };
  }
  if (weight_kg !== undefined && (typeof weight_kg !== "number" || !Number.isFinite(weight_kg) || weight_kg < 20 || weight_kg > 500)) {
    return { ok: false, error: "Invalid payload" };
  }
  if (bio !== undefined && (typeof bio !== "string" || bio.length > MAX_BIO)) {
    return { ok: false, error: "Invalid payload" };
  }
  if (avatar_url !== undefined && (typeof avatar_url !== "string" || !isSafeUrlOrPath(avatar_url))) {
    return { ok: false, error: "Invalid payload" };
  }
  if (discovery_source !== undefined && (typeof discovery_source !== "string" || discovery_source.length > MAX_STR)) {
    return { ok: false, error: "Invalid payload" };
  }

  const parsed: any = {
    email,
    password,
    full_name,
    username,
    birth_date,
    country,
    language: typeof language === "string" ? language : "fr",
    height_cm: typeof height_cm === "number" ? height_cm : undefined,
    weight_kg: typeof weight_kg === "number" ? weight_kg : undefined,
    bio: typeof bio === "string" ? bio : undefined,
    avatar_url: typeof avatar_url === "string" ? avatar_url : undefined,
    discovery_source: typeof discovery_source === "string" ? discovery_source : undefined,
    interested_sports,
    sports,
    objectives,
  };

  if (typeof p.city === "string") {
    if (p.city.length > MAX_STR) return { ok: false, error: "Invalid payload" };
    parsed.city = p.city;
  }
  return { ok: true, data: parsed };
}

function isValidDate(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return false;
  const y = parseInt(parts[0]!, 10);
  const m = parseInt(parts[1]!, 10);
  const day = parseInt(parts[2]!, 10);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(day)) return false;
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return false;
  return true;
}

function calculateAge(birthDateStr: string): number {
  const bd = new Date(birthDateStr + "T00:00:00Z");
  const now = new Date();
  let age = now.getUTCFullYear() - bd.getUTCFullYear();
  const m = now.getUTCMonth() - bd.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < bd.getUTCDate())) age -= 1;
  return age;
}

/**
 * Detect a Postgres unique-constraint violation on a specific column.
 * PostgREST surfaces these with `code` = "23505" (unique_violation) and a
 * human `message` naming the violated constraint, e.g.:
 *   duplicate key value violates unique constraint "profiles_username_key"
 * We match on the constraint name so email vs username conflicts map to the
 * correct error code (both carry the same Postgres `code`).
 */
function isUniqueViolation(error: { message?: string }, column: string): boolean {
  const constraint = `_${column.toLowerCase()}_key`;
  return (error.message ?? "").toLowerCase().includes(constraint);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests from the browser (allow-listed origins only)
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return json(req, { ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const raw = await req.json();
    const validation = isValidPayload(raw);
    if (!validation.ok) {
      return json(req, { ok: false, error: ERR.INVALID_PAYLOAD }, 400);
    }

    const data = validation.data;

    if (!isValidDate(data.birth_date)) {
      return json(req, { ok: false, error: ERR.INVALID_DATE }, 400);
    }

    const age = calculateAge(data.birth_date);
    if (age < MIN_AGE) {
      return json(req, { ok: false, error: ERR.UNDERAGE }, 403);
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) {
      // Generic failure on purpose: distinguishing "already registered" from
      // other failures lets unauthenticated callers enumerate accounts.
      console.error("signup auth failure:", authError?.message ?? "unknown");
      return json(req, { ok: false, error: ERR.SIGNUP_FAILED }, 400);
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email: data.email,
      full_name: data.full_name,
      username: data.username,
      avatar_url: data.avatar_url ?? null,
      bio: data.bio ?? null,
      birth_date: data.birth_date,
      country: data.country,
      city: data.city ?? null,
      language: data.language,
      height_cm: data.height_cm ?? null,
      weight_kg: data.weight_kg ?? null,
      discovery_source: data.discovery_source ?? null,
      interested_sports: data.interested_sports,
      // New accounts are private by default; the user must explicitly opt in
      // to a public profile via the confirmation flow (GoPublicSheet).
      is_public_profile: false,
      public_status: {},
      public_photos: [],
      push_token: null,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      // Generic failure: the Postgres message names the violated constraint
      // (profiles_username_key / profiles_email_key), which would let callers
      // enumerate taken usernames/emails.
      console.error("signup profile failure:", profileError.message ?? "unknown");
      return json(req, { ok: false, error: ERR.SIGNUP_FAILED }, 400);
    }

    // "Aucun sport" (no-sport path) sends an empty sports array. Skip the
    // insert in that case — PostgREST rejects inserting an empty array.
    const sportsRows = data.sports.map((s) => ({
      user_id: userId,
      sport_id: s.sportId,
      level: s.level,
      practice: s.practice,
      time_slots: (s.timeSlots ?? []).map((slot) => ({
        weekday: slot.weekday,
        startHour: slot.startHour,
        endHour: slot.endHour,
      })),
    }));

    if (sportsRows.length > 0) {
      const { error: sportsError } = await supabase.from("user_sports").insert(sportsRows);
      if (sportsError) {
        await supabase.auth.admin.deleteUser(userId);
        console.error("signup sports failure:", sportsError.message ?? "unknown");
        return json(req, { ok: false, error: ERR.SPORTS_INSERT_FAILED }, 400);
      }
    }

    const objectivesRows = data.objectives.map((o) => ({
      user_id: userId,
      objective: o,
    }));

    if (objectivesRows.length > 0) {
      const { error: objError } = await supabase
        .from("user_objectives")
        .insert(objectivesRows);

      if (objError) {
        await supabase.auth.admin.deleteUser(userId);
        console.error("signup objectives failure:", objError.message ?? "unknown");
        return json(req, { ok: false, error: ERR.OBJECTIVES_INSERT_FAILED }, 400);
      }
    }

    return json(req, {
      ok: true,
      userId,
      email: data.email,
      needsConfirmation: !authData.session,
    });
  } catch {
    // Never leak internal error text; server logs carry the cause.
    return json(req, { ok: false, error: ERR.INTERNAL }, 500);
  }
});
