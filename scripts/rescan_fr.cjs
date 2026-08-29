// Re-scans app/components/hooks/utils for hardcoded French UI strings
const fs = require("fs");
const path = require("path");

const dirs = ["app", "components", "hooks", "utils"];
const skip = /legal|node_modules|__tests__|design-system/;
const acc = /[À-ÿ]/;
const out = [];

function walk(p) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const fp = path.join(p, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith(".") && !skip.test(e.name)) walk(fp);
    } else if (/\.(ts|tsx)$/.test(e.name) && !skip.test(fp)) {
      const lines = fs.readFileSync(fp, "utf8").split("\n");
      lines.forEach((l, i) => {
        const ms = l.match(/["'`]([^"'`]{3,})["'`]/g) || [];
        for (const raw of ms) {
          const s = raw.slice(1, -1).trim();
          if (
            acc.test(s) &&
            !/className|font-|text-|bg-|rounded|border|px-|py-|w-|h-|flex|items|justify|gap|mt-|mb-|ml-|mr-|grid|shadow|opacity|tab-|dark:|\.\/|data-|type=|aria-|accessibilityLabel|message|description|subtitle|title:/.test(
              s
            )
          ) {
            out.push(fp.replace(/\\/g, "/") + ":" + (i + 1) + ": " + s);
          }
        }
      });
    }
  }
}
dirs.forEach(walk);
fs.writeFileSync(path.join(process.cwd(), "_scan_rescan.txt"), out.join("\n"));
console.log("Wrote _scan_rescan.txt");
console.log("Lines:", out.length);
