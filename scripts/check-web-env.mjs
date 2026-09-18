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
 * Warn only (optional at build time): POSTHOG_PROJECT_TOKEN, POSTHOG_HOST, EXPO_PUBLIC_APP_SCHEME
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
const OPTIONAL = ["POSTHOG_PROJECT_TOKEN", "POSTHOG_HOST", "EXPO_PUBLIC_APP_SCHEME"];

const missingRequired = REQUIRED.filter((k) => !process.env[k]);

if (missingRequired.length > 0) {
  console.error("\n=============================================");
  console.error("  WEB BUILD ABORTED — missing environment variables:");
  for (const key of missingRequired) {
    console.error(`    - ${key}`);
  }
  console.error(
    "  These are inlined into the web bundle at build time. Set them in the"
  );
  console.error(
    "  hosting provider's build environment (Cloudflare Pages > Settings >"
  );
  console.error(
    "  Variables and Secrets) or in a local .env file, then rebuild."
  );
  console.error("=============================================\n");
  process.exit(1);
}

const missingOptional = OPTIONAL.filter((k) => !process.env[k]);
if (missingOptional.length > 0) {
  console.warn("[build:web] Optional env vars not set (may degrade features):");
  for (const key of missingOptional) {
    console.warn(`    - ${key}`);
  }
}

console.log("[build:web] Environment check passed. Starting web export…");
