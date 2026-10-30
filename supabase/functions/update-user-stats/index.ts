import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { secretsEqual } from "../_shared/cors.ts";

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

  // Internal job only: require the cron secret. No CORS headers are sent so
  // browsers cannot drive this expensive full-table recompute cross-origin.
  // Deploy with verify_jwt=true (no JWT is accepted here — secret only).
  const expectedSecret = Deno.env.get("STATS_JOB_SECRET") ?? "";
  const received = req.headers.get("x-job-secret") ?? "";
  if (!expectedSecret || !received || !secretsEqual(received, expectedSecret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { error } = await supabase.rpc("refresh_all_user_stats");
  if (error) {
    // No N+1 fallback: the RPC must exist. Fail fast instead of O(N) per-profile queries.
    return json({ error: "stats_rpc_unavailable", detail: error.message }, 500);
  }

  return json({ ok: true });
});
