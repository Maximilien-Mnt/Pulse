Tu travailles sur l'application Pulse (React Native + Expo + Supabase + NativeWind + TypeScript), déjà initialisée avec sa V1. Tu dois implémenter les fonctionnalités de la V2 en modifiant et étendant le code existant. Ne supprime rien qui fonctionne — uniquement ajouter et modifier.

Voici les fonctionnalités à implémenter dans l'ordre de priorité :

═══════════════════════════════════════════════════════
1. PROFIL PUBLIC
═══════════════════════════════════════════════════════

Dans profile/index.tsx :
- Remplacer le toast "V2" du bouton "Activer le profil public" par le vrai flux :
  - Modal de création profil public en plusieurs étapes :
    a. Explication de ce qu'apporte le profil public (poster, créer clubs/events, être suivi)
    b. Statut par sport : pour chaque sport pratiqué de l'utilisateur, select obligatoire parmi [Coach, Amateur, Récréatif, Semi-Professionnel, Professionnel]
    c. Upload de 2-5 photos (expo-image-picker, multiple, upload Supabase Storage bucket 'public-profiles')
    d. Confirmation → update profiles.is_public = true, profiles.public_status = {...}, profiles.public_photos = [...]
  - Après activation : créer automatiquement la notion de "liste publique" de conversations (is_public_list = true dans conversation_participants)
  - Une fois activé, impossibilité de désactiver (bouton absent)

Ajouter pages/vues :
- app/(tabs)/profile/public.tsx : vue du propre profil public (avec galerie posts/clubs/events en 3 onglets)
- app/(tabs)/profile/edit-public.tsx : modification infos profil public

Profil public d'un autre utilisateur (app/profile/[userId].tsx — nouvelle route) :
- Accessible depuis : cartes détails clubs/events (si créateur), feed (clic sur auteur), conversations (clic sur membre)
- Afficher : avatar, nom, @username, bio, pays, sports + niveaux, statut public, photos publiques
- Statistiques publiques : abonnés, posts, clubs créés, events créés, likes cumulés, commentaires cumulés
- Bouton "Suivre" / "Ne plus suivre" → insert/delete dans follows + notification
- Bouton "Contacter" → crée conversation dans liste "Privées" de l'utilisateur + liste "Publiques" du profil public contacté (is_public_list = true dans conversation_participants pour l'auteur public)
- Galerie 3 onglets : Posts (grille), Clubs gérés, Événements gérés

