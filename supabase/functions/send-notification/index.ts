import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TIMEOUT_MS = 5000;

// Only these notification kinds may be created through this function.
const ALLOWED_TYPES = new Set([
  "event_notification",
  "event_invitation",
  "event_cancelled",
  "event_updated",
  "club_invitation",
  "club_updated",
  "club_member_left",
  "club_member_removed",
  "event_participant_removed",
  "join_request",
  "message",
]);

const MAX_TITLE = 120;
const MAX_BODY = 500;
const MAX_DATA_KEYS = 20;

type NotificationPayload = {
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Authenticated-only: verify the caller's JWT.
  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase server configuration is missing" }, 503);
  }

  const caller = createClient(supabaseUrl, anonKey || serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await caller.auth.getUser();
  const callerId = callerData?.user?.id;
  if (callerError || !callerId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // --- Persistent rate limiting (per caller) via RPC ---
  const rateLimitWindow = parseInt(Deno.env.get("NOTIFY_RATE_LIMIT_WINDOW_SECS") ?? "3600", 10);
  const rateLimitPerCaller = parseInt(Deno.env.get("NOTIFY_RATE_LIMIT_PER_CALLER") ?? "20", 10);

  const rateResult = await supabase.rpc("check_rate_limit", {
    p_key_type: "notify_user",
    p_key_value: callerId,
    p_limit: rateLimitPerCaller,
    p_window_secs: rateLimitWindow,
  });

  if (rateResult.error || !(rateResult.data as { allowed?: boolean })?.allowed) {
    return json({ error: "Rate limited" }, 429);
  }

  let payload: NotificationPayload;
  try {
    payload = (await req.json()) as NotificationPayload;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const { user_id, type, title, body, data = {} } = payload;

  if (!user_id || !type || !title) {
    return json({ error: "Missing required fields" }, 400);
  }
  if (!ALLOWED_TYPES.has(type)) {
    return json({ error: "Invalid notification type" }, 400);
  }
  if (typeof title !== "string" || title.length > MAX_TITLE) {
    return json({ error: "Invalid title" }, 400);
  }
  if (typeof body !== "string" || body.length > MAX_BODY) {
    return json({ error: "Invalid body" }, 400);
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return json({ error: "Invalid data" }, 400);
  }
  if (Object.keys(data).length > MAX_DATA_KEYS) {
    return json({ error: "Too many data keys" }, 400);
  }

  // --- Authorization: caller must be able to notify user_id ---
  // Same rules as notify_user RPC (Phase 1):
  // 1. Target must exist and not be deleted
  // 2. No bidirectional blocking between caller and target
  // 3. Caller cannot notify themselves (self-notifications are allowed? Let's allow for now)
  const { data: targetUser, error: targetError } = await supabase
    .from("auth.users")
    .select("id")
    .eq("id", user_id)
    .maybeSingle();

  if (targetError || !targetUser) {
    return json({ error: "Target user not found" }, 404);
  }

  // Check bidirectional blocking
  const { data: blocked } = await supabase
    .from("blocked_users")
    .select("id")
    .or(`and(blocker_id.eq.${callerId},blocked_id.eq.${user_id}),and(blocker_id.eq.${user_id},blocked_id.eq.${callerId})`)
    .maybeSingle();

  if (blocked) {
    return json({ error: "Users are blocked" }, 403);
  }

  // --- Insert notification (type preserved, data spread after) ---
  const { error: insertError } = await supabase.from("notifications").insert({
    user_id,
    type,
    title,
    body,
    data,
  });
  if (insertError) {
    return json({ error: "Could not create notification" }, 500);
  }

  // --- Send Expo push with timeout and error handling ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", user_id)
    .maybeSingle();

  const token = profile?.push_token;
  if (token) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXPO_TIMEOUT_MS);

    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: token,
          title,
          body,
          // type first, then data spread — type is never overwritten
          data: { type, ...data },
          sound: "default",
        }),
        signal: controller.signal,
      });
    } catch (expoErr) {
      // Log but don't fail — notification already stored in DB
      console.error("Expo push failed:", expoErr instanceof Error ? expoErr.message : String(expoErr));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return json({ ok: true });
});

