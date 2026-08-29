// Generates a JSON patch object mapping each hardcoded French literal (from _scan_all.txt)
// to a proposed translation key, grouped by file path.
const fs = require('fs');
const path = require('path');

const scanPath = path.join(process.cwd(), '_scan_all.txt');
const outPath = path.join(process.cwd(), 'i18n-patch.json');

const raw = fs.readFileSync(scanPath, 'utf8');
const lines = raw.split('\n').filter(l => l.trim());

// Deduplicate per file: same string in same file = one entry
const byFile = {};
for (const line of lines) {
  const m = line.match(/^(.+?):\d+:\s+(.+)$/);
  if (!m) continue;
  const file = path.normalize(m[1]).replace(/\\\\/g, '/');
  const text = m[2].trim();
  if (!byFile[file]) byFile[file] = new Set();
  byFile[file].add(text);
}

// Suggest keys based on filename + text hash
function suggestKey(file, text) {
  const base = path.basename(file, path.extname(file)).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const normalized = text
    .toLowerCase()
    .replace(/[àâ]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ïî]/g, 'i').replace(/[ô]/g, 'o')
    .replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[œ]/g, 'oe').replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${base}.${normalized}`;
}

const patch = {};
for (const [file, texts] of Object.entries(byFile)) {
  const entries = {};
  for (const text of texts) {
    entries[text] = { key: suggestKey(file, text) };
  }
  patch[file] = entries;
}

fs.writeFileSync(outPath, JSON.stringify(patch, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`Files: ${Object.keys(patch).length}`);
console.log(`Total unique literals: ${Object.values(patch).reduce((s, f) => s + Object.keys(f).length, 0)}`);
