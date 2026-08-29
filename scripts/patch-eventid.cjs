const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'app/(tabs)/events/[eventId].tsx');
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  ['title="Détails"', 'title={t("common.details")}'],
  ['text1: "Demande envoyée"', 'text1: t("events.requestSent")'],
  ['Créateur', 't("members.creator")'],
];

let changed = false;
for (const [from, to] of replacements) {
  if (content.includes(from)) {
    content = content.replace(from, to);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched events/[eventId].tsx');
} else {
  console.log('No changes applied');
  process.exit(1);
}
