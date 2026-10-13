#!/usr/bin/env node
/**
 * Dependency-audit regression gate.
 *
 * WHY THIS EXISTS
 * ---------------
 * `npm audit --audit-level=high` is unusable as a merge gate in this project.
 * Expo SDK 54 declares its entire build toolchain (Metro, @expo/cli, PostCSS,
 * node-forge, image-size, brace-expansion) as REGULAR dependencies of `expo`,
 * not devDependencies. So:
 *
 *   - `npm audit --omit=dev` does NOT give "what ships to users" — it still
 *     reports ~50 HIGH findings, because the bundler is a prod dependency.
 *   - `npm audit` alone reports ~77, all build-time/DoS-class advisories whose
 *     only npm-proposed fixes are multi-major upgrades (expo@44, tailwindcss@4,
 *     react-native@0.87, jest@30) that break SDK 54.
 *
 * A gate that always fails trains people to ignore it. A gate that always
 * passes catches nothing. So we gate on REGRESSION. `.audit-baseline.json`
 * records the advisories consciously accepted, with severity and the packages
 * they reach. This fails when:
 *
 *   1. A CRITICAL advisory appears anywhere (never baselined), OR
 *   2. An advisory appears that is not in the baseline (new exposure), OR
 *   3. A baselined advisory gets WORSE (e.g. moderate -> high).
 *
 * Shrinking the backlog is normal work: delete the resolved entry from
 * `.audit-baseline.json` in the same commit that upgrades the dependency.
 *
 * Usage:  npm run check:audit            (gate; exit 0 = no regression)
 *         npm run check:audit -- --update  (print a fresh baseline to stdout)
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const baselinePath = resolve(repoRoot, ".audit-baseline.json");

const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

/** Run `npm audit --json` and return the parsed report. */
function runAudit() {
  // On Windows npm is `npm.cmd`; execFileSync does not consult PATHEXT, so a
  // bare "npm" fails with ENOENT there. Resolve the real executable name.
  const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

  let stdout;
  try {
    stdout = execFileSync(npmBin, ["audit", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
      // Needed on Windows: without a shell, spawning a .cmd requires this.
      shell: process.platform === "win32",
    });
  } catch (err) {
    // npm exits 1 when it finds vulnerabilities; the payload is still on stdout.
    if (err.stdout) {
      stdout = err.stdout;
    } else {
      console.error(
        `[audit] npm audit could not run. Is the registry reachable?\n  ${err.message}`,
      );
      process.exit(2);
    }
  }

  try {
    return JSON.parse(stdout);
  } catch {
    console.error(
      "[audit] Could not parse `npm audit --json` output.\n" +
        "        If npm emitted a non-JSON error (offline, proxy, auth), fix that first.",
    );
    process.exit(2);
  }
}

