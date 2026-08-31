/**
 * Smoke test for the LIVE signup edge function.
 *
 * Sends the exact payload shapes the app now produces (empty timeSlots /
 * empty sports array — the "availability optional" and "no sport" paths)
 * with an UNDERAGE birth date. The function must reject with `UNDERAGE`
 * (403). If it returns INVALID_PAYLOAD instead, the deployed function is
 * STALE and doesn't match the repository source — run:
 *
 *   supabase functions deploy signup --project-ref <ref> --no-verify-jwt
 *
 * Underage payloads never create users, so this is safe to run against
 * production.
 *
 * Run:  node scripts/smoke-signup.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function loadEnv() {
  const raw = readFileSync(resolve(repoRoot, ".env"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function failure(message) {
  console.error(`\n[FAIL] SMOKE TEST FAILED: ${message}\n`);
  process.exit(1);
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) failure("Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");

const endpoint = `${url}/functions/v1/signup`;
const MIN_AGE_CONFIRM = "UNDERAGE"; // stable machine code (see functions/signup/index.ts)

/** Build a payload guaranteed to pass validation but be rejected by age. */
function underagePayload({ noSport }) {
  return {
    email: `smoke-${Date.now()}@example.com`,
    password: "SmokeTest123!",
    full_name: "Smoke Test",
    username: `smoke${Date.now() % 100000}`,
    birth_date: "2012-01-01", // 14 years old → UNDERAGE
    country: "LU",
    city: "Luxembourg",
    language: "fr",
    interested_sports: noSport ? [] : ["football"],
    sports: noSport
      ? []
      : [{ sportId: "football", level: "Débutant", practice: "Loisir", timeSlots: [] }],
    objectives: noSport ? [] : ["Se défouler"],
  };
}

async function probe(label, payload) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const pass =
    res.status === 403 &&
    body &&
    body.ok === false &&
    body.error === MIN_AGE_CONFIRM;
  console.log(
    `${pass ? "[OK]" : "[FAIL]"} ${label}: HTTP ${res.status} -> ${JSON.stringify(body)}`
  );
  return pass;
}

console.log(`Smoke-testing live signup endpoint: ${endpoint}\n`);

const a = await probe("sport with empty timeSlots (availability optional)", underagePayload({ noSport: false }));
const b = await probe("no-sport path (empty sports array)", underagePayload({ noSport: true }));

if (a && b) {
  console.log("\n[OK] LIVE signup function matches the repository contract (optional timeSlots + no-sport valid).");
  process.exit(0);
}
failure(
  "The deployed function is stale - it still rejects these payloads.\n" +
    "  Deploy the current source:\n" +
    "  supabase functions deploy signup --project-ref <ref> --no-verify-jwt"
);

// Keep a hash helper exported so CI can double check the source bundle.
export function sha256Of(text) {
  return createHash("sha256").update(text).digest("hex");
}