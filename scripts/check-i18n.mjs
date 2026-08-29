// Translation audit script
import fs from 'fs';

// 1. Parse translations.ts
const ts = fs.readFileSync('lib/translations.ts', 'utf8');

// Extract fr block keys
const frStart = ts.indexOf('fr: {');
const enStart = ts.indexOf('  en: {');
const frBlock = ts.slice(frStart, enStart);
const enBlock = ts.slice(enStart);

const extractKeys = (block) => {
  const keys = new Set();
  const re = /"([^"]+)":/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    keys.add(m[1]);
  }
  return keys;
};

const frKeys = extractKeys(frBlock);
const enKeys = extractKeys(enBlock);

console.log('=== PARITY CHECK ===');
console.log(`FR keys: ${frKeys.size} | EN keys: ${enKeys.size}`);
const onlyFr = [...frKeys].filter(k => !enKeys.has(k));
const onlyEn = [...enKeys].filter(k => !frKeys.has(k));
console.log(`onlyFr: ${onlyFr.length} | onlyEn: ${onlyEn.length}`);
if (onlyFr.length) console.log('onlyFr:', onlyFr.join('\n  '));
if (onlyEn.length) console.log('onlyEn:', onlyEn.join('\n  '));
console.log(onlyFr.length === 0 && onlyEn.length === 0 ? 'PARITY OK ✓' : 'PARITY FAIL');

// 2. List all keys grouped by namespace
console.log('\n=== EXISTING KEYS BY NAMESPACE ===');
const groups = {};
frKeys.forEach(k => {
  const g = k.split('.')[0];
  if (!groups[g]) groups[g] = [];
  groups[g].push(k);
});
Object.keys(groups).sort().forEach(g => {
  console.log(`\n--- ${g} (${groups[g].length}) ---`);
  groups[g].sort().forEach(k => console.log(`  ${k}`));
});

// 3. Scan source files for French literals
console.log('\n=== FRENCH LITERALS IN SOURCE ===');
const scanFile = (file, content) => {
  const frLiterals = [];
  // Look for French-accented strings in quotes
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    // Match string literals containing French accented chars
    const frRegex = /['"`]([^'"`]*[éèêëàâäîïôöùûüçÉÈÊËÀÂÄÎÏÔÖÙÛÜÇ][^'"`]*)['"`]/g;
    let m;
    while ((m = frRegex.exec(line)) !== null) {
      if (!frLiterals.includes(m[1])) {
        frLiterals.push(m[1]);
      }
    }
  });
  if (frLiterals.length > 0) {
    console.log(`${file}: ${frLiterals.length} FR literals`);
    frLiterals.slice(0, 20).forEach(l => console.log(`  "${l}"`));
    if (frLiterals.length > 20) console.log(`  ... and ${frLiterals.length - 20} more`);
  }
};

const dirs = ['app', 'components', 'hooks', 'utils', 'stores', 'lib'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const walk = (d) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const full = `${d}/${e.name}`;
      if (e.isDirectory()) walk(full);
      else if (e.name.match(/\.(tsx|ts|jsx|js)$/)) {
        const content = fs.readFileSync(full, 'utf8');
        scanFile(full, content);
      }
    }
  };
  walk(dir);
});
