Tu es un expert React Native / Expo / Supabase. Tu vas créer de zéro une application mobile appelée "Pulse" — un réseau social sportif. Tu dois générer l'intégralité du code de la V1, fichier par fichier, sans rien omettre. Suis ces instructions avec une précision absolue.

═══════════════════════════════════════════════════════
CONTEXTE GÉNÉRAL
═══════════════════════════════════════════════════════

Pulse est une application mobile iOS/Android (React Native + Expo) permettant aux sportifs de découvrir des clubs et événements sportifs, de partager des posts, et de se parler via un système de messagerie. L'application est en français.

═══════════════════════════════════════════════════════
STACK TECHNIQUE OBLIGATOIRE
═══════════════════════════════════════════════════════

- Expo SDK 51, React Native, TypeScript strict
- Expo Router v3 (navigation basée sur fichiers, dans /app)
- NativeWind v4 (Tailwind CSS pour React Native) — TOUS les styles via className
- Zustand (state management global)
- TanStack Query v5 (@tanstack/react-query) — toutes les requêtes asynchrones
- Supabase (@supabase/supabase-js v2) — auth + DB + storage + realtime
- React Hook Form + Zod — tous les formulaires
- Expo Image (expo-image) — toutes les images
- @expo/vector-icons (Ionicons exclusivement) — toutes les icônes
- expo-font + @expo-google-fonts/outfit — typographie
- React Native Reanimated v3 — animations
- React Native Gesture Handler — gestures
- expo-secure-store — stockage sécurisé tokens
- expo-image-picker — sélection photos
- expo-sharing — partage natif
- expo-web-browser — ouverture liens externes
- dayjs — manipulation dates

N'installe pas d'autres dépendances sans raison impérative. Génère un package.json complet avec toutes ces dépendances et leurs versions compatibles Expo SDK 51.

═══════════════════════════════════════════════════════
STRUCTURE DU PROJET
═══════════════════════════════════════════════════════

Génère exactement cette structure :

