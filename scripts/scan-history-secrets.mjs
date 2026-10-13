#!/usr/bin/env node
/**
 * Historical secret scan.
 *
 * WHY THIS EXISTS
 * ---------------
 * `git grep -E '<pattern>' -- .` (the blocking step in ci.yml) inspects the
 * CURRENT working tree only. A credential that was committed and later deleted
 * is invisible to it, yet it remains readable in git history forever.
 *
 * The concrete case here: the Supabase anon key and PostHog token were
 * committed in `wrangler.toml` at 6eda9cc and removed in a later commit. The
 * values are still in history.
 *
 * WHAT THIS DOES
 * --------------
 * Walks every blob reachable from every ref and reports credentials matching
 * the JWT shape of a Supabase key. Only the `ref` claim is printed — never the
 * signature, never the full token — so the CI log does not become a second copy
 * of the secret.
 *
 * DELIBERATELY MOSTLY NON-BLOCKING:
 *   - The known-exposed key from 6eda9cc cannot be un-committed without
 *     rewriting published history. The mitigation is ROTATION, an out-of-band
 *     operational task.
 *   - It exits 1 only when it finds a JWT whose `ref` is NOT acknowledged, so a
 *     genuinely new historical leak fails the build while the known one stays
 *     visible as a reminder.
 *
 * Usage:  npm run check:history-secrets
 *         node scripts/scan-history-secrets.mjs --json
 */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

/**
 * Supabase project refs whose exposure is already acknowledged. The real fix is
 * rotation (see wrangler.toml), which cannot be verified from a repository.
 * REMOVE an entry once that key has actually been rotated — the scan will then
 * fail loudly if the old key is still present anywhere in history.
 */
const ACKNOWLEDGED_REFS = new Set([
  "eqrhjmuaaaarjxuprjaj", // committed in wrangler.toml at 6eda9cc; rotation pending
]);

// A Supabase JWT: HS256 header, base64url payload, base64url signature.
const JWT_RE = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

function git(args, input) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    input,
    shell: false,
  });
}

/** Decode a JWT payload's `ref` claim without verifying the signature. */
function decodeRef(jwt) {
  const payload = jwt.split(".")[1];
  if (!payload) return null;
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  try {
    const json = Buffer.from(padded, "base64").toString("utf8");
    const m = json.match(/"ref"\s*:\s*"([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function main() {
  const asJson = process.argv.includes("--json");

  // 1. Enumerate every object reachable from any ref, then classify them all in
  //    a single `--batch-check` call (fed on stdin) rather than one call per
  //    object, which matters on a real history.
  const objectList = git(["rev-list", "--objects", "--all"]);
  const shas = objectList
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim().split(/\s+/)[0]);

  const blobShas = [];
  const batchCheck = git(
    ["cat-file", "--batch-check=%(objectname) %(objecttype)"],
    shas.join("\n") + "\n",
  );
  for (const row of batchCheck.split("\n")) {
    const [sha, type] = row.trim().split(/\s+/);
    if (type === "blob") blobShas.push(sha);
  }

  // 2. Read all blob contents in a single batch and scan them.
  const contents = git(["cat-file", "--batch"], blobShas.join("\n") + "\n");

  const byRef = new Map();
  let totalMatches = 0;

  for (const match of contents.matchAll(JWT_RE)) {
    totalMatches += 1;
    const ref = decodeRef(match[0]) ?? "<undecodable>";
    byRef.set(ref, (byRef.get(ref) ?? 0) + 1);
  }

  const unacknowledged = [...byRef.keys()].filter(
    (r) => !ACKNOWLEDGED_REFS.has(r),
  );

  if (asJson) {
    process.stdout.write(
      JSON.stringify(
        {
          blobsScanned: blobShas.length,
          jwtMatches: totalMatches,
          refs: Object.fromEntries(byRef),
          unacknowledged,
        },
        null,
        2,
      ) + "\n",
    );
    process.exitCode = unacknowledged.length > 0 ? 1 : 0;
    return;
  }

  console.log(
    `[history] scanned ${blobShas.length} blobs across all refs; ` +
      `${totalMatches} Supabase-JWT-shaped match(es).`,
  );

  if (byRef.size === 0) {
    console.log("[history] PASS - no Supabase key material anywhere in history.");
    return;
  }

  for (const [ref, count] of [...byRef.entries()].sort()) {
    const known = ACKNOWLEDGED_REFS.has(ref);
    console.log(
      `[history] ${known ? "KNOWN (rotation pending)" : "UNACKNOWLEDGED"} ` +
        `project ref \`${ref}\` - ${count} occurrence(s) in history.`,
    );
  }

  console.log(
    "\n[history] A credential in git history cannot be removed by deleting the\n" +
      "          file — every clone and fork already has it. The only real\n" +
      "          remediation is ROTATION. See wrangler.toml for the checklist.\n",
  );

  if (unacknowledged.length > 0) {
    console.error(
      `[history] FAIL - ${unacknowledged.length} project ref(s) in history are not ` +
        "acknowledged in scripts/scan-history-secrets.mjs.\n" +
        "        Either rotate the key, or add the ref to ACKNOWLEDGED_REFS with a\n" +
        "        comment explaining why it is accepted.",
    );
    process.exit(1);
  }

  console.log(
    "[history] PASS - only already-acknowledged refs found. Remember: rotate them.",
  );
}

main();