Dans conversations/index.tsx :
- Ajouter un sélecteur en haut "Privées" | "Publiques" (visible uniquement si l'utilisateur a un profil public)
- "Publiques" = conversations où is_public_list = true pour cet utilisateur

═══════════════════════════════════════════════════════
2. CRÉATION CLUBS
═══════════════════════════════════════════════════════

Remplacer le toast dans create/index.tsx pour "Nouveau club" :

Modal/page de création avec choix initial : "Privé" | "Public"

Création club PRIVÉ (app/create/club/private.tsx) :
Formulaire court :
- Nom* (text input)
- Sport* (select)
- Description (textarea, optionnel)
- Inviter des membres (recherche par username, debounce, multi-select) → chaque invitation = notification push au concerné
- Bouton "Créer le club" → insert dans clubs (is_private: true) + club_members (rôle owner) + envoi notifications invitations
- Après création : toast + navigate vers profil utilisateur section clubs

Création club PUBLIC (app/create/club/public.tsx) :
Guard : vérifier profiles.is_public → sinon redirect vers flux activation profil public.
Formulaire complet :
Obligatoires : Nom, Sport, Description (min 50 chars), Pays, Ville, Lien d'inscription/contact, Niveau requis
Facultatifs : Logo (image-picker → upload), Photos (max 5), Adresse exacte, Email contact, Site web, Date de fondation, Ligue/Division, Âge min/max, Horaires d'entraînement
- Validation Zod complète
- Bouton "Publier le club" → insert clubs (is_private: false, is_external: false, creator_id: user.id) + club_members (owner) → toast + navigate vers détail club

═══════════════════════════════════════════════════════
3. CRÉATION ÉVÉNEMENTS
═══════════════════════════════════════════════════════

Même logique que les clubs :

Création événement PRIVÉ (app/create/event/private.tsx) :
Obligatoires : Nom, Sport, Date de début
Facultatifs : Date de fin, Description, Lieu, Invitations (même logique que club privé), Lien club associé

Création événement PUBLIC (app/create/event/public.tsx) :
Guard profil public.
Obligatoires : Nom, Sport, Date de début, Pays, Ville, Lien d'inscription/contact, Description (min 50 chars)
Facultatifs : Date de fin, Adresse exacte, Prix, Niveau requis, Difficulté (1-5 slider), Catégorie, Âge min/max, Nombre de places, Photos (max 5), Club lié (select parmi clubs créés par l'utilisateur), Site web
→ insert events + notifications si lié à un club (notifie membres du club)

═══════════════════════════════════════════════════════
4. CONVERSATIONS DE GROUPE
═══════════════════════════════════════════════════════

Dans create/index.tsx, le bouton "Nouvelle conversation" :
- Afficher d'abord un choix : "Individuelle" | "Groupe"
- Individuelle : logique V1 existante
- Groupe (nouveau) :
  - Recherche et ajout de membres (multi, recherche username)
  - Nom du groupe (obligatoire)
  - Photo de groupe (optionnel, image-picker → upload Supabase Storage)
  - Bouton "Créer le groupe" → insert conversation (is_group: true) + conversation_participants pour tous + envoi invitations (notifications) → navigate vers la conversation

Dans conversations/[conversationId].tsx :
- Détecter si is_group = true
- Header : afficher photo groupe + nom groupe + icône paramètres → ouvre paramètres groupe
- Ajout des couleurs différentes par participant dans les bulles (text couleur selon index participant)
- Paramètres groupe (modal) :
  - Liste membres avec clic → profil
  - Changer nom du groupe (text input + save)
  - Changer photo groupe (image-picker)
  - Ajouter membre (recherche username → envoyer invitation)
  - Quitter le groupe : confirmation → left_at = now() + message système "X a quitté le groupe"

═══════════════════════════════════════════════════════
5. RÉACTIONS AUX MESSAGES & ACTIONS AVANCÉES
═══════════════════════════════════════════════════════

Dans conversations/[conversationId].tsx, long press sur un message :
Action sheet (react-native-action-sheet ou Reanimated bottom sheet) avec options contextuelles :

Pour messages de l'utilisateur : Réagir, Modifier, Supprimer, Épingler, Signaler
Pour messages des autres : Réagir, Masquer, Épingler, Signaler

- Réagir : ouvre un sélecteur d'émojis (react-native-emoji-keyboard ou équivalent), sélection → insert message_reactions → afficher emoji en bas de la bulle. Clic sur un emoji existant → confirmation suppression → delete message_reaction.
- Modifier : pré-remplir la TextInput en bas avec le contenu du message + changer l'icône envoyer en "✓ Confirmer" → update message + is_edited = true → afficher "(modifié)" sous le message.
- Supprimer : confirmation → is_deleted = true → afficher "Message supprimé" pour tous.
- Masquer (interlocuteur) : insert message_hidden → afficher "Message masqué" uniquement pour l'utilisateur.
- Épingler : sélecteur durée (1 jour, 3 jours, 1 semaine, 1 mois, Indéfiniment) → update message.pinned_until → afficher ruban épingle en haut de la conversation avec aperçu. Clic sur ruban → scroll vers message. 1 seul message épinglé à la fois.
- Signaler : confirmation + message optionnel + mention des données partagées → insert reports.

═══════════════════════════════════════════════════════
6. FICHIERS DANS LES CONVERSATIONS
═══════════════════════════════════════════════════════

Dans la barre de saisie des conversations, activer le bouton "+" :
- Ouvre action sheet : "Photo depuis la galerie" / "Prendre une photo" / "Document PDF"
- Images : expo-image-picker → upload Supabase Storage bucket 'conversation-files' → insert message avec type='image' et file_url
- PDF : expo-document-picker → upload → insert message avec type='file', file_url, file_name
- Dans la bulle message : afficher l'image (expo-image) ou un PDF preview (icône document + nom fichier + taille)
- Clic sur image → modal plein écran, clic sur PDF → expo-web-browser

═══════════════════════════════════════════════════════
7. NOTIFICATIONS PUSH
═══════════════════════════════════════════════════════

Configurer expo-notifications :
- Demander la permission à la première connexion
- Enregistrer le push token dans profiles (ajouter colonne push_token text)
- Utiliser Supabase Edge Function (supabase/functions/send-notification/index.ts) appelée après :
  - Nouvelle demande de rejoindre un club/event (notification au créateur)
  - Nouveau message dans une conversation (notification aux participants)
  - Invitation à un groupe (notification aux invités)
  - Nouveau post d'un utilisateur suivi (notification aux abonnés)
  - Réponse à un commentaire (notification à l'auteur du post)
- Handler local (foreground) : Notifications.setNotificationHandler
- Handler background : Notifications.addNotificationResponseReceivedListener → navigate vers la screen appropriée

═══════════════════════════════════════════════════════
8. ALGORITHME FEED BASIQUE
═══════════════════════════════════════════════════════

Modifier useFeed.ts pour implémenter un score de pertinence côté Supabase :

Créer une Supabase Edge Function ou Vue SQL materializzée `feed_scored_posts` qui calcule un score :
score = (récence * 0.4) + (popularité * 0.3) + (pertinence_sports * 0.2) + (follows * 0.1)

- Récence : decay exponentiel sur created_at (post de 1h > post de 24h)
- Popularité : (likes_count * 1) + (comments_count * 2) + (shares_count * 1.5)
- Pertinence_sports : +10 si l'auteur pratique un sport que l'utilisateur pratique
- Follows : +20 si l'utilisateur suit l'auteur

Modifier le feed pour utiliser cette vue triée par score DESC au lieu de created_at DESC.
Garder pull-to-refresh pour rafraîchir les scores.

═══════════════════════════════════════════════════════
9. PARAMÈTRES CONVERSATION (VERSION COMPLÈTE)
═══════════════════════════════════════════════════════

Remplacer le toast V2 du bouton paramètres dans les conversations par une vraie page :
app/conversations/[conversationId]/settings.tsx

Contenu :
- Barre de recherche (Ctrl+F) : highlight les messages contenant le terme recherché, indicateur "X résultats", navigation entre résultats
- Galerie : grille d'images/fichiers envoyés dans la conversation, clic → scroll vers message
- Changer fond d'écran (image-picker → stocké localement dans AsyncStorage par conversation, uniquement pour cet utilisateur)
- Pour conversation individuelle : accès au profil de l'interlocuteur
- Pour groupe : liste membres (cliquables), ajouter membre, renommer, changer photo
- Télécharger la conversation (même logique que V1 via menu)
- Signaler la conversation
- Supprimer/Quitter

═══════════════════════════════════════════════════════
10. STATISTIQUES UTILISATEUR
═══════════════════════════════════════════════════════

Dans profile/index.tsx, ajouter la section statistiques :
- Temps total sur l'app (calculé via feed_interactions count * temps_moyen_estimé)
- Posts créés (count depuis posts)
- Clubs rejoints (count depuis club_members)
- Événements auxquels participé (count depuis event_participants)
- Top 3 tags consultés (depuis feed_interactions jointure posts.tags)
- Formats de posts les plus consultés
- Sports les plus consultés dans les clubs/events

Pour profils publics, ajouter dans app/profile/[userId].tsx :
- Likes cumulés reçus (user_stats.total_likes_received)
- Commentaires cumulés
- Abonnés actuels (count follows.following_id)
- Total abonnements historiques / désabonnements
- Taux d'engagement moyen

Créer une Supabase Edge Function `update-user-stats` appelée toutes les heures (cron) pour maintenir user_stats à jour.

═══════════════════════════════════════════════════════
INSTRUCTIONS V2
═══════════════════════════════════════════════════════

1. Ne réécris pas les fichiers existants en entier — utilise des modifications ciblées.
2. Respecte exactement le design system établi en V1 (couleurs, typographie, composants ui/).
3. Ajoute les nouvelles routes dans la structure Expo Router existante.
4. Mets à jour le schéma Supabase : génère supabase/migrations/002_v2.sql avec les nouvelles tables/colonnes/fonctions.
5. Génère supabase/functions/ pour toutes les Edge Functions nécessaires.
6. Ajoute les types TypeScript manquants dans types/index.ts.
7. Respecte la logique incrémentale : le projet doit fonctionner à chaque étape.