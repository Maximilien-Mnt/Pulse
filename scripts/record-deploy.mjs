/**
 * Record a successful signup-function deploy into the drift-check manifest.
 *
 * Call right after deploying supabase/functions/signup/index.ts:
 *
 *   supabase functions deploy signup --project-ref <ref> --no-verify-jwt
 *   node scripts/record-deploy.mjs --version <deployed_version> [--ref <project_ref>]
 *
 * Writes supabase/.deployed/signup.json consumed by
 * scripts/check-function-drift.mjs.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const args = process.argv.slice(2);
function readArg(name) {
  const inline = args.find((a) => a.startsWith(`${name}=`));
  if (inline) return inline.split("=")[1];
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const version = readArg("--version");
const ref =
  readArg("--ref") ??
  readPackageJson().supabase?.projectRef ??
  "unknown";

if (!version) {
  console.error("Usage: node scripts/record-deploy.mjs --version <deployed_version> [--ref <project_ref>]");
  process.exit(1);
}

const source = readFileSync(resolve(repoRoot, "supabase/functions/signup/index.ts"), "utf8");
const sourceSha256 = createHash("sha256").update(source).digest("hex");

const dir = resolve(repoRoot, "supabase/.deployed");
mkdirSync(dir, { recursive: true });

const manifest = {
  function: "signup",
  ref,
  version: Number(version) || version,
  sourceSha256,
  deployedAt: new Date().toISOString(),
};

writeFileSync(resolve(dir, "signup.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Manifest recorded: supabase/.deployed/signup.json`);
console.log(`  function: signup`);
console.log(`  ref:      ${ref}`);
console.log(`  version:  ${manifest.version}`);
console.log(`  sha256:   ${sourceSha256}`);

function readPackageJson() {
  try {
    return JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
  } catch {
    return {};
  }
}