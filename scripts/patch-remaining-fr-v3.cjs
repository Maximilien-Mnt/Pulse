const fs = require('fs');
const path = require('path');

const root = process.cwd();

function patch(fileRel, subs) {
  const file = path.join(root, fileRel);
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [from, to] of subs) {
    if (content.includes(from)) {
      content = content.replace(from, to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', fileRel);
  } else {
    console.log('No changes for', fileRel);
  }
}

patch('app/(tabs)/discover/index.tsx', [
  ['Aucun événement', '{t("common.noEvents")}'],
]);

patch('app/(tabs)/events/[eventId].tsx', [
  ['Détails', '{t("common.details")}'],
  ['${formatDateLong(event.start_date)} à ${formatTime(event.start_date)}', '${t("events.dateTimeStart", { date: formatDateLong(event.start_date), time: formatTime(event.start_date) })}'],
  ['${formatDateLong(event.end_date)} à ${formatTime(event.end_date)}', '${t("events.dateTimeEnd", { date: formatDateLong(event.end_date), time: formatTime(event.end_date) })}'],
]);

patch('app/(tabs)/explore/index.tsx', [
  ['Rechercher un événement', '{t("events.searchPlaceholder")}'],
]);

patch('app/(tabs)/profile/accepted-events.tsx', [
  ['Événements acceptés', '{t("profile.acceptedEvents")}'],
  ['À venir', '{t("events.upcoming")}'],
  ['Passés', '{t("events.past")}'],
  ['Aucun événement à venir', '{t("events.emptyUpcoming")}'],
  ['Aucun événement en cours', '{t("events.emptyOngoing")}'],
  ['Aucun événement passé', '{t("events.emptyPast")}'],
  ['Les événements où vous avez été accepté apparaîtront ici.', '{t("events.emptyAccepted")}'],
]);

patch('app/(tabs)/profile/edit-profile.tsx', [
  ['Sélectionner {label.toLowerCase()}', '{t("profile.country.placeholder", { label })}'],
]);

patch('app/(tabs)/profile/events.tsx', [
  ['Mes événements', '{t("profile.myEvents")}'],
  ['À venir', '{t("events.upcoming")}'],
  ['Passés', '{t("events.past")}'],
  ['Aucun événement à venir', '{t("events.emptyUpcoming")}'],
  ['Aucun événement en cours', '{t("events.emptyOngoing")}'],
  ['Aucun événement passé', '{t("events.emptyPast")}'],
]);

patch('app/(tabs)/profile/notifications.tsx', [
  ['À l', 'À l'],
  ['Impossible de démarrer la conversation', '{t("conv.cannotStart")}'],
]);

patch('app/(tabs)/profile/settings.tsx', [
  ['Politique de confidentialité', '{t("legal.privacy.title")}'],
  ['Politique de modération', '{t("legal.moderation.title")}'],
  ['Mentions légales', '{t("legal.legalNotices.title")}'],
]);

patch('app/(tabs)/profile/user-posts.tsx', [
  ['Vos posts apparaîtront ici.', '{t("feed.empty")}'],
]);

patch('app/auth/forgot-password.tsx', [
  ['Veuillez réessayer plus tard.', '{t("auth.retryLater")}'],
]);

patch('app/auth/reset-password.tsx', [
  ['Ce lien de réinitialisation est invalide ou a expiré.', '{t("auth.linkExpired")}'],
  ['Aucune session de récupération valide.', '{t("auth.noRecoverySession")}'],
  ['Veuillez demander un nouveau lien de réinitialisation.', '{t("auth.requestNewLink")}'],
]);

patch('app/auth/signup/step3.tsx', [
  ['${e.level} · ${e.practice} · ${e.timeSlots.length} créneau${e.timeSlots.length > 1 ? "s" : ""}', '{t("profile.sportSummary", { level: e.level, practice: e.practice, slots: e.timeSlots.length })}'],
]);

patch('app/auth/signup/step4.tsx', [
  ['Améliorer mon endurance', '{t("signup.goal.endurance")}'],
  ['Participer à des compétitions', '{t("signup.goal.competition")}'],
  ['Réduire le stress', '{t("signup.goal.stress")}'],
  ['Améliorer ma souplesse', '{t("signup.goal.flexibility")}'],
  ['Préparer un objectif (course, triathlon…)', '{t("signup.goal.objective")}'],
  ['Découvrir un nouveau sport', '{t("signup.goal.discover")}'],
]);
