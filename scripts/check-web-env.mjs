/**
 * Build-time guard for the web export.
 *
 * Expo inlines EXPO_PUBLIC_* variables into the JS bundle at build time.
 * If the Supabase vars are missing, the bundle is built with empty strings,
 * `@supabase/supabase-js` throws "supabaseUrl is required" when the bundle is
 * evaluated, and the deployed site renders a blank page. This script makes the
 * build fail instead, with an explicit error.
 *
 * Used by `npm run build:web` (Cloudflare Pages build command).
 *
 * Fatal (build must stop): EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
 * Warn only (optional at build time): EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN,
 *   EXPO_PUBLIC_POSTHOG_HOST, POSTHOG_PROJECT_TOKEN, POSTHOG_HOST, EXPO_PUBLIC_APP_SCHEME
 */

// This script runs as a plain Node process, so it does not automatically get
// the values from the local .env file (unlike Expo, which loads it during the
// actual export). Load it explicitly so local/CI builds match what Expo sees.
// No-op when .env is absent (e.g. on CI, where vars come from secrets).
try {
  process.loadEnvFile();
} catch {
  // .env missing is fine — vars may be provided by the environment instead.
}

const REQUIRED = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"];
const OPTIONAL = [
  "EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN",
  "EXPO_PUBLIC_POSTHOG_HOST",
  "POSTHOG_PROJECT_TOKEN",
  "POSTHOG_HOST",
  "EXPO_PUBLIC_APP_SCHEME",
];

// Values copied verbatim from .env.example — committed placeholders, not real
// credentials. Treat them as missing so a build with an unedited .env fails
// here instead of shipping a bundle pointed at a fake project.
const PLACEHOLDER_PATTERNS = [
  /your-project/i,
  /your-anon-key/i,
  /your-posthog-project-token/i,
  /phc_your_project_token_here/i,
  /example\.com/i,
];

function getStatus(key) {
  const raw = process.env[key];
  if (!raw || raw.trim() === "") return { state: "missing", reason: "unset or empty" };
  const value = raw.trim();
  if (PLACEHOLDER_PATTERNS.some((re) => re.test(value))) {
    return { state: "missing", reason: "still holds the .env.example placeholder" };
  }
  return { state: "present", value };
}

function describeBuildContext() {
  // Cloudflare Pages sets CF_PAGES=1 on the build container.
  if (process.env.CF_PAGES === "1" || process.env.CLOUDFLARE_PAGES === "1") {
    return "Cloudflare Pages build container (CF_PAGES=1)";
  }
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") return "CI runner";
  return "local machine (.env file + process env)";
}

function isValidSupabaseUrl(url) {
  // Managed Supabase projects are always https://<ref>.supabase.co.
  // Self-hosted instances use a custom https URL — accept any https URL but
  // reject http / bare hostnames that indicate a copy-paste mistake.
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) || /^https:\/\/[^/\s]+\.[^/\s]+/i.test(url);
}

function isValidAnonKey(key) {
  // The publishable/anon key is a JWT (three base64url segments). The legacy
  // sb_publishable_* format is also accepted.
  const trimmed = key.trim();
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(trimmed)) return true;
  const parts = trimmed.split(".");
  return parts.length === 3 && parts.every((p) => p.length >= 8 && /^[A-Za-z0-9_-]+$/.test(p));
}

const context = describeBuildContext();

// --- Required vars: missing, placeholder, or malformed all abort the build.
const requiredProblems = [];
for (const key of REQUIRED) {
  const status = getStatus(key);
  if (status.state === "missing") {
    requiredProblems.push({ key, reason: status.reason });
    continue;
  }
  if (key === "EXPO_PUBLIC_SUPABASE_URL" && !isValidSupabaseUrl(status.value)) {
    requiredProblems.push({ key, reason: `malformed URL "${status.value.slice(0, 40)}…" (expected https://<ref>.supabase.co)` });
  }
  if (key === "EXPO_PUBLIC_SUPABASE_ANON_KEY" && !isValidAnonKey(status.value)) {
    requiredProblems.push({ key, reason: "malformed value (expected a JWT anon key or sb_publishable_* key)" });
  }
}

if (requiredProblems.length > 0) {
  console.error("\n=============================================");
  console.error("  WEB BUILD ABORTED — missing environment variables:");
  for (const { key, reason } of requiredProblems) {
    console.error(`    - ${key} (${reason})`);
  }
  console.error("");
  console.error(`  Build context: ${context}.`);
  console.error("  These are inlined into the web bundle at build time, so a");
  console.error("  build without them ships a blank page. Set them, then rebuild:");
  console.error("    Cloudflare Pages > pulse > Settings > Variables and Secrets");
  console.error("      > Production AND Preview > Save > Retry deployment.");
  console.error("  Or provide them via a local .env file (see .env.example).");
  console.error("=============================================\n");
  process.exit(1);
}

const missingOptional = OPTIONAL.filter((k) => getStatus(k).state === "missing");

if (missingOptional.length > 0) {
  console.warn("[build:web] Optional env vars not set (may degrade features):");
  for (const key of missingOptional) {
    console.warn(`    - ${key}`);
  }
}

const presentOptional = OPTIONAL.length - missingOptional.length;
console.log(
  `[build:web] Environment check passed (${REQUIRED.length}/${REQUIRED.length} required, ` +
    `${presentOptional}/${OPTIONAL.length} optional) on ${context}. Starting web export…`
);

