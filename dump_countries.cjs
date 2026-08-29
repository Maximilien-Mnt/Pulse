// Temporary helper: dump COUNTRIES codes+french labels to a file.
const fs = require("fs");
const src = fs.readFileSync("utils/countries.ts", "utf8");
const block = src.slice(src.indexOf("export const COUNTRIES"), src.indexOf("];"));
const rows = [...block.matchAll(/\{ code: "([A-Z]{2})", label: "([^"]+)" \}/g)].map((m) => [m[1], m[2]]);
fs.writeFileSync("_countries_fr.txt", rows.map(([c, f]) => `${c}\t${f}`).join("\n"));
console.log("rows", rows.length);