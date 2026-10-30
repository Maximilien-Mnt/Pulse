import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handlePreflight,
  jsonWithCors,
  clientIp,
} from "../_shared/cors.ts";

const MIN_AGE = 16;

const MAX_BODY_BYTES = 200_000;
const MAX_SPORTS = 10;
const MAX_OBJECTIVES = 10;
const MAX_BIO = 2000;
const MAX_STR = 500;

const ERR = {
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  INVALID_DATE: "INVALID_DATE",
  UNDERAGE: "UNDERAGE",
  SIGNUP_FAILED: "SIGNUP_FAILED",
  EMAIL_TAKEN: "SIGNUP_FAILED",
  USERNAME_TAKEN: "SIGNUP_FAILED",
  AUTH_SIGNUP_FAILED: "AUTH_SIGNUP_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  CAPTCHA_REQUIRED: "CAPTCHA_REQUIRED",
  CAPTCHA_INVALID: "CAPTCHA_INVALID",
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

function json(req: Request, body: ApiResponseBody, status = 200): Response {
  const { detail: _detail, ...safe } = body;
  return jsonWithCors(req, safe as unknown as Record<string, unknown>, status);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(pw: unknown): pw is string {
  return typeof pw === "string" && pw.length >= 10;
}

function isSafeStorageUrl(v: string, storageDomain: string): boolean {
  if (v.length > MAX_STR) return false;
  if (v.startsWith("avatars/")) return true;
  if (storageDomain.length === 0) return false;
  try {
    const url = new URL(v);
    const host = url.hostname;
    return host === storageDomain || host.endsWith(`.${storageDomain}`);
  } catch {
    return false;
  }
}


type ValidatedPayload = {
  email: string;
  password: string;
  full_name: string;
  username: string;
  birth_date: string;
  country: string;
  city?: string | null;
  language: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  bio?: string | null;
  avatar_url?: string | null;
  discovery_source?: string | null;
  interested_sports: string[];
  accept_terms: boolean;
  accept_privacy: boolean;
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

function isValidPayload(raw: unknown): { ok: true; data: ValidatedPayload } | { ok: false; error: string } {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("email" in raw) ||
    !("password" in raw) ||
    !("full_name" in raw) ||
    !("username" in raw) ||
    !("birth_date" in raw) ||
    !("country" in raw) ||
    !("sports" in raw) ||
    !("accept_terms" in raw) ||
    !("accept_privacy" in raw)
  ) {
    return { ok: false, error: "Missing required fields" };
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
  const accept_terms = p.accept_terms;
  const accept_privacy = p.accept_privacy;
  const sports = p.sports;
  const objectives = p.objectives;

  if (
    typeof email !== "string" ||
    !isValidEmail(email) ||
    !isValidPassword(password) ||
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
    const timeSlots = (s as any).timeSlots;
    if (timeSlots !== undefined && timeSlots !== null) {
      if (!Array.isArray(timeSlots) || timeSlots.length > 7) {
        return { ok: false, error: "Invalid payload" };
      }
      for (const slot of timeSlots) {
        if (
          typeof slot !== "object" ||
          slot === null ||
          typeof (slot as any).weekday !== "number" ||
          (slot as any).weekday < 0 ||
          (slot as any).weekday > 6 ||
          typeof (slot as any).startHour !== "number" ||
          (slot as any).startHour < 0 ||
          (slot as any).startHour > 23 ||
          typeof (slot as any).endHour !== "number" ||
          (slot as any).endHour < 0 ||
          (slot as any).endHour > 23
        ) {
          return { ok: false, error: "Invalid payload" };
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      email,
      password,
      full_name,
      username,
      birth_date,
      country,
      city: typeof p.city === "string" ? p.city : null,
      language: typeof language === "string" ? language : "",
      height_cm: typeof height_cm === "number" ? height_cm : null,
      weight_kg: typeof weight_kg === "number" ? weight_kg : null,
      bio: typeof bio === "string" ? bio : null,
      avatar_url: typeof avatar_url === "string" ? avatar_url : null,
      discovery_source: typeof discovery_source === "string" ? discovery_source : null,
      accept_terms: accept_terms === true,
      accept_privacy: accept_privacy === true,
      interested_sports: interested_sports as string[],
      sports: sports.map((s: any) => ({
        sportId: s.sportId,
        level: s.level,
        practice: s.practice,
        timeSlots: s.timeSlots ?? [],
        levelOther: s.levelOther,
        practiceOther: s.practiceOther,
      })),
      objectives: objectives as string[],

function parseBirthDate(dateStr: string): { ok: true; year: number; month: number; day: number } | { ok: false; error: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return { ok: false, error: ERR.INVALID_DATE };
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12) return { ok: false, error: ERR.INVALID_DATE };
  if (day < 1 || day > 31) return { ok: false, error: ERR.INVALID_DATE };
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return { ok: false, error: ERR.INVALID_DATE };
  return { ok: true, year, month, day };
}

function isUnderage(year: number, month: number, day: number): boolean {
  const birth = new Date(Date.UTC(year, month - 1, day));
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age < MIN_AGE;
}
    },
  };
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return json(req, { ok: false, error: "Method not allowed" }, 405);
  }

  const bodyBytes = await req.arrayBuffer();
  if (bodyBytes.byteLength > MAX_BODY_BYTES) {
    return json(req, { ok: false, error: "Body too large" }, 413);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(req, { ok: false, error: "Invalid JSON" }, 400);
  }

  const origin = req.headers.get("origin") ?? "";
  const deviceIdHeader = req.headers.get("x-device-id") ?? "";
  const turnstileToken = req.headers.get("x-turnstile-token") ?? "";

  const isNativeLikely = deviceIdHeader.length > 0 && origin.length === 0;
  if (!isNativeLikely && turnstileToken.length === 0) {
    return json(req, { ok: false, error: ERR.CAPTCHA_REQUIRED }, 400);
  }

  if (turnstileToken.length > 0) {
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
    if (turnstileSecret.length === 0) {
      return json(req, { ok: false, error: ERR.INTERNAL }, 500);
    }
    const verifyResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { ok: false, error: ERR.INTERNAL }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const ip = clientIp(req);
  const device = deviceIdHeader || ip;

  const rateLimitWindow = parseInt(Deno.env.get("SIGNUP_RATE_LIMIT_WINDOW_SECS") ?? "3600", 10);
  const rateLimitPerIp = parseInt(Deno.env.get("SIGNUP_RATE_LIMIT_PER_IP") ?? "5", 10);
  const rateLimitPerDevice = parseInt(Deno.env.get("SIGNUP_RATE_LIMIT_PER_DEVICE") ?? "3", 10);

  const [ipResult, deviceResult] = await Promise.all([
    supabase.rpc("check_rate_limit", {
      p_key_type: "signup_ip",
      p_key_value: ip,
      p_limit: rateLimitPerIp,
      p_window_secs: rateLimitWindow,
    }),
    supabase.rpc("check_rate_limit", {
      p_key_type: "signup_device",
      p_key_value: device,
      p_limit: rateLimitPerDevice,
      p_window_secs: rateLimitWindow,
    }),
  ]);

  const ipLimited = ipResult.error || !(ipResult.data as { allowed?: boolean })?.allowed;
  const deviceLimited = deviceResult.error || !(deviceResult.data as { allowed?: boolean })?.allowed;

  if (ipLimited || deviceLimited) {
    return json(req, { ok: false, error: ERR.RATE_LIMITED }, 429);
  }

  const validation = isValidPayload(raw);
  if (!validation.ok) {
    return json(req, { ok: false, error: ERR.INVALID_PAYLOAD, detail: validation.error }, 400);
  }
  const data = validation.data;

  const allowedCountries = (Deno.env.get("ALLOWED_COUNTRIES") ?? "FR,BE,LU,CH,ES,DE,GB,IT,NL,AT,PT,SE,NO,DK,FI,PL,CZ,SK,HU,RO,BG,HR,SI,EE,LV,LT")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  if (!allowedCountries.includes(data.country.toUpperCase())) {
    return json(req, { ok: false, error: ERR.INVALID_PAYLOAD, detail: "country" }, 400);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
        username: data.username,
        country: data.country,
        language: data.language,
      },
    },
  });

  if (authError || !authData.user) {
    console.error("signup auth failure:", authError?.message ?? "unknown");
    return json(req, { ok: false, error: ERR.SIGNUP_FAILED }, 400);
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    full_name: data.full_name,
    username: data.username,
    avatar_url: data.avatar_url ?? null,
    bio: data.bio ?? null,
    country: data.country,
    city: data.city ?? null,
    language: data.language,
    interested_sports: data.interested_sports,
    is_public_profile: false,
    public_status: {},
    public_photos: [],
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    console.error("signup profile failure:", profileError.message ?? "unknown");
    return json(req, { ok: false, error: ERR.SIGNUP_FAILED }, 400);
  }

  const { error: profilePrivateError } = await supabase.from("profile_private").insert({
    user_id: userId,
    email: data.email,
    birth_date: data.birth_date,
    height_cm: data.height_cm ?? null,
    weight_kg: data.weight_kg ?? null,
    discovery_source: data.discovery_source ?? null,
    push_token: null,
  });

  if (profilePrivateError) {
    await supabase.auth.admin.deleteUser(userId);
    console.error("signup profile_private failure:", profilePrivateError.message ?? "unknown");
    return json(req, { ok: false, error: ERR.SIGNUP_FAILED }, 400);
  }

  await supabase.from("user_consents").upsert([
    { user_id: userId, document: "terms", version: termsVersion, accepted_at: new Date().toISOString(), analytics: false },
    { user_id: userId, document: "privacy", version: privacyVersion, accepted_at: new Date().toISOString(), analytics: false },
  ], { onConflict: "user_id,document" });

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
    const { error: objError } = await supabase.from("user_objectives").insert(objectivesRows);
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
});
  }

  const allowedLanguages = (Deno.env.get("ALLOWED_LANGUAGES") ?? "fr,en,de,it,es,nl,pt,pl,cs,sk,hu,ro,bg,hr,sr,sl,et,lv,lt,da,no,sv,fi")
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedLanguages.includes(data.language.toLowerCase())) {
    return json(req, { ok: false, error: ERR.INVALID_PAYLOAD, detail: "language" }, 400);
  }

  const storageDomain = Deno.env.get("STORAGE_PUBLIC_DOMAIN") ?? "";
  if (data.avatar_url && !isSafeStorageUrl(data.avatar_url, storageDomain)) {
    return json(req, { ok: false, error: ERR.INVALID_PAYLOAD, detail: "avatar_url_not_allowed" }, 400);
  }

  const parsedDate = parseBirthDate(data.birth_date);
  if (!parsedDate.ok) {
    return json(req, { ok: false, error: parsedDate.error }, 400);
  }
  if (isUnderage(parsedDate.year, parsedDate.month, parsedDate.day)) {
    return json(req, { ok: false, error: ERR.UNDERAGE }, 400);
  }

  if (!data.accept_terms || !data.accept_privacy) {
    return json(req, { ok: false, error: ERR.INVALID_PAYLOAD, detail: "consent_required" }, 400);
  }

  const termsVersion = Deno.env.get("TERMS_VERSION") ?? "1.0";
  const privacyVersion = Deno.env.get("PRIVACY_VERSION") ?? "1.0";
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: turnstileSecret,
        response: turnstileToken,
        remoteip: clientIp(req),
      }),
    });
    const verifyJson = (await verifyResp.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!verifyJson.success) {
      return json(req, { ok: false, error: ERR.CAPTCHA_INVALID }, 400);
    }
  }