const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'app/(tabs)/clubs/[clubId].tsx');
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  ["title='Détails'", 'title={t("common.details")}'],
  ["text1: 'Créateur',", 'text1: t("members.creator"),'],
  ["title='Demande envoyée'", 'title={t("clubJoin.requestSent")}'],
  ["? 'Demander à rejoindre'", "? t('clubs.joinRequest')"],
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
  console.log('Patched clubs/[clubId].tsx');
} else {
  console.log('No changes applied');
  process.exit(1);
}
