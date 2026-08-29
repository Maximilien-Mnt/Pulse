/**
 * Final i18n cleanup pass.
 *
 * 1. Unbreaks the `"{t("key")}"` string literals left by earlier patch
 *    scripts, converting them into real `t("key")` calls.
 * 2. Ensures `t` is in scope in every touched file (standalone import).
 * 3. Removes broken `"{t(...)}"` dictionary keys in utils/localizeError.ts.
 * 4. Replaces remaining known French UI literals with `t()` calls.
 * 5. Reports translation keys referenced but missing from lib/translations.ts.
 */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const DIRS = ["app", "components", "hooks", "utils"];
const SKIP_DIRS = new Set(["node_modules", ".expo", "scripts", "lib"]);

// ── French literal → t() replacements (file → pairs) ────────────────────────
const FR_REPLACEMENTS = {
  "app/(public)/legal/contact.tsx": [
    ['Alert.alert("Erreur", "Impossible d\'ouvrir votre application mail.");',
     'Alert.alert(t("common.error"), t("legal.contact.mailError"));'],
  ],
  "app/(tabs)/conversations/index.tsx": [
    ['placeholder="Rechercher une conversation"', 'placeholder={t("conv.search")}'],
  ],
  "app/(tabs)/discover/index.tsx": [
    ['<ErrorState message={clubsListError?.message ?? "Erreur"} onRetry={() => void refetchClubs()} />',
     '<ErrorState message={clubsListError?.message ?? t("common.error")} onRetry={() => void refetchClubs()} />'],
    ['<ErrorState message={eventsListError?.message ?? "Erreur"} onRetry={() => void refetchEvents()} />',
     '<ErrorState message={eventsListError?.message ?? t("common.error")} onRetry={() => void refetchEvents()} />'],
    ['title="Aucun club"', 'title={t("common.noClub")}'],
    ['subtitle="Essaie d\'autres filtres."', 'subtitle={t("common.tryOtherFilters")}'],
  ],
  "app/(tabs)/events/index.tsx": [
    ['<ErrorState message={error?.message ?? "Erreur"} onRetry={() => void refetch()} />',
     '<ErrorState message={error?.message ?? t("common.error")} onRetry={() => void refetch()} />'],
    ['subtitle="Modifie les filtres."', 'subtitle={t("common.tryOtherFilters")}'],
  ],
  "app/(tabs)/events/[eventId].tsx": [
    ['onError: () => Toast.show({ type: "error", text1: "Erreur" }),',
     'onError: () => Toast.show({ type: "error", text1: t("common.error") }),'],
  ],
  "app/(tabs)/profile/index.tsx": [
    ['<ErrorState message={error?.message ?? "Erreur"} onRetry={() => void refetch()} />',
     '<ErrorState message={error?.message ?? t("common.error")} onRetry={() => void refetch()} />'],
  ],
  "app/(tabs)/profile/public.tsx": [
    ['<ErrorState message={error?.message ?? "Erreur"} onRetry={() => void refetch()} />',
     '<ErrorState message={error?.message ?? t("common.error")} onRetry={() => void refetch()} />'],
  ],
  "app/(tabs)/profile/accepted-events.tsx": [
    ['<ErrorState message="Erreur de chargement" onRetry={() => {}} />',
     '<ErrorState message={t("common.loadingError")} onRetry={() => {}} />'],
    ['"En cours"', 't("events.ongoing")'],
  ],
  "app/(tabs)/profile/user-posts.tsx": [
    ['title="Aucun post"', 'title={t("common.noPosts")}'],
    ['subtitle=" {t("feed.empty")}"', 'subtitle={t("feed.empty")}'],
    ['{isDeleting ? "Suppression…" : "Supprimer"}', '{isDeleting ? t("common.deleting") : t("common.delete")}'],
  ],
  "app/create/club/private.tsx": [
    ['p_body: `${profile?.full_name ?? "Quelqu\'un"} t\'a invité à rejoindre "${name}"`,',
     'p_body: t("clubs.inviteBody", { name: profile?.full_name ?? "Someone", club: name }),'],
    ['text1: err instanceof Error ? err.message : "Erreur"',
     'text1: err instanceof Error ? err.message : t("common.error")'],
    ['<Text className="text-lg font-semibold mb-3">Inviter des membres</Text>',
     '<Text className="text-lg font-semibold mb-3">{t("clubs.inviteMembers")}</Text>'],
    ['label="Rechercher par @username"', 'label={t("common.searchByUsername")}'],
  ],
  "app/create/event/private.tsx": [
    ['p_body: `${profile?.full_name ?? "Quelqu\'un"} t\'a invité à "${name}"`,',
     'p_body: t("events.inviteBody", { name: profile?.full_name ?? "Someone", event: name }),'],
  ],
};