pulse/
├── app/
│   ├── _layout.tsx                    (root layout, providers, fonts)
│   ├── index.tsx                      (redirect vers /auth ou /(tabs))
│   ├── auth/
│   │   ├── _layout.tsx
│   │   ├── signin.tsx
│   │   └── signup/
│   │       ├── _layout.tsx
│   │       ├── step1.tsx              (langue, nom, username, email, mdp)
│   │       ├── step2.tsx              (date de naissance, pays, ville)
│   │       ├── step3.tsx              (sports pratiqués + niveaux + pratique + fréquence)
│   │       ├── step4.tsx              (sports intéressants, objectifs, taille, poids)
│   │       └── step5.tsx              (bio, photo de profil, découverte, confirmation)
│   └── (tabs)/
│       ├── _layout.tsx                (tab bar avec 5 onglets)
│       ├── feed/
│       │   ├── index.tsx              (feed principal scroll infini)
│       │   └── [postId]/
│       │       └── comments.tsx       (commentaires d'un post)
│       ├── clubs/
│       │   ├── index.tsx              (liste clubs + filtres + recherche)
│       │   └── [clubId].tsx           (détail club)
│       ├── events/
│       │   ├── index.tsx              (liste événements + filtres + recherche)
│       │   └── [eventId].tsx          (détail événement)
│       ├── conversations/
│       │   ├── index.tsx              (liste conversations)
│       │   └── [conversationId].tsx   (conversation)
│       ├── create/
│       │   └── index.tsx              (menu créer)
│       └── profile/
│           └── index.tsx              (profil utilisateur)
├── components/
│   ├── ui/                            (boutons, inputs, cartes, badges, etc.)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Tag.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   └── LoadingSpinner.tsx
│   ├── feed/
│   │   ├── PostCard.tsx
│   │   ├── PostMedia.tsx
│   │   └── CommentItem.tsx
│   ├── clubs/
│   │   ├── ClubCard.tsx               (version liste)
│   │   ├── ClubCardGrid.tsx           (version grille)
│   │   └── ClubFilters.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   ├── EventCardGrid.tsx
│   │   └── EventFilters.tsx
│   ├── conversations/
│   │   ├── ConversationItem.tsx
│   │   └── MessageBubble.tsx
│   └── shared/
│       ├── SearchBar.tsx
│       ├── TabBar.tsx                 (tab bar custom)
│       └── Header.tsx
├── lib/
│   ├── supabase.ts                    (client supabase)
│   ├── queryClient.ts                 (TanStack Query client)
│   └── constants.ts                   (couleurs, sports, niveaux, etc.)
├── hooks/
│   ├── useAuth.ts
│   ├── useFeed.ts
│   ├── useClubs.ts
│   ├── useEvents.ts
│   ├── useConversations.ts
│   └── useProfile.ts
├── stores/
│   ├── authStore.ts                   (Zustand)
│   ├── themeStore.ts                  (dark/light)
│   └── feedStore.ts
├── types/
│   └── index.ts                       (tous les types TypeScript)
├── utils/
│   ├── date.ts
│   ├── format.ts
│   └── validation.ts
├── assets/
│   ├── fonts/
│   ├── images/
│   └── logo/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial.sql            (schéma complet)
│   └── seed/
│       └── seed.sql                   (données seed clubs + événements)
├── app.json
├── babel.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json

═══════════════════════════════════════════════════════
DESIGN SYSTEM — APPLIQUER PARTOUT
═══════════════════════════════════════════════════════

Couleurs (définies dans tailwind.config.js comme custom colors) :
- primary: #1E6BFF
- primary-dark: #1550CC
- accent: #FFD600
- success: #22C55E
- error: #EF4444
- warning: #F59E0B
- neutral-50 à neutral-900 : scale standard

Mode clair : fond #F8FAFC, surfaces #FFFFFF, texte #0F172A
Mode sombre : fond #0A0F1E, surfaces #131929, texte #F8FAFC, bordures #1E293B

Typographie : police Outfit (Regular 400, Medium 500, SemiBold 600, Bold 700)
- Titres h1 : text-2xl font-bold
- Titres h2 : text-xl font-semibold
- Titres h3 : text-lg font-semibold
- Corps : text-base font-normal
- Caption : text-sm text-neutral-500

Rayon bordures cohérent : rounded-xl pour cartes, rounded-full pour avatars/badges, rounded-lg pour inputs/boutons.

Espacement : multiples de 4 (p-4 = 16pt, p-6 = 24pt, gap-4 = 16pt, etc.)

BOUTONS (composant Button.tsx avec variants) :
- primary : bg-primary rounded-xl py-4 px-6 text-white font-semibold
- secondary : border-2 border-primary rounded-xl py-4 px-6 text-primary font-semibold
- ghost : text-primary font-semibold (sans fond ni bordure)
- danger : bg-error rounded-xl py-4 px-6 text-white font-semibold
- disabled : opacity-40 (toujours)
- Feedback tactile sur chaque bouton (Pressable avec animation scale)

INPUTS (composant Input.tsx) :
- Border-2, rounded-xl, padding 14px
- Focus : border-primary
- Error : border-error + message d'erreur en rouge en dessous
- Label au-dessus en text-sm font-medium
- Mode sombre adapté

CARTES (Card.tsx) :
- bg-white dark:bg-neutral-800, rounded-2xl, shadow-sm, overflow-hidden

ANIMATIONS :
- Utiliser Reanimated pour : transitions de pages, press animations (scale 0.97), apparitions (fade + slide)
- Pull-to-refresh avec RefreshControl natif

═══════════════════════════════════════════════════════
AUTHENTIFICATION
═══════════════════════════════════════════════════════

SignIn (app/auth/signin.tsx) :
- Email + mot de passe
- Bouton "Se connecter" (primary)
- Lien "Pas encore de compte ? S'inscrire" → signup/step1
- Lien "Mot de passe oublié" (pas d'implémentation en V1, juste UI)
- Validation : email valide, mot de passe non vide
- Gestion erreur Supabase (mauvais identifiants, etc.)
- Après connexion : redirect vers /(tabs)/feed

Persistance de session :
- Utiliser supabase.auth.onAuthStateChange + SecureStore pour persister la session
- À l'ouverture de l'app, vérifier la session via supabase.auth.getSession()
- Si session valide → direct vers /(tabs)/feed, sinon → /auth/signin

SignUp en 5 étapes avec progress bar en haut (étape X/5) :
- Les données sont accumulées dans un store Zustand (signupStore) entre les étapes
- Validation par étape avant de passer à la suivante (React Hook Form + Zod par étape)
- Bouton "Continuer" / "Précédent" sur chaque étape
- À la dernière étape : appel Supabase Auth + création profil dans table profiles + user_sports + user_objectives

ÉTAPE 1 (step1.tsx) :
- Langue (select : Français, English, Deutsch, Português — valeur par défaut Français)
- Nom complet (text input, obligatoire)
- Username (text input, obligatoire, règles : 3-30 chars, lettres/chiffres/underscore/tiret, pas d'espace, unique — vérifier unicité en temps réel avec debounce 500ms et indicateur ✓/✗)
- Email (email input, obligatoire)
- Mot de passe (password input avec toggle visibilité, obligatoire, règles : min 8 chars, 1 majuscule, 1 chiffre, 1 caractère spécial parmi !@#$%^&*)
- Confirmer mot de passe (obligatoire)

ÉTAPE 2 (step2.tsx) :
- Date de naissance (DateTimePicker natif Expo, obligatoire, âge min 13 ans)
- Pays (select avec liste complète des pays, obligatoire)
- Ville (text input, optionnel)

ÉTAPE 3 (step3.tsx) :
- Sports pratiqués (multi-select parmi les 12 sports, minimum 1 obligatoire)
  - Pour chaque sport sélectionné, afficher dynamiquement :
    - Niveau (select avec niveaux spécifiques au sport, obligatoire)
    - Type de pratique (select avec options spécifiques au sport, obligatoire)
    - Fréquence : jours de la semaine (multi-select lundi-dimanche) + nombre de fois/semaine (number input)

ÉTAPE 4 (step4.tsx) :
- Sports intéressants (multi-select parmi les 12 sports, optionnel)
- Objectifs (multi-select parmi la liste définie, optionnel)
- Taille en cm (number input, optionnel)
- Poids en kg (number input, optionnel)

ÉTAPE 5 (step5.tsx) :
- Biographie (textarea, max 300 chars, optionnel, compteur caractères)
- Photo de profil (expo-image-picker, optionnel — upload vers Supabase Storage bucket 'avatars')
- Comment as-tu découvert Pulse ? (text input, optionnel)
- Cases CGU + Politique de confidentialité (obligatoire cocher avant confirmation)
- Bouton "Créer mon compte" → finalise la création

═══════════════════════════════════════════════════════
BARRE DE NAVIGATION (5 onglets)
═══════════════════════════════════════════════════════

Tab bar custom (TabBar.tsx) placée en bas. Style :
- Fond : bg-white dark:bg-neutral-900, border-t border-neutral-200 dark:border-neutral-800
- Hauteur : 70pt + safe area bottom
- Onglets (de gauche à droite) :

1. Feed      — icône home-outline / home (actif) — label "Social"
2. Clubs     — icône people-outline / people (actif) — label "Clubs"
3. Créer     — icône central, gros bouton rond bleu (#1E6BFF) avec + blanc, taille 56pt, légèrement surélevé (shadow-lg), pas de label
4. Évènements — icône calendar-outline / calendar (actif) — label "Évènements"
5. Messages  — icône chatbubbles-outline / chatbubbles (actif) — label "Messages"

Couleur icône actif : #1E6BFF · Couleur icône inactif : #94A3B8
Label sous icône : text-xs, même couleur

Photo de profil ronde (24×24pt) en haut à droite des pages Feed, Clubs, Messages et Évènements (dans le header), cliquable → profile/index.tsx

═══════════════════════════════════════════════════════
FEED (app/(tabs)/feed/)
═══════════════════════════════════════════════════════

feed/index.tsx :
- Header : titre "Pulse" en Outfit Bold à gauche (couleur primary), barre de recherche au centre (cliquable, expand), avatar profil à droite
- FlatList avec scroll infini (TanStack Query useInfiniteQuery, page size 20, tri chronologique DESC en V1)
- Pull-to-refresh
- Skeleton loading (3 cartes skeleton pendant chargement initial)
- État vide (EmptyState.tsx) si aucun post

PostCard.tsx (chaque post dans le feed) :
- En haut : avatar (rond, 40pt) + nom de l'auteur (font-semibold) + username (@username, text-sm text-neutral-500) + date relative (dayjs, ex: "2h", "3j") — tout cliquable → profil (en V1 : pas de navigation profil public externe, désactivé avec toast "Fonctionnalité bientôt disponible")
- Titre du post : text-lg font-semibold mt-2
- Contenu/description : text-base, si > 3 lignes → tronqué avec "... Voir plus" cliquable pour expand
- Media : si format 'image' ou 'gallery' → expo-image, ratio 16:9, rounded-lg. Si gallery (>1 image) : swiper horizontal (FlatList horizontal)
- Tags : ligne de Tag.tsx (badges arrondis, fond primary/10 opacity, texte primary), cliquables → recherche par tag
- Barre d'actions (ligne) :
  - 💬 Commentaires (icône chatbubble-outline + count) → ouvre comments.tsx en modal/sheet
  - ❤️ Likes (icône heart-outline/heart + count, animation scale + fill rouge au like)
  - 🔗 Partager (icône share-social-outline + count) → expo-sharing
  - 🚩 Signaler (icône flag-outline, tout à droite, plus petit) → alert de confirmation avec champ message optionnel → insert dans table reports
- Séparateur entre posts

feed/[postId]/comments.tsx (modal sheet) :
- Titre "Commentaires (N)"
- FlatList des commentaires (tri par date DESC par défaut, bouton toggle pour trier par likes)
- CommentItem.tsx : avatar (32pt) + nom + date + texte + ❤️ likes (bouton) + count likes
- En bas : champ pour ajouter un commentaire + bouton envoyer
- Fermeture : swipe down ou croix

═══════════════════════════════════════════════════════
CLUBS (app/(tabs)/clubs/)
═══════════════════════════════════════════════════════

clubs/index.tsx :
- Header : titre "Clubs", barre de recherche (full width sous le titre), avatar profil à droite du titre
- Ligne d'actions : icône filtres (funnel-outline) à gauche + sélecteur de présentation (list/grid) à droite
- Sélecteur filtres : bottom sheet avec les filtres suivants :
  - Sport : multi-select (chips) parmi les 12 sports
  - Pays/Ville : text input
  - Niveau requis : select
  - Source : toggles "Internes" / "Externes"
  - Favoris uniquement : toggle
  - Tri : select (Pertinence / A→Z / Z→A / Plus de membres / Moins de membres / Récent / Ancien)
- Deux modes d'affichage gérés par state local :
  - Liste : ClubCard.tsx (carte horizontale compacte)
  - Grille : ClubCardGrid.tsx (2 colonnes, card verticale)
- FlatList / FlatList numColumns={2} avec scroll infini (TanStack Query, page size 20)
- Pull-to-refresh
- Skeleton loading, EmptyState

ClubCard.tsx (mode liste) :
- Image logo à gauche (60×60pt, rounded-xl), infos à droite
- Nom (font-semibold, 1 ligne max), sport badge, ville + pays, nombre de membres
- Badge "Source externe" (si is_external, petit badge orange)
- Boutons : ❤️ (favori) et 🔗 (partager) à droite
- Clic sur la carte → [clubId].tsx

ClubCardGrid.tsx (mode grille) :
- Image en haut (ratio 4:3, rounded-t-xl), infos en dessous
- Même infos, même boutons

clubs/[clubId].tsx :
- Header : bouton retour (chevron-back) + titre nom du club
- Image hero en haut (si disponible, ratio 16:9), galerie scrollable si plusieurs photos
- Section infos : logo (60pt, rounded-full), nom (text-2xl bold), sport badge, ville, badge source externe
- Description complète
- Infos détaillées : adresse, date fondation, ligue/division, tranche d'âge, niveau requis, email contact
- Section membres (si club interne) : liste d'avatars horizontale scroll avec noms (non cliquables en V1)
- Boutons principaux :
  - ❤️ Favori (toggle)
  - 🔗 Partager
  - Si club EXTERNE : bouton "S'inscrire" (full width, primary) → expo-web-browser vers registration_url
  - Si club INTERNE : bouton "Rejoindre le club" (full width, primary) → crée une join_request + notification au créateur (insert en DB) + toast de confirmation
- Badge "Source externe" avec lien cliquable vers source_url si is_external

═══════════════════════════════════════════════════════
ÉVÉNEMENTS (app/(tabs)/events/)
═══════════════════════════════════════════════════════

Identique dans sa structure à l'onglet Clubs avec les adaptations suivantes :

Filtres événements :
- Sport, Pays/Ville, Date (date picker range), Niveau requis, Difficulté (1-5, slider), Catégorie, Payant/Gratuit, Source, Favoris
- Tri : Date (prochain) / Pertinence / A→Z / Prix ↑ / Prix ↓ / Difficulté ↑↓

EventCard.tsx (liste) :
- Photo à gauche (60×60pt), nom, sport badge, date formatée (dayjs), ville, prix (gratuit/Xeur), badge difficulté étoiles (1-5)
- Badge "Source externe" si applicable
- Boutons ❤️ + 🔗

events/[eventId].tsx :
- Mêmes sections qu'un détail de club, adaptées aux données d'événements
- Infos : date(s) début/fin, lieu, prix, difficulté (étoiles), catégorie, places disponibles/totales, club lié (si présent)
- Bouton "S'inscrire" (externe) ou "Demander à participer" (interne) → même logique que clubs

═══════════════════════════════════════════════════════
CONVERSATIONS (app/(tabs)/conversations/)
═══════════════════════════════════════════════════════

conversations/index.tsx :
- Header : titre "Messages", avatar profil à droite
- Barre de recherche (filtre la liste localement)
- FlatList de ConversationItem.tsx (tri : épinglées d'abord → date dernier message DESC)
- Pull-to-refresh

ConversationItem.tsx :
- Avatar interlocuteur (40pt, rounded-full) à gauche
- Nom interlocuteur (font-semibold) + aperçu dernier message (1 ligne, text-neutral-500)
- Date dernière activité (dayjs relative) à droite en haut
- Badge non lu (cercle bleu avec nombre) si messages non lus
- 3 petits points (ellipsis-vertical) à droite → action sheet avec :
  - "Épingler" / "Désépingler"
  - "Télécharger" → génère un fichier .jsonl et le partage via expo-sharing
  - "Signaler" → confirmation + message optionnel → insert reports + mention données partagées avec équipe
  - "Supprimer" → confirmation → soft delete (left_at = now())

conversations/[conversationId].tsx :
- Header : chevron-back + nom interlocuteur (font-semibold) + settings icon → modal paramètres (V2, toast pour l'instant)
- FlatList inversée (messages du bas vers le haut), groupés par date (séparateur date)
- MessageBubble.tsx :
  - Messages de l'utilisateur : alignés droite, fond primary (#1E6BFF), texte blanc, rounded-2xl rounded-tr-sm
  - Messages interlocuteur : alignés gauche, fond neutral-100 dark:neutral-800, texte normal, rounded-2xl rounded-tl-sm
  - Sous chaque message : nom de l'envoyeur + heure (text-xs text-neutral-400)
  - Si message supprimé : afficher "Message supprimé" en italique grisé
  - Long press → action sheet : "Supprimer" (si sien) / "Masquer" (si autre) — implémentation basique en V1
- En bas : KeyboardAvoidingView avec barre de saisie :
  - TextInput (multiline, max 4 lignes) avec placeholder "Message..."
  - Bouton envoyer (icon send, primary) → insert message en DB → Supabase Realtime met à jour la liste
  - Supabase Realtime (subscription) pour recevoir les nouveaux messages en temps réel

Gestion Realtime :
- Abonnement `supabase.channel('conversation:id').on('postgres_changes', ...)` au montage du composant conversation
- Désabonnement au démontage

═══════════════════════════════════════════════════════
CRÉER (app/(tabs)/create/)
═══════════════════════════════════════════════════════

create/index.tsx :
- Page avec 4 grandes cartes d'options :
  1. "Nouveau post" (icône image-outline) → si profil complet (name, email, au moins 1 sport) → modal de création de post, sinon toast "Complète ton profil pour poster"
  2. "Nouveau club" (icône people-outline) → toast "Fonctionnalité disponible dans la prochaine version" (V2)
  3. "Nouvel événement" (icône calendar-outline) → toast "Fonctionnalité disponible dans la prochaine version" (V2)
  4. "Nouvelle conversation" (icône chatbubble-outline) → modal de création de conversation

Création de post (modal/sheet) :
- Titre (text input, obligatoire, max 100 chars)
- Description (textarea, optionnel, max 2000 chars, compteur)
- Format : boutons toggle "Texte seul" / "Image" / "Galerie"
  - Si Image ou Galerie → bouton "Ajouter des photos" → expo-image-picker (1 image si Image, max 5 si Galerie) → upload vers Supabase Storage bucket 'posts'
- Tags (text input avec auto-complétion basique, séparés par espace ou virgule, max 10 tags, préfixe # auto-ajouté)
- Bouton "Publier" → insert dans table posts → navigate vers feed → toast "Post publié !"

Création de conversation (modal/sheet) :
- Recherche d'utilisateur par username (debounce 500ms, cherche dans table profiles)
- Résultats : liste d'utilisateurs avec avatar + nom + username, cliquables
- Sur sélection → vérifier si conversation 1:1 existe déjà avec cet utilisateur → si oui navigate vers cette conversation, sinon créer nouvelle conversation + conversation_participant pour les 2 → navigate vers la conversation

═══════════════════════════════════════════════════════
PROFIL (app/(tabs)/profile/)
═══════════════════════════════════════════════════════

profile/index.tsx :
- Header : "Mon Profil" + bouton "Modifier" (top right, ghost)
- En haut : avatar (80pt, rounded-full, border-2 border-primary) + nom (text-2xl bold) + @username (text-neutral-500)
- Infos de profil (dans des cards séparées par section) :
  - Infos personnelles : Bio, pays, ville, âge (calculé depuis birth_date), langue
  - Sports : pour chaque sport : nom + niveau + pratique + fréquence
  - Taille / Poids (si renseigné)
  - Objectifs (badges)
- Clubs : section avec liste des clubs (privés + publics) où l'utilisateur est membre (ClubCard mini)
- Événements : section avec liste des événements à venir où inscrit (EventCard mini)
- Bouton "Activer le profil public" → toast "Fonctionnalité disponible dans la prochaine version"
- Paramètres :
  - Toggle mode sombre (met à jour themeStore + AsyncStorage pour persistance)
  - Langue (select)
  - Sécurité : champ email (afficher/masquer toggle) + champ mot de passe (masqué, afficher/masquer toggle)
- Bouton "Supprimer mon compte" (danger, ghost) → confirmation avec saisie mot de passe → supabase.auth.deleteUser() + soft delete profiles
- Bouton "Se déconnecter" (secondary) → supabase.auth.signOut() → redirect auth/signin

Modification profil (modal/sheet) :
- Permet de modifier : nom, bio, ville, taille, poids, objectifs, photo de profil, sports (ajouter/supprimer/modifier niveaux)
- Validation + update en DB

═══════════════════════════════════════════════════════
DONNÉES SEED (supabase/seed/seed.sql)
═══════════════════════════════════════════════════════

Génère un fichier seed.sql avec :
- 50+ clubs réalistes (10+ par sport parmi les 12 sports, mélange internes et externes, pays = Luxembourg, France, Belgique principalement)
  - Chaque club a : id (gen_random_uuid()), name, sport, description, short_description, country, city, address, latitude, longitude, logo_url (URL Unsplash sport-related), registration_url (URL plausible type <https://www.federation-sport.lu/inscription>), is_external (60% true, 40% false), source_url (si externe), source_name (si externe)
- 30+ événements réalistes (variation de sports, dates futures 2025-2026, mix payant/gratuit, différentes difficultés, certains liés à des clubs du seed)

═══════════════════════════════════════════════════════
SCHÉMA BASE DE DONNÉES (supabase/migrations/001_initial.sql)
═══════════════════════════════════════════════════════

Génère le schéma SQL complet incluant :
- TOUTES les tables listées dans les spécifications ci-dessous
- Row Level Security (RLS) activé sur toutes les tables
- Policies RLS : utilisateur peut lire ses propres données, les données publiques, et écrire ses propres données
- Indexes sur : profiles.username, posts.author_id, posts.created_at, messages.conversation_id, messages.created_at, clubs.sport, clubs.city, events.sport, events.city, events.start_date
- Triggers : updated_at auto-update sur profiles, clubs, events, messages, conversations
- Fonction SQL pour vérifier l'unicité du username (insensible à la casse)

Tables à créer :
profiles, user_sports, user_objectives, follows, clubs, club_members, club_favorites, club_join_requests, events, event_participants, event_favorites, event_join_requests, posts, post_likes, post_comments, comment_likes, conversations, conversation_participants, messages, message_reactions, message_hidden, reports, notifications, user_stats, feed_interactions

(Schéma détaillé : voir la section Modèle de données dans le plan technique — chaque table avec ses colonnes, types, contraintes, FK)

═══════════════════════════════════════════════════════
LIB/CONSTANTES (lib/constants.ts)
═══════════════════════════════════════════════════════

Exporte :
- SPORTS : array des 12 sports avec { id, label, icon (nom Ionicons), color }
  ['football', 'basketball', 'tennis', 'running', 'cycling', 'swimming', 'volleyball', 'handball', 'padel', 'badminton', 'fitness', 'rugby']
- SPORT_LEVELS : objet { sport_id: level[] } avec les niveaux spécifiques à chaque sport
- SPORT_PRACTICES : objet { sport_id: practice[] } avec les types de pratique par sport
- WEEKDAYS : ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
- OBJECTIVES : array de tous les objectifs possibles
- COUNTRIES : array des pays (ISO 3166-1 alpha-2 + label FR)
- LANGUAGES : [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }, ...]
- COLORS : objet avec toutes les couleurs du design system

═══════════════════════════════════════════════════════
GESTION DES ERREURS ET ÉTATS
═══════════════════════════════════════════════════════

- Chaque page async doit gérer : loading (Skeleton), error (ErrorState.tsx avec bouton réessayer), empty (EmptyState.tsx avec message contextuel)
- ErrorState.tsx : icône alert-circle-outline, message d'erreur, bouton "Réessayer"
- EmptyState.tsx : icône contextuelle (ex: people pour clubs), titre, sous-titre, bouton CTA optionnel
- Toasts/snackbars pour actions utilisateur (succès/erreur) — utiliser react-native-toast-message
- Si erreur réseau → message "Vérifiez votre connexion internet"
- LoadingSpinner.tsx : ActivityIndicator aux couleurs primary, utilisé dans les boutons et chargements inline

═══════════════════════════════════════════════════════
SAFE AREAS & BONNES PRATIQUES
═══════════════════════════════════════════════════════

- Utiliser SafeAreaProvider + SafeAreaView (react-native-safe-area-context) pour toutes les screens
- KeyboardAvoidingView dans les formulaires et la conversation
- StatusBar adaptée au mode (dark/light)
- Toujours tester les zones de sécurité iPhone (notch, Dynamic Island) et Android
- ScrollView avec bounces={false} sur Android pour éviter l'effet de scroll indésiré
- Utiliser useFocusEffect pour les subscriptions Supabase Realtime

═══════════════════════════════════════════════════════
CONFIGURATION FILES
═══════════════════════════════════════════════════════

app.json :
- name: "Pulse", slug: "pulse"
- scheme: "pulse" (pour deep links futurs)
- ios.bundleIdentifier: "com.pulse.app"
- android.package: "com.pulse.app"
- plugins: ["expo-router", "expo-font", "expo-image", "expo-secure-store", "expo-image-picker", "expo-notifications"]

babel.config.js : presets expo + NativeWind babel plugin

tailwind.config.js :
- content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"]
- theme.extend avec TOUTES les couleurs custom listées dans le design system
- darkMode: 'class'

tsconfig.json : strict mode, paths aliases (@/components, @/lib, @/hooks, @/stores, @/types, @/utils)

lib/supabase.ts :
- Utiliser les variables d'environnement EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY
- Configurer le auth storage avec expo-secure-store (AsyncStorage dans supabase-js v2)
- Exporter le client supabase typé avec les types générés

═══════════════════════════════════════════════════════
INSTRUCTIONS FINALES
═══════════════════════════════════════════════════════

1. Génère TOUS les fichiers listés dans la structure. Ne saute aucun fichier.
2. Chaque composant doit être fonctionnel, complet et correctement typé en TypeScript.
3. Tous les imports doivent être corrects et cohérents.
4. Le code doit pouvoir tourner sans modification après `npm install` et configuration des variables d'environnement Supabase.
5. Commence par : package.json → app.json → babel.config.js → tailwind.config.js → tsconfig.json → lib/ → types/ → stores/ → hooks/ → components/ui/ → puis les screens dans l'ordre app/_layout.tsx, auth/, (tabs)/ → enfin supabase/migrations/ et supabase/seed/.
6. Pour les TODO ou fonctionnalités V2, mettre un commentaire // TODO V2: [description] et un toast "Fonctionnalité bientôt disponible" dans l'UI.
7. Le code doit être propre, commenté (JSDoc sur les hooks et utils), et suivre les conventions React Native/Expo.
8. NativeWind UNIQUEMENT pour le styling — zéro StyleSheet.create() sauf si absolument nécessaire pour des cas non supportés par NativeWind.