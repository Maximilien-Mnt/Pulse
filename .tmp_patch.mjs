const fs = require('fs');
const path = require('path');

function read(absPath) { return fs.readFileSync(absPath, 'utf8'); }
function write(absPath, content) { fs.writeFileSync(absPath, content); console.log('OK ' + absPath); }

// 1. lib/constants.ts - add "Autre"
let c = read('c:/Users/maxim/Pulse/lib/constants.ts');
c = c.replace(/"Découvrir un nouveau sport",\s*\] as const;/, '"Découvrir un nouveau sport",\n  "Autre",\n] as const;');
write('c:/Users/maxim/Pulse/lib/constants.ts', c);

// 2. lib/translations.ts - add EN keys
let t = read('c:/Users/maxim/Pulse/lib/translations.ts');
t = t.replace(/("signup\.objective\.discover": "Découvrir un nouveau sport",)/, '$1\n    "signup.objective.other": "Autre",\n    "signup.step4.objectivesDetailsLabel": "Précisez (optionnel)",\n    "signup.step4.objectivesDetailsPlaceholder": "Vos objectifs spécifiques…",');
write('c:/Users/maxim/Pulse/lib/translations.ts', t);

// 3. stores/signupStore.ts - add objectivesDetails
let s = read('c:/Users/maxim/Pulse/stores/signupStore.ts');
s = s.replace(/export type SignupStep4 = \{([\s\S]*?)heightCm\?: string;([\s\S]*?)\};/, 'export type SignupStep4 = {$1  objectivesDetails?: string;$2heightCm?: string;$2weightKg?: string;$2};');
write('c:/Users/maxim/Pulse/stores/signupStore.ts', s);

// 4. utils/validation.ts - add objectivesDetails
t = read('c:/Users/maxim/Pulse/utils/validation.ts');
t = t.replace(/export const signupStep4Schema = z\.object\(\([\s\S]*?objectives: z\.array\(z\.string\)\.default\(\[\]\),(\s*)/, 'export const signupStep4Schema = z.object({\n  interestedSports: z.array(z.string()).default([]),\n  objectives: z.array(z.string()).default([]),$1  objectivesDetails: z.string().optional(),');
write('c:/Users/maxim/Pulse/utils/validation.ts', t);
