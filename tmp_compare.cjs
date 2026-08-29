const fs = require('fs');
const c = fs.readFileSync('lib/translations.ts', 'utf8');

// Extract fr block
const frStart = c.indexOf("fr: {");
let depth = 0, i = frStart + 4;
let frBlock = '';
for (; i < c.length; i++) {
  if (c[i] === '{') depth++;
  if (c[i] === '}') { depth--; if (depth === 0) { frBlock = c.slice(frStart + 4, i); break; } }
}

// Extract en block
const enStart = c.indexOf("en: {", i);
depth = 0; i = enStart + 4;
let enBlock = '';
for (; i < c.length; i++) {
  if (c[i] === '{') depth++;
  if (c[i] === '}') { depth--; if (depth === 0) { enBlock = c.slice(enStart + 4, i); break; } }
}

const frKeys = [...frBlock.matchAll(/"([^"]+)":/g)].map(m => m[1]);
const enKeys = [...enBlock.matchAll(/"([^"]+)":/g)].map(m => m[1]);
const frSet = new Set(frKeys);
const enSet = new Set(enKeys);
const onlyFr = [...frSet].filter(k => !enSet.has(k));
const onlyEn = [...enSet].filter(k => !frSet.has(k));
console.log('onlyFr:', JSON.stringify(onlyFr, null, 2));
console.log('onlyEn:', JSON.stringify(onlyEn, null, 2));
