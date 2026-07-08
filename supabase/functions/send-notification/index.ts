import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type NotificationPayload = {
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const payload = (await req.json()) as NotificationPayload;
  const { user_id, type, title, body, data = {} } = payload;

  if (!user_id || !type || !title) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", user_id)
    .maybeSingle();

  await supabase.from("notifications").insert({
    user_id,
    type,
    title,
    body,
    data,
  });

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

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
