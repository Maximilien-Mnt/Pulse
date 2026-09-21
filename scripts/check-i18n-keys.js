/**
 * Dev helper — verifies that every t("...") key used by the event screens
 * exists in BOTH the `fr` and `en` dictionaries of lib/translations.ts.
 *
 * Usage: node scripts/check-i18n-keys.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const translations = fs.readFileSync(path.join(root, "lib/translations.ts"), "utf8");

const files = [
  "app/create/event/public.tsx",
  "app/create/event/private.tsx",
  "components/events/EventFormSections.tsx",
  "components/events/EventFormPickers.tsx",
  "components/events/EventHostingSelector.tsx",
  "components/events/EventIdentitySelector.tsx",
  "app/(tabs)/events/[eventId].tsx",
];

const keys = new Set();
for (const rel of files) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, "utf8");
  for (const m of src.matchAll(/\bt\(\s*"([^"]+)"/g)) keys.add(m[1]);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const missing = [];
for (const key of [...keys].sort()) {
  const re = new RegExp('"' + escape(key) + '"\\s*:', "g");
  const count = (translations.match(re) || []).length;
  if (count < 2) missing.push(`${key} (found ${count}/2)`);
}

console.log(`files scanned: ${files.length}`);
console.log(`keys used: ${keys.size}`);
console.log(`missing in fr/en: ${missing.length}`);
if (missing.length) console.log(missing.join("\n"));
process.exit(missing.length ? 1 : 0);
