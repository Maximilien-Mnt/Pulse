// Check that every t("...")/translate("...") key used in code exists in translations.ts.
const fs = require("fs");
const path = require("path");

const c = fs.readFileSync("lib/translations.ts", "utf8");
const frBlock = c.slice(c.indexOf("fr: {"), c.indexOf("  en: {"));
const frKeys = new Set([...frBlock.matchAll(/"([^"]+)":/g)].map((m) => m[1]));

const dirs = ["app", "components", "hooks", "utils"];
const skip = /legal|node_modules|__tests__/;
const used = new Map();
const missing = new Set();

function walk(p) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const fp = path.join(p, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith(".") && !skip.test(e.name)) walk(fp);
    } else if (/\.(tsx|ts)$/.test(e.name) && !skip.test(fp)) {
      const src = fs.readFileSync(fp, "utf8");
      // t("key") or t('key') or translate("key") and t(\`...\`) variants
      for (const m of src.matchAll(/\b(?:t|translate)\s*\(\s*["'`]([^"'`]+)["'`]/g)) {
        const key = m[1];
        // Skip dynamic/templated lookups
        if (/\$\{|[{}]/.test(key)) continue;
        used.set(key, (used.get(key) ?? 0) + 1);
        if (!frKeys.has(key)) missing.add(key);
      }
      // Also handle t("prefix." + x) dynamic — skip those.
    }
  }
}
dirs.forEach(walk);

const sortedUsed = [...used.entries()].sort((a, b) => a[0].localeCompare(b[0]));
console.log("Distinct t() keys used:", sortedUsed.length);
const sortedMissing = [...missing].sort();
console.log("MISSING from translations.ts:", sortedMissing.length);
console.log(sortedMissing.join("\n"));
console.log("---- used keys ----");
console.log(sortedUsed.map(([k, n]) => `${k} (${n})`).join("\n"));
if (missing.size) process.exit(1);