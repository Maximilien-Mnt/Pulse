const fs = require("fs");
const path = require("path");
const tsPath = path.join(process.cwd(), "lib/translations.ts");
let ts = fs.readFileSync(tsPath, "utf8");
module.exports = {tsPath, ts};
