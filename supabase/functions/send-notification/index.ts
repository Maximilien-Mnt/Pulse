import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Only these notification kinds may be created through this function.
// Arbitrary `type` values previously allowed phishing-style forgeries
// (e.g. fake "event_cancelled" notices to any user).
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

  // Authenticated-only: verify the caller's JWT and never trust a
  // client-supplied sender. Deploy with verify_jwt=true as well so the
  // gateway rejects missing/invalid tokens before this code runs.
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
  // Recipients must not receive executable push payloads.
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return json({ error: "Invalid data" }, 400);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", user_id)
    .maybeSingle();

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

  const token = profile?.push_token;
  if (token) {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data: { type, ...data },
        sound: "default",
      }),
    });
  }

  return json({ ok: true });
});

