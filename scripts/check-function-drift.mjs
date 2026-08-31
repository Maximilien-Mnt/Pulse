/**
 * Drift check: does the DEPLOYED signup edge function match the repository
 * source?
 *
 * Compares a SHA-256 of `supabase/functions/signup/index.ts` against the
 * manifest written by `scripts/record-deploy.mjs` when the function is
 * deployed. Run this in CI / before a release so a client/edge-function
 * contract drift (like the 2026-08-30 "optional time slots" incident) can
 * never silently ship again.
 *
 * Run:  node scripts/check-function-drift.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const sourcePath = resolve(repoRoot, "supabase/functions/signup/index.ts");
const manifestPath = resolve(repoRoot, "supabase/.deployed/signup.json");

const source = readFileSync(sourcePath, "utf8");
const sha = createHash("sha256").update(source).digest("hex");

console.log(`Local signup function sha256: ${sha}`);

if (!existsSync(manifestPath)) {
  console.error(
    "✘ No deploy manifest found at supabase/.deployed/signup.json.\n" +
      "  Deploy the function, then record it:\n" +
      "  node scripts/record-deploy.mjs --version <deployed_version>\n" +
      "  (or commit supabase/.deployed/signup.json after a deploy)."
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (manifest.sourceSha256 === sha) {
  console.log(
    `[OK] Deployed signup function (version ${manifest.version ?? "?"}) matches the repository source.`
  );
  process.exit(0);
}

console.error(
  `[FAIL] DEPLOY DRIFT: local supabase/functions/signup/index.ts does not match the deployed function.\n` +
    `  Local  sha: ${sha}\n` +
    `  Deployed sha (manifest v${manifest.version ?? "?"}, ${manifest.deployedAt ?? "unknown"}): ${manifest.sourceSha256 ?? "?"}\n\n` +
    `  Redeploy the function and record the deploy:\n` +
    `  supabase functions deploy signup --project-ref <ref> --no-verify-jwt\n` +
    `  node scripts/record-deploy.mjs --version <deployed_version>`
);
process.exit(1);