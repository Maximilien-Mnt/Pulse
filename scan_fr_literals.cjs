// Temporary scanner: lists French-accented quoted string literals in app/components/hooks/utils (excluding legal).
const fs = require("fs");
const path = require("path");

const dirs = ["app", "components", "hooks", "utils"];
const skip = /legal|node_modules|__tests__|design-system/;
const acc = /[\u00C0-\u017F]/;
const clean = /^[A-Za-z0-9\u00C0-\u017E .,:;!?'èêëéàâçùûîïôœ-]+$/;
const out = [];

function walk(p) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const fp = path.join(p, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith(".") && !skip.test(e.name)) walk(fp);
    } else if (/\.(ts|tsx)$/.test(e.name) && !skip.test(fp)) {
      const lines = fs.readFileSync(fp, "utf8").split("\n");
      lines.forEach((l, i) => {
        // Match quoted string literals on the line.
        const m = l.match(/["'`]([^"'`]{3,})["'`]/g) || [];
        for (const raw of m) {
          const s = raw.slice(1, -1).trim();
          // Skip anything that's clearly code/classNames (contains =, {, >, <, %, /, #, etc.)
          if (acc.test(s) && clean.test(s) && !/className|font-|text-|bg-|rounded|border|px-|py-|w-|h-|flex|items|justify|gap|mt-|mb-|ml-|mr-|grid|shadow|opacity/.test(s)) {
            out.push(fp.replace(/\\/g, "/") + ":" + (i + 1) + ": " + s);
          }
        }
      });
    }
  }
}
dirs.forEach(walk);
console.log(out.join("\n"));