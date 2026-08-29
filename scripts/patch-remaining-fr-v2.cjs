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

patch('app/(tabs)/clubs/[clubId].tsx', [
  ["text1: 'Créateur',", "text1: t('members.creator'),"],
  ["text1: 'Créateur';", "text1: t('members.creator');"],
]);

patch('app/(tabs)/conversations/index.tsx', [
  ['Épinglées', '{t("conversations.pinned")}'],
]);

patch('app/(tabs)/create/index.tsx', [
  ['Post publié', '{t("post.published")}'],
  ['Partage ta séance, ton résultat, ta motivation...', '{t("post.placeholder")}'],
  ['Un compte que tu suis a créé un nouveau club.', '{t("create.club.notification")}'],
  ['Club créé', '{t("create.club.success")}'],
  ['Création impossible', '{t("create.club.error")}'],
  ['Nouvel événement', '{t("create.event.title")}'],
  ['Un compte que tu suis a créé un nouvel événement.', '{t("create.event.notification")}'],
  ['Événement créé', '{t("create.event.success")}'],
  ['Création impossible', '{t("create.event.error")}'],
  ['Capacité max (optionnel)', '{t("events.maxCapacityOptional")}'],
]);

patch('app/(tabs)/discover/index.tsx', [
  ['Découvrir', '{t("common.discover")}'],
  ['Événements', '{t("common.events")}'],
  ['Aucun club ne correspond à ta recherche.', '{t("explore.noClubs")}'],
  ['Aucun événement ne correspond à ta recherche.', '{t("explore.noEvents")}'],
]);

patch('app/(tabs)/events/index.tsx', [
  ['Évènements', '{t("common.events")}'],
  ['Aucun événement', '{t("common.noEvents")}'],
]);

patch('app/(tabs)/events/[eventId].tsx', [
  ['Créateur', '{t("members.creator")}'],
]);

patch('app/(tabs)/explore/index.tsx', [
  ['Aucun club ne correspond à ta recherche.', '{t("explore.noClubs")}'],
  ['Aucun événement ne correspond à ta recherche.', '{t("explore.noEvents")}'],
]);

patch('app/(tabs)/profile/accepted-events.tsx', [
  ['Événements acceptés', '{t("profile.acceptedEvents")}'],
]);

patch('app/(tabs)/profile/clubs.tsx', [
  ['Aucun club créé', '{t("profile.clubs.created")}'],
  ['Crée ton premier club pour le voir ici.', '{t("profile.clubs.createdSubtitle")}'],
]);

patch('app/(tabs)/profile/edit-profile.tsx', [
  ['Sélectionner ${label.toLowerCase()}', 'Sélectionner {label.toLowerCase()}'],
  ['Profil mis à jour', '{t("profile.edit.success")}'],
  ['Non renseignée', '{t("profile.country.unspecified")}'],
  ['Sélectionner un pays', '{t("profile.country.placeholder")}'],
  ['Présente-toi brièvement...', '{t("profile.bio.placeholder")}'],
  ['Heure de début', '{t("updateEvent.dateLabel")}'],
]);

patch('app/(tabs)/profile/edit-public.tsx', [
  ['Profil public mis à jour', '{t("profile.public.success")}'],
]);

patch('app/(tabs)/profile/events.tsx', [
  ['Mes événements', '{t("profile.myEvents")}'],
]);

patch('app/(tabs)/profile/notifications.tsx', [
  ['Traités', '{t("notifications.filter.processed")}'],
  ['À l', 'À l'],
  ['Demande acceptée', '{t("notifications.type.clubJoinRequestResponseAccept")}'],
  ['Invitation acceptée', '{t("notifications.type.eventJoinRequestResponseAccept")}'],
  ['Demande refusée', '{t("notifications.type.clubJoinRequestResponseRefuse")}'],
  ['Invitation refusée', '{t("notifications.type.eventJoinRequestResponseRefuse")}'],
  ['Conversation supprimée', '{t("notifications.type.conversationDeleted")}'],
  ['Demande acceptée', '{t("notifications.toast.accepted")}'],
  ['Demande refusée', '{t("notifications.toast.refused")}'],
]);

patch('app/(tabs)/profile/settings.tsx', [
  ['Préférences', '{t("settings.section.preferences")}'],
  ['Sécurité', '{t("security.title")}'],
  ['Session', '{t("common.session")}'],
  ['Support', '{t("settings.section.support")}'],
  ['Mode sombre', '{t("settings.darkMode")}'],
  ['Se déconnecter', '{t("common.signOut")}'],
  ['Déconnexion…', '{t("common.signingOut")}'],
  ['Signaler un bug', '{t("common.reportBug")}'],
  ['Paramètres', '{t("profile.settings")}'],
  ['Zone dangereuse', '{t("settings.section.danger")}'],
  ['Supprimer mon compte', '{t("settings.deleteAccount")}'],
]);
