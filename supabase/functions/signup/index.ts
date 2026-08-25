import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MIN_AGE = 16;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
      timeSlots: { weekday: number; startHour: number; endHour: number }[];
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
    password.length < 8 ||
    typeof full_name !== "string" ||
    full_name.trim().length === 0 ||
    typeof username !== "string" ||
    !/^[a-zA-Z0-9_-]+$/.test(username) ||
    username.length < 3 ||
    username.length > 30 ||
    typeof birth_date !== "string" ||
    typeof country !== "string" ||
    country.trim().length === 0
  ) {
    return { ok: false, error: "Invalid payload" };
  }

  if (!Array.isArray(interested_sports) || !Array.isArray(sports) || !Array.isArray(objectives)) {
    return { ok: false, error: "Invalid payload" };
  }

  if (!Array.isArray(sports) || sports.length === 0) {
    return { ok: false, error: "Invalid payload" };
  }

  for (const s of sports) {
    if (
      typeof s !== "object" ||
      s === null ||
      typeof (s as any).sportId !== "string" ||
      typeof (s as any).level !== "string" ||
      typeof (s as any).practice !== "string" ||
      !Array.isArray((s as any).timeSlots) ||
      typeof (s as any).timeSlots[0]?.weekday !== "number" ||
      typeof (s as any).timeSlots[0]?.startHour !== "number" ||
      typeof (s as any).timeSlots[0]?.endHour !== "number"
    ) {
      return { ok: false, error: "Invalid payload" };
    }
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

  if (typeof p.city === "string") parsed.city = p.city;
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
  const daysInMonth = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await req.json();
    const validation = isValidPayload(raw);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ ok: false as const, error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = validation.data;

    if (!isValidDate(data.birth_date)) {
      return new Response(
        JSON.stringify({ ok: false as const, error: "INVALID_DATE" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const age = calculateAge(data.birth_date);
    if (age < MIN_AGE) {
      return new Response(
        JSON.stringify({ ok: false as const, error: "UNDERAGE" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({
          ok: false as const,
          error: authError?.message ?? "Auth signup failed",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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
      is_public_profile: true,
      public_status: {},
      public_photos: [],
      push_token: null,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({
          ok: false as const,
          error: profileError.message,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sportsRows = data.sports.map((s) => ({
      user_id: userId,
      sport_id: s.sportId,
      level: s.level,
      practice: s.practice,
      time_slots: s.timeSlots.map((slot) => ({
        weekday: slot.weekday,
        startHour: slot.startHour,
        endHour: slot.endHour,
      })),
    }));

    const { error: sportsError } = await supabase.from("user_sports").insert(sportsRows);
    if (sportsError) {
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({
          ok: false as const,
          error: sportsError.message,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const objectivesRows = data.objectives.map((o) => ({
      user_id: userId,
      objective: o,
    }));

    const { error: objError } = await supabase
      .from("user_objectives")
      .insert(objectivesRows);

    if (objError) {
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({
          ok: false as const,
          error: objError.message,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true as const,
        userId,
        email: data.email,
        needsConfirmation: !authData.session,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false as const,
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
