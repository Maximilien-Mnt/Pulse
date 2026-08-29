const fs = require('fs');
const path = require('path');

const root = process.cwd();

const patches = [
  {
    file: 'app/(tabs)/clubs/[clubId].tsx',
    subs: [
      ['text1: \'Créateur\',', 'text1: t(\'members.creator\'),'],
      // Line 437 might be a semicolon variant
    ],
  },
  {
    file: 'app/(tabs)/conversations/index.tsx',
    subs: [['Épinglées', '{t("conversations.pinned")}']],
  },
  {
    file: 'app/(tabs)/create/index.tsx',
    subs: [
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
    ],
  },
  {
    file: 'app/(tabs)/discover/index.tsx',
    subs: [
      ['Découvrir', '{t("common.discover")}'],
      ['Événements', '{t("common.events")}'],
      ['Aucun club ne correspond à ta recherche.', '{t("explore.noClubs")}'],
      ['Aucun événement ne correspond à ta recherche.', '{t("explore.noEvents")}'],
    ],
  },
  {
    file: 'app/(tabs)/events/index.tsx',
    subs: [
      ['Évènements', '{t("common.events")}'],
      ['Aucun événement', '{t("common.noEvents")}'],
      ['Évènements', '{t("events.title")}'],
    ],
  },
  {
    file: 'app/(tabs)/events/[eventId].tsx',
    subs: [
      ['Créateur', '{t("members.creator")}'],
    ],
  },
  {
    file: 'app/(tabs)/explore/index.tsx',
    subs: [
      ['Aucun club ne correspond à ta recherche.', '{t("explore.noClubs")}'],
      ['Aucun événement ne correspond à ta recherche.', '{t("explore.noEvents")}'],
    ],
  },
  {
    file: 'app/(tabs)/profile/accepted-events.tsx',
    subs: [
      ['Événements acceptés', '{t("profile.acceptedEvents")}'],
    ],
  },
  {
    file: 'app/(tabs)/profile/clubs.tsx',
    subs: [
      ['Aucun club créé', '{t("profile.clubs.created")}'],
      ['Crée ton premier club pour le voir ici.', '{t("profile.clubs.createdSubtitle")}'],
    ],
  },
  {
    file: 'app/(tabs)/profile/edit-profile.tsx',
    subs: [
      ['Sélectionner ${label.toLowerCase()}', 'Sélectionner {label.toLowerCase()}'],
    ],
  },
  {
    file: 'app/(tabs)/profile/edit-public.tsx',
    subs: [
      ['Profil public mis à jour', '{t("profile.public.success")}'],
    ],
  },
  {
    file: 'app/(tabs)/profile/events.tsx',
    subs: [
      ['Mes événements', '{t("profile.myEvents")}'],
    ],
  },
  {
    file: 'app/(tabs)/profile/notifications.tsx',
    subs: [
      ['Traités', '{t("notifications.filter.processed")}'],
      ['À l', 'À l'],
      ['Demande acceptée', '{t("notifications.type.clubJoinRequestResponseAccept")}'],
      ['Invitation acceptée', '{t("notifications.type.eventJoinRequestResponseAccept")}'],
      ['Demande refusée', '{t("notifications.type.clubJoinRequestResponseRefuse")}'],
      ['Invitation refusée', '{t("notifications.type.eventJoinRequestResponseRefuse")}'],
      ['Conversation supprimée', '{t("notifications.type.conversationDeleted")}'],
      ['Demande acceptée', '{t("notifications.toast.accepted")}'],
      ['Demande refusée', '{t("notifications.toast.refused")}'],
    ],
  },
  {
    file: 'app/(tabs)/profile/settings.tsx',
    subs: [
      ['Préférences', '{t("settings.section.preferences")}'],
      ['Sécurité', '{t("security.title")}'],
      ['Session', '{t("common.session")}'],
      ['Support', '{t("settings.section.support")}'],
      ['Mode sombre', '{t("settings.darkMode")}'],
      ['Se déconnecter', '{t("common.signOut")}'],
      ['Déconnexion...', '{t("common.signingOut")}'],
      ['Signaler un bug', '{t("common.reportBug")}'],
      ['Paramètres', '{t("profile.settings")}'],
    ],
  },
  {
    file: 'app/(tabs)/settings.tsx',
    subs: [],
  },
];