// ── Walk files ───────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

let allFiles = [];
for (const d of DIRS) {
  const p = path.join(root, d);
  if (fs.existsSync(p)) allFiles = allFiles.concat(walk(p));
}

const usedKeys = new Set();
const unbreakRe = /(["'])\{t\("([^"]+)"\)\}\1/g;
const changed = [];

for (const file of allFiles) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  let src = fs.readFileSync(file, "utf8");
  const before = src;

  // 3. Drop broken "{t(...)}" dictionary keys in localizeError.ts
  if (rel === "utils/localizeError.ts") {
    src = src.replace(/^\s*"\{t\("[^"]+"\)\}":.*,\r?\n/gm, "");
  }

  // 4. Explicit French literal replacements
  const pairs = FR_REPLACEMENTS[rel];
  if (pairs) {
    for (const [from, to] of pairs) {
      if (src.includes(from)) src = src.replace(from, to);
    }
  }

  // 1. Unbreak `"{t("key")}"` → t("key") (skip localizeError dictionary keys)
  if (rel !== "utils/localizeError.ts") {
    src = src.replace(unbreakRe, (_m, _q, key) => `t("${key}")`);
  }
  for (const m of src.matchAll(/\{t\("([^"]+)"\)\}/g)) usedKeys.add(m[1]);
  for (const m of src.matchAll(/\bt\("([a-zA-Z0-9_.]+)"/g)) usedKeys.add(m[1]);

  if (src === before) continue;

  // 2. Ensure `t` is in scope
  const hasHookDecl = /const\s*\{\s*t\s*(?:,\s*[\w\s,]*)?\}\s*=\s*useTranslation\(\)/.test(src);
  const hookImportRe = /import\s*\{([^}]*)\}\s*from\s*"@\/hooks\/useTranslation";/;
  const hookImport = src.match(hookImportRe);
  const tInImport = hookImport && /(^|[^a-zA-Z])t\s*[,}]/.test(hookImport[1]);
  const needsStandalone = /\bt\("/.test(src) && (!hookImport || !tInImport);

  if (needsStandalone && hookImport) {
    src = src.replace(hookImportRe, (_m, names) => `import {${names}, t } from "@/hooks/useTranslation";`);
  } else if (needsStandalone && !hookImport) {
    const importRe = /^import[\s\S]*?;$/gm;
    let lastEnd = -1;
    let m;
    while ((m = importRe.exec(src)) !== null) {
      if (m.index < 4000) lastEnd = m.index + m[0].length;
    }
    const imp = `\nimport { t } from "@/hooks/useTranslation";`;
    if (lastEnd >= 0) src = src.slice(0, lastEnd) + imp + src.slice(lastEnd);
    else src = imp + "\n" + src;
  }

  fs.writeFileSync(file, src, "utf8");
  changed.push(rel);
}

console.log(`Modified ${changed.length} files:`);
for (const c of changed) console.log("  -", c);

// 5. Missing-key report
const translationsSrc = fs.readFileSync(path.join(root, "lib", "translations.ts"), "utf8");
const defined = new Set();
for (const m of translationsSrc.matchAll(/"([a-zA-Z0-9_.]+)":\s*"/g)) defined.add(m[1]);
const missing = [...usedKeys].filter((k) => !defined.has(k)).sort();
console.log(`\nMissing keys (${missing.length}):`);
for (const k of missing) console.log("  !", k);

