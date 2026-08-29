// Verify FR/EN key parity in lib/translations.ts (read-only).
const fs = require("fs");
const c = fs.readFileSync("lib/translations.ts", "utf8");

const frStart = c.indexOf("fr: {");
const frEnd = c.indexOf("  en: {");
const frBlock = c.slice(frStart, frEnd);
const frKeys = [...frBlock.matchAll(/"([^"]+)":/g)].map((m) => m[1]);

const enStart = c.indexOf("en: {");
const enEnd = c.indexOf("};", enStart);
const enBlock = c.slice(enStart, enEnd);
const enKeys = [...enBlock.matchAll(/"([^"]+)":/g)].map((m) => m[1]);

const onlyFr = frKeys.filter((k) => !enKeys.includes(k));
const onlyEn = enKeys.filter((k) => !frKeys.includes(k));
const dupFr = frKeys.filter((k, i) => frKeys.indexOf(k) !== i);
const dupEn = enKeys.filter((k, i) => enKeys.indexOf(k) !== i);

console.log("FR keys:", frKeys.length, "| EN keys:", enKeys.length);
console.log("onlyFr:", onlyFr.length, onlyFr.slice(0, 20).join(", "));
console.log("onlyEn:", onlyEn.length, onlyEn.slice(0, 20).join(", "));
console.log("dupFr:", dupFr.length, dupFr.slice(0, 10).join(", "));
console.log("dupEn:", dupEn.length, dupEn.slice(0, 10).join(", "));

if (onlyFr.length || onlyEn.length || dupFr.length || dupEn.length) process.exit(1);
console.log("PARITY OK");