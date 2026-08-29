const fs = require('fs');
const c = fs.readFileSync('lib/translations.ts', 'utf8');
const frIdx = c.indexOf('fr: {');
const enIdx = c.indexOf('en: {');
const fr = c.slice(frIdx, enIdx);
const en = c.slice(enIdx);

const frKeys = new Set([...fr.matchAll(/"([^"]+)":/g)].map(m => m[1]));
const enKeys = new Set([...en.matchAll(/"([^"]+)":/g)].map(m => m[1]));

const onlyFr = [...frKeys].filter(k => !enKeys.has(k)).sort();
const onlyEn = [...enKeys].filter(k => !frKeys.has(k)).sort();

console.log('FR keys:', frKeys.size);
console.log('EN keys:', enKeys.size);
console.log('Only in FR:', JSON.stringify(onlyFr));
console.log('Only in EN:', JSON.stringify(onlyEn));

const ns = {};
for (const k of [...frKeys]) {
  const p = k.split('.');
  ns[p[0]] = (ns[p[0]] || 0) + 1;
}
console.log('Namespaces:', JSON.stringify(ns, null, 2));