/** Collapse npm's per-package report into one record per GHSA advisory. */
function collectAdvisories(report) {
  const byId = new Map();
  const vulnerabilities = report?.vulnerabilities ?? {};

  for (const [pkg, detail] of Object.entries(vulnerabilities)) {
    // `via` holds either a package name (string = transitive) or the advisory
    // object itself. Only the objects carry a GHSA URL.
    for (const entry of detail.via ?? []) {
      if (typeof entry === "string") continue;
      const id = String(entry.url ?? "").split("/").pop();
      if (!id) continue;

      const existing = byId.get(id);
      const severity = String(entry.severity ?? "unknown").toLowerCase();
      const packages = new Set(existing?.packages ?? []);
      packages.add(pkg);
      for (const node of detail.nodes ?? []) {
        packages.add(String(node).replace(/^node_modules\//, ""));
      }

      byId.set(id, {
        severity,
        title: entry.title ?? "",
        packages: [...packages].sort(),
      });
    }
  }
  return byId;
}

function loadBaseline() {
  let raw;
  try {
    raw = readFileSync(baselinePath, "utf8");
  } catch {
    console.error(
      `[audit] Missing baseline: ${baselinePath}\n` +
        "        Generate one with: npm run check:audit -- --update",
    );
    process.exit(2);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[audit] Baseline is not valid JSON: ${err.message}`);
    process.exit(2);
  }
}

function main() {
  const shouldUpdate = process.argv.includes("--update");

  const report = runAudit();
  const current = collectAdvisories(report);
  const counts = report?.metadata?.vulnerabilities ?? {};

  console.log(
    `[audit] npm audit totals: ${counts.total ?? 0} total ` +
      `(${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ` +
      `${counts.moderate ?? 0} moderate)`,
  );
  console.log(`[audit] distinct advisories: ${current.size}`);

  if (shouldUpdate) {
    const sorted = {};
    for (const id of [...current.keys()].sort()) sorted[id] = current[id];
    for (const [id, v] of Object.entries(sorted)) {
      if (v.severity === "critical") {
        console.error(
          `[audit] Refusing to baseline CRITICAL advisory ${id} (${v.title}).\n` +
            "        Fix the dependency instead of accepting it.",
        );
        process.exit(2);
      }
    }
    process.stdout.write(JSON.stringify(sorted, null, 2) + "\n");
    console.error(
      `[audit] Baseline preview on stdout (${Object.keys(sorted).length} advisories).\n` +
        "        Review, then redirect to .audit-baseline.json to accept.",
    );
    return;
  }

  const baseline = loadBaseline();

  const criticals = [...current.entries()].filter(
    ([, v]) => v.severity === "critical",
  );
  const newAdvisories = [...current.entries()].filter(([id]) => !baseline[id]);
  const worsened = [...current.entries()].filter(([id, v]) => {
    const prev = baseline[id];
    if (!prev) return false;
    return (
      (SEVERITY_RANK[v.severity] ?? -1) > (SEVERITY_RANK[prev.severity] ?? -1)
    );
  });
  // Informational only, so the file does not silently accumulate stale rows.
  const resolved = Object.keys(baseline).filter((id) => !current.has(id));

  if (resolved.length > 0) {
    console.log(
      `[audit] ${resolved.length} baselined advisory/advisories no longer reported ` +
        `(safe to delete from .audit-baseline.json): ${resolved.join(", ")}`,
    );
  }

  if (
    criticals.length === 0 &&
    newAdvisories.length === 0 &&
    worsened.length === 0
  ) {
    console.log(
      `[audit] PASS - no new advisories, no criticals, nothing worsened ` +
        `(${current.size} known advisories accepted in baseline).`,
    );
    return;
  }

  console.error("\n[audit] FAIL - dependency audit regression detected.\n");

  if (criticals.length > 0) {
    console.error("CRITICAL advisories (never acceptable):");
    for (const [id, v] of criticals) {
      console.error(`  ${id}  ${v.title}`);
      console.error(`      packages: ${v.packages.join(", ")}`);
    }
    console.error("");
  }

  if (newAdvisories.length > 0) {
    console.error("NEW advisories not present in .audit-baseline.json:");
    for (const [id, v] of newAdvisories) {
      console.error(`  [${v.severity}] ${id}  ${v.title}`);
      console.error(`      packages: ${v.packages.join(", ")}`);
    }
    console.error("");
  }

  if (worsened.length > 0) {
    console.error("Advisories that got MORE severe since the baseline:");
    for (const [id, v] of worsened) {
      console.error(
        `  ${id}: ${baseline[id].severity} -> ${v.severity}  ${v.title}`,
      );
    }
    console.error("");
  }

  console.error(
    "To resolve:\n" +
      "  1. Upgrade the dependency (prefer an `overrides` entry in package.json so\n" +
      "     a leaf security fix does not force a multi-major SDK bump).\n" +
      "  2. If genuinely not exploitable here, record the decision by adding it to\n" +
      "     .audit-baseline.json, with the reasoning in the PR description.\n" +
      "     Never baseline a CRITICAL.\n",
  );
  process.exit(1);
}

main();
