const fs = require("fs");
const path = require("path");
const p = require("path");
const tsPath = p.join(process.cwd(),"lib/translations.ts");
let ts = fs.readFileSync(tsPath,"utf8");
const fr = require("./patch-fr.json");
const en = require("./patch-en.json");
function esc(s){return s.replace(/["\\]/g,"\\$&");}
const frLines = Object.entries(fr).map(([k,v])=>`    "${k}": "${esc(v)}",`).join("\n");
const enLines = Object.entries(en).map(([k,v])=>`    "${k}": "${esc(v)}",`).join("\n");
const a = "  },\n};\n\nexport type TranslationKey = keyof typeof translations.fr;";
const idx = ts.lastIndexOf(a);
if(idx===-1){throw new Error("anchor not found");}
const before = ts.slice(0,idx);
const after = ts.slice(idx+a.length);
ts = before + "\n" + frLines + "\n" + after;
const enClose = "  }";
const enIdx = ts.lastIndexOf(enClose);
const enBefore = ts.slice(0,enIdx);
const enAfter = ts.slice(enIdx);
ts = enBefore + "\n" + enLines + "\n" + enAfter;
fs.writeFileSync(tsPath,ts);
console.log("patched", Object.keys(en).length);
