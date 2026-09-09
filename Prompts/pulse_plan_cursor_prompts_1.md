# PULSE — Plan Complet & Prompts Cursor

> Réseau social sportif mobile · Expo + React Native + Supabase · TypeScript

---

## 1. RÉSOLUTION DES INCERTITUDES

### Sports supportés (V1 — 12 sports)
Football, Basketball, Tennis, Running/Course à pied, Cyclisme, Natation, Volleyball, Handball, Padel, Badminton, Fitness/Musculation, Rugby.  
**Pourquoi ces 12 ?** Large couverture Europe/Luxembourg, disciplines avec le plus de clubs/événements locaux existants, bonne diversité entre sports d'équipe et individuels.

### Niveaux par sport
- Sports collectifs (Football, Basketball, Volleyball, Handball, Rugby) : Débutant · Récréatif · Amateur · Semi-Pro · Professionnel
- Sports de raquette (Tennis, Padel, Badminton) : Débutant · Intermédiaire · Avancé · Classé · Expert
- Sports individuels (Running, Cyclisme, Natation) : Débutant · Intermédiaire · Avancé · Compétiteur · Élite
- Fitness/Musculation : Débutant · Intermédiaire · Avancé · Expert

### Pratique par sport (exemples)
- Fitness/Musculation : À domicile sans équipement / À domicile avec équipement / Salle de sport / Extérieur
- Running : Route / Trail / Piste / Tapis
- Cyclisme : Route / VTT / Piste / Vélo de ville / Gravel
- Football/Basketball/etc. : En club / Entre amis / En compétition amateur / En compétition professionnelle

### Formats de posts (V1)
Texte (max 2000 car.), Image unique, Galerie (max 5 images). Vidéo et audio reportés en V2.

### Récupération données externes
**V1 — Seed statique** : JSON/SQL pré-remplis de clubs et événements réels (>50 clubs, >30 événements), importés en Supabase. Chaque entrée a un `source_url` pointant vers le site officiel.  
**V2 — Sync manuelle** : Script Node.js + cron Supabase Edge Function pour fetcher des APIs publiques (OpenStreetMap Overpass pour localisation, éventuellement Sports Open Data, APIs nationales selon pays).  
**V3 — Scraping/API structurée** : Intégration Apify ou équivalent pour sites sans API.

Sources recommandées pour seed V1 (Luxembourg/FR) : fédérations nationales (FLF football, FLBB basketball, etc.), SportEasy, HelloAsso, Decathlon Events.

### Données clubs (obligatoires/facultatifs)
**Obligatoires** : nom, sport, pays, ville, description courte, lien_inscription_ou_contact, type (interne/externe)  
**Facultatifs** : logo, photos[], adresse_exacte, email_contact, site_web, date_creation, ligue_division, nombre_membres, capitaine, horaires_entrainement, age_min, age_max, niveau_requis, lien_source_externe

### Données événements (obligatoires/facultatifs)
**Obligatoires** : nom, sport, date_debut, pays, ville, description_courte, lien_inscription_ou_contact, type (interne/externe)  
**Facultatifs** : date_fin, adresse_exacte, photos[], prix, niveau_requis, age_min, age_max, nombre_places, nombre_places_restantes, club_lie_id, site_web, lien_source_externe, difficulte (1–5), categorie (compétition/loisir/initiation/stage)

### Tri Clubs
Par pertinence (défaut) · Proximité (si géoloc autorisée) · Alphabétique A→Z · Alphabétique Z→A · Nombre de membres ↓ · Nombre de membres ↑ · Date de création (récent/ancien) · Favoris d'abord

### Filtres Clubs
Sport · Région/Canton/Ville · Niveau requis · Tranche d'âge · Gratuit/Payant · Source (interne/externe) · Favoris · Présence de places disponibles

### Tri Événements
Par date (prochain) · Par pertinence · Proximité · Alphabétique · Prix ↑↓ · Difficulté ↑↓ · Popularité (inscrits)

### Filtres Événements
Sport · Région/Ville · Date (calendrier) · Niveau requis · Difficulté · Tranche d'âge · Payant/Gratuit · Catégorie · Source (interne/externe) · Favoris · Places disponibles

### Présentations (Clubs & Événements)
Liste (cartes compactes) · Grille (2 colonnes) · Galerie (image large)

### Boutons dans liste Clubs
❤️ Favori · 🔗 Partager · (clic sur carte → détail)

### Boutons dans détail Club
❤️ Favori · 🔗 Partager · 🌐 S'inscrire/Contacter · (si club interne) 💬 Demander à rejoindre

### Boutons dans liste Événements
❤️ Favori · 🔗 Partager · (clic sur carte → détail)

### Boutons dans détail Événement
❤️ Favori · 🔗 Partager · 🎫 S'inscrire/Contacter · (si événement interne) 💬 Demander à rejoindre

### Objectifs de profil
Prendre du poids (masse musculaire) · Perdre du poids · Améliorer mon endurance · Améliorer ma technique · Participer à des compétitions · Rencontrer des sportifs · Rejoindre un club · Me remettre en forme · Découvrir de nouveaux sports · M'amuser / pratique loisir

### Contraintes username
3–30 caractères · Lettres, chiffres, underscore (_), tiret (-) · Pas d'espace · Unique · Insensible à la casse (stocké en minuscule) · Pas de mots réservés (admin, pulse, root…)

### Contraintes mot de passe
Min 8 caractères · Au moins 1 majuscule · Au moins 1 chiffre · Au moins 1 caractère spécial (!@#$%^&*) · Max 72 caractères

### Format téléchargement conversation
JSON Lines (.jsonl) : chaque ligne = `{ "timestamp": "…", "sender": "username", "content": "…", "type": "text|image|file" }` + header JSON avec métadonnées de la conversation.

### Signalements (posts & conversations)
Stockés dans table Supabase `reports` avec champ `type` (post/message/conversation), `content_id`, `reporter_id`, `reason` (texte libre, max 500), `status` (pending/reviewed/resolved). Notification automatique par email vers une adresse admin configurée via Supabase Edge Function + Resend (service email).

### Fichiers autorisés dans conversations
Images : jpg, png, webp, gif (max 10 MB) · Documents : pdf (max 25 MB) · Pas de vidéo en V1 (V2)

### Statistiques profil (par défaut)
Temps total sur l'app (heures), Nombre de clubs rejoints, Nombre d'événements auxquels participé, Top 3 tags consultés, Sports les plus consultés, Formats de posts les plus consultés, Événements passés auxquels inscrit

### Statistiques profil public
Tout ci-dessus + Likes cumulés reçus, Commentaires cumulés reçus, Nombre d'abonnés actuels, Nombre total d'abonnements (historique), Nombre de désabonnements, Posts publiés, Clubs publics créés, Événements publics créés, Taux d'engagement moyen (likes+comments/abonnés)

### Suppression de compte
Profil → Paramètres → Supprimer mon compte → Confirmation par saisie du mot de passe → Email de confirmation envoyé → Soft delete (30 jours de grâce) → Suppression définitive. Données anonymisées (messages gardés avec `[Utilisateur supprimé]`).

### Icônes
Bibliothèque `@expo/vector-icons` avec `Ionicons`. Cohérence garantie car même famille.
- Clubs : `people` / `people-outline`
- Événements : `calendar` / `calendar-outline`
- Feed/Social : `home` / `home-outline`
- Conversations : `chatbubbles` / `chatbubbles-outline`
- Créer : `add-circle` / `add-circle-outline`
- Profil : `person-circle`
- Favori : `heart` / `heart-outline`
- Partager : `share-social`
- Signaler : `flag` / `flag-outline`
- Paramètres : `settings`
- Recherche : `search`
- Notifications : `notifications`
- Fermer : `close`
- Retour : `chevron-back`
- Plus d'options : `ellipsis-vertical`

---

## 2. STACK TECHNIQUE

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Framework mobile | **Expo SDK 51** + React Native | Cross-platform, éco-système riche, familier |
| Navigation | **Expo Router v3** (file-based) | Standard moderne, deep linking natif |
| Langage | **TypeScript** | Typage, maintenabilité, DX |
| Styling | **NativeWind v4** (Tailwind pour RN) | Rapidité, cohérence, thème dark/light |
| State global | **Zustand** | Léger, simple, performant |
| Backend/DB | **Supabase** | PostgreSQL, Auth, Storage, Realtime, Edge Functions |
| Requêtes | **TanStack Query v5** | Cache, infinite scroll, sync |
| Formulaires | **React Hook Form** + **Zod** | Validation robuste |
| Images | **Expo Image** + **Cloudinary** (ou Supabase Storage) | Optimisation auto |
| Cartes/Géo | **React Native Maps** + **Expo Location** | Localisation |
| Notifications | **Expo Notifications** | Push iOS/Android |
| Liens externes | **Expo WebBrowser** | Ouvre URLs in-app |
| Analytics (V2) | **PostHog** (self-host ou cloud) | RGPD-friendly |
| Tests | **Jest** + **React Native Testing Library** | Unit + integration |
| CI/CD | **EAS Build** + **EAS Submit** | Build cloud Expo |
| Email (admin) | **Resend** via Supabase Edge Function | Signalements |

---

## 3. MODÈLE DE DONNÉES (Supabase / PostgreSQL)

```sql
-- UTILISATEURS
profiles (
  id uuid PK → auth.users.id,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text,
  avatar_url text,
  country text NOT NULL,
  city text,
  birth_date date NOT NULL,
  height_cm int,
  weight_kg int,
  language text DEFAULT 'fr',
  dark_mode bool DEFAULT false,
  is_public bool DEFAULT false,  -- a un profil public
  public_status jsonb,  -- { football: 'amateur', tennis: 'classé', ... }
  public_photos text[],
  discovery_source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

user_sports (
  id uuid PK,
  user_id uuid FK profiles,
  sport text NOT NULL,
  level text NOT NULL,
  practice_type text NOT NULL,
  frequency_days text[],  -- ['lundi', 'mercredi']
  frequency_per_week int,
  is_interesting_only bool DEFAULT false  -- pas pratiqué, juste intéressé
)

user_objectives (
  user_id uuid FK profiles,
  objective text NOT NULL,
  PRIMARY KEY (user_id, objective)
)

follows (
  follower_id uuid FK profiles,
  following_id uuid FK profiles,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
)

-- CLUBS
clubs (
  id uuid PK DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text NOT NULL,
  description text,
  short_description text,
  country text NOT NULL,
  city text NOT NULL,
  address text,
  latitude float,
  longitude float,
  logo_url text,
  photos text[],
  website_url text,
  registration_url text NOT NULL,
  contact_email text,
  founded_date date,
  league_division text,
  age_min int,
  age_max int,
  level_required text,
  is_external bool DEFAULT false,
  source_url text,
  source_name text,
  creator_id uuid FK profiles,  -- null si externe
  is_private bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

club_members (
  club_id uuid FK clubs,
  user_id uuid FK profiles,
  role text DEFAULT 'member',  -- 'owner', 'admin', 'member'
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
)

club_favorites (
  club_id uuid FK clubs,
  user_id uuid FK profiles,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
)

club_join_requests (
  id uuid PK,
  club_id uuid FK clubs,
  requester_id uuid FK profiles,
  status text DEFAULT 'pending',  -- pending/accepted/rejected
  created_at timestamptz DEFAULT now()
)

-- ÉVÉNEMENTS
events (
  id uuid PK DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text NOT NULL,
  description text,
  short_description text,
  country text NOT NULL,
  city text NOT NULL,
  address text,
  latitude float,
  longitude float,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  price decimal(10,2) DEFAULT 0,
  currency text DEFAULT 'EUR',
  level_required text,
  difficulty int CHECK (difficulty BETWEEN 1 AND 5),
  category text,  -- compétition/loisir/initiation/stage
  age_min int,
  age_max int,
  max_participants int,
  photos text[],
  website_url text,
  registration_url text NOT NULL,
  is_external bool DEFAULT false,
  source_url text,
  source_name text,
  creator_id uuid FK profiles,
  linked_club_id uuid FK clubs,
  is_private bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

event_participants (
  event_id uuid FK events,
  user_id uuid FK profiles,
  role text DEFAULT 'participant',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
)

event_favorites (
  event_id uuid FK events,
  user_id uuid FK profiles,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
)

event_join_requests (
  id uuid PK,
  event_id uuid FK events,
  requester_id uuid FK profiles,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
)

-- FEED / POSTS
posts (
  id uuid PK DEFAULT gen_random_uuid(),
  author_id uuid FK profiles NOT NULL,
  title text NOT NULL,
  content text,
  format text NOT NULL,  -- 'text', 'image', 'gallery'
  media_urls text[],
  tags text[],
  likes_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  is_deleted bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

post_likes (
  post_id uuid FK posts,
  user_id uuid FK profiles,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
)

post_comments (
  id uuid PK DEFAULT gen_random_uuid(),
  post_id uuid FK posts,
  author_id uuid FK profiles,
  content text NOT NULL,
  likes_count int DEFAULT 0,
  is_deleted bool DEFAULT false,
  created_at timestamptz DEFAULT now()
)

comment_likes (
  comment_id uuid FK post_comments,
  user_id uuid FK profiles,
  PRIMARY KEY (comment_id, user_id)
)

-- CONVERSATIONS
conversations (
  id uuid PK DEFAULT gen_random_uuid(),
  name text,  -- null si conversation individuelle
  is_group bool DEFAULT false,
  avatar_url text,
  created_by uuid FK profiles,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

conversation_participants (
  conversation_id uuid FK conversations,
  user_id uuid FK profiles,
  is_pinned bool DEFAULT false,
  pinned_at timestamptz,
  wallpaper_url text,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  is_public_list bool DEFAULT false,  -- dans liste publique ou privée
  PRIMARY KEY (conversation_id, user_id)
)

messages (
  id uuid PK DEFAULT gen_random_uuid(),
  conversation_id uuid FK conversations,
  sender_id uuid FK profiles,
  content text,
  type text DEFAULT 'text',  -- 'text', 'image', 'file'
  file_url text,
  file_name text,
  is_deleted bool DEFAULT false,
  is_edited bool DEFAULT false,
  pinned_until timestamptz,
  pinned_by uuid FK profiles,
  reply_to_id uuid FK messages,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

message_reactions (
  id uuid PK,
  message_id uuid FK messages,
  user_id uuid FK profiles,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now()
)

message_hidden (  -- messages masqués par un utilisateur
  message_id uuid FK messages,
  user_id uuid FK profiles,
  PRIMARY KEY (message_id, user_id)
)

-- SIGNALEMENTS
reports (
  id uuid PK DEFAULT gen_random_uuid(),
  reporter_id uuid FK profiles,
  content_type text NOT NULL,  -- 'post', 'comment', 'message', 'conversation'
  content_id uuid NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
)

-- NOTIFICATIONS
notifications (
  id uuid PK DEFAULT gen_random_uuid(),
  recipient_id uuid FK profiles,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  is_read bool DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- STATISTIQUES UTILISATEUR
user_stats (
  user_id uuid PK FK profiles,
  total_time_minutes int DEFAULT 0,
  posts_created int DEFAULT 0,
  total_likes_received int DEFAULT 0,
  total_comments_received int DEFAULT 0,
  total_followers_gained int DEFAULT 0,
  total_followers_lost int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
)

-- INTERACTIONS FEED (pour algorithme)
feed_interactions (
  id uuid PK,
  user_id uuid FK profiles,
  post_id uuid FK posts,
  interaction_type text,  -- 'view', 'like', 'comment', 'share', 'save'
  created_at timestamptz DEFAULT now()
)
```

---

## 4. UI/UX & DESIGN SYSTÈME

### Palette de couleurs
```
Primaire    : #1E6BFF (Pulse Blue)
Primaire dim: #1550CC
Accent      : #FFD600 (Éclair Jaune)
Succès      : #22C55E
Erreur      : #EF4444
Warning     : #F59E0B
Neutre 50   : #F8FAFC
Neutre 100  : #F1F5F9
Neutre 200  : #E2E8F0
Neutre 400  : #94A3B8
Neutre 600  : #475569
Neutre 800  : #1E293B
Neutre 900  : #0F172A

Dark mode (bg principal) : #0A0F1E
Dark mode (surface)      : #131929
Dark mode (bordures)     : #1E293B
```

### Typographie
- Display/Titres : `Outfit` (Bold 700, SemiBold 600)
- Corps/Interface : `Outfit` (Regular 400, Medium 500)
- Monospace (stats) : `JetBrains Mono`
- Import via `expo-font` ou Google Fonts via `@expo-google-fonts/outfit`

### Espacement (système 4pt)
4, 8, 12, 16, 20, 24, 32, 40, 48, 64

### Rayons de bordure
`rounded-sm` 4 · `rounded` 8 · `rounded-md` 12 · `rounded-lg` 16 · `rounded-xl` 20 · `rounded-full` 9999

### Ombres
Légère : `shadow-sm` · Moyenne : `shadow-md` · Forte : `shadow-lg`

### Boutons
- **Primaire** : fond `#1E6BFF`, texte blanc, `rounded-xl`, padding 16×20
- **Secondaire** : fond transparent, bordure `#1E6BFF`, texte `#1E6BFF`
- **Ghost** : fond transparent, texte `#1E6BFF`, pas de bordure
- **Danger** : fond `#EF4444`, texte blanc
- **Désactivé** : opacité 0.4
- **Icon seul** : fond neutre translucide, icône centrée, `rounded-full`

### Animations
- Navigation tabs : slide + fade
- Cartes : scale 0.98 au press
- Modales/sheets : slide from bottom (reanimated)
- Loading : skeleton screens animés (pulse)
- Pull-to-refresh : spinner avec logo Pulse
- Likes : animation coeur (scale + couleur)

---

## 5. VERSIONS

### V1 — Core Foundation *(à générer en premier)*
**Ce qui est inclus :**
- ✅ Auth complet (SignUp multi-étapes, SignIn, persistance)
- ✅ Profil de base (pas de profil public — V2)
- ✅ Feed : posts texte + image, likes, commentaires, partage (lien)
- ✅ Clubs : liste avec ~50 clubs seed, filtres basiques, détail, favoris
- ✅ Événements : liste avec ~30 événements seed, filtres basiques, détail, favoris
- ✅ Conversations : liste, conversation individuelle, messages texte
- ✅ Créer : post (si profil complet), conversation individuelle
- ✅ Navigation 5 onglets
- ✅ Design system complet (dark/light mode)
- ✅ Notifications locales

**Ce qui est exclu intentionnellement :**
- ❌ Profil public (V2)
- ❌ Création clubs/événements (V2)
- ❌ Conversations de groupe (V2)
- ❌ Algorithme de feed avancé (V2, feed chronologique en V1)
- ❌ Données externes live (données seed statiques)
- ❌ Réactions aux messages (V2)
- ❌ Fichiers dans conversations (V2)
- ❌ Statistiques avancées (V2)

---

### V2 — Profil Public & Social Complet
**Ce qui s'ajoute :**
- ✅ Profil public (création, galerie, abonnements)
- ✅ Création clubs privés et publics
- ✅ Création événements privés et publics
- ✅ Conversations de groupe
- ✅ Réactions messages (emojis)
- ✅ Fichiers/images dans conversations
- ✅ Épingles messages/conversations
- ✅ Signalements (posts, messages, conversations)
- ✅ Notifications push (Expo Notifications + Supabase Realtime)
- ✅ Algorithme feed basique (interactions + follows)
- ✅ Recherche avancée (feed, profils)
- ✅ Statistiques utilisateur

---

### V3 — Données Externes & Avancé
**Ce qui s'ajoute :**
- ✅ Sync données externes (Edge Functions + APIs fédérations)
- ✅ Algorithme feed avancé (ML-light, scoring complet)
- ✅ Géolocalisation (tri "proche de moi" en live)
- ✅ Vidéos dans posts
- ✅ Paramètres de conversation complets (galerie, fond, recherche)
- ✅ Analytics (PostHog)
- ✅ Lien d'invitation clubs/événements (deep links)
- ✅ PWA/Web (Expo Web)

---

## 6. PROMPTS CURSOR

---

### 🚀 PROMPT V1 — Core Foundation

**À utiliser dans Cursor, mode Agent, dans un dossier vide.**

---

```
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
  - Chaque club a : id (gen_random_uuid()), name, sport, description, short_description, country, city, address, latitude, longitude, logo_url (URL Unsplash sport-related), registration_url (URL plausible type https://www.federation-sport.lu/inscription), is_external (60% true, 40% false), source_url (si externe), source_name (si externe)
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
```

---

### 🔧 PROMPT V2 — Profil Public, Création & Social Complet

**À utiliser dans Cursor, mode Agent, dans le projet V1 existant.**

---

```
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
```

---

### 🌐 PROMPT V3 — Données Externes, Géolocalisation & Avancé

**À utiliser dans Cursor, mode Agent, dans le projet V2 existant.**

---

```
Tu travailles sur l'application Pulse (V2 déjà implémentée). Tu dois maintenant implémenter la V3 : intégration de données externes, géolocalisation avancée, et fonctionnalités supplémentaires.

═══════════════════════════════════════════════════════
1. SYNCHRONISATION DONNÉES EXTERNES
═══════════════════════════════════════════════════════

Créer un système de sync des clubs et événements externes :

supabase/functions/sync-external-data/index.ts :
- Fonction Supabase Edge Function déclenchée par cron (quotidienne, 3h du matin UTC)
- Sources à synchroniser :
  a. OpenStreetMap Overpass API : clubs sportifs (amenity=club, sport=*) par pays (LU, FR, BE)
     URL : https://overpass-api.de/api/interpreter avec query Overpass QL
     → transformer chaque résultat en format clubs table (name, sport, address, latitude, longitude, website)
  b. HelloAsso API (FR, si disponible publiquement) : événements sportifs
  c. Données statiques enrichies : parser les JSONs de seed et les mettre à jour

- Pour chaque club/event synchronisé :
  - Upsert dans la table (basé sur source_url comme clé unique)
  - is_external = true, source_name = 'OpenStreetMap' / 'HelloAsso' / etc.
  - Géocodage si latitude/longitude absents : utiliser Nominatim (OpenStreetMap) API gratuite

supabase/functions/geocode/index.ts :
- Prend une adresse en input
- Appelle https://nominatim.openstreetmap.org/search
- Retourne latitude + longitude
- Appelé lors de la création d'un club/event (si adresse fournie mais pas de coordonnées)

═══════════════════════════════════════════════════════
2. GÉOLOCALISATION AVANCÉE (TRI "PROCHE DE MOI")
═══════════════════════════════════════════════════════

Dans clubs/index.tsx et events/index.tsx :
- Activer le tri "Proche de moi" : utiliser expo-location pour obtenir la position de l'utilisateur
- Si permission accordée : calculer la distance (formule Haversine) entre position et latitude/longitude de chaque club/event
- Afficher la distance calculée sur les cartes (ex: "2.3 km")
- Le tri "Proche de moi" trie par distance ASC
- Si permission refusée : toast explicatif + tri par défaut

Ajouter dans les filtres clubs/events :
- Rayon de distance (slider 1km–100km, visible uniquement si géoloc activée)

═══════════════════════════════════════════════════════
3. VIDÉOS DANS LES POSTS
═══════════════════════════════════════════════════════

Dans create/index.tsx (création post) :
- Ajouter format "Vidéo" aux options
- expo-image-picker avec mediaTypes: ['videos'], max 60 secondes, max 100MB
- Upload vers Supabase Storage bucket 'posts-videos'
- Thumbnail automatique (première frame) générée côté client avec expo-video-thumbnails

Dans PostCard.tsx :
- Si format = 'video' : afficher le player vidéo (expo-video ou react-native-video)
- Autoplay muté en scroll, bouton unmute
- Thumbnail en préchargement

═══════════════════════════════════════════════════════
4. DEEP LINKS & LIENS D'INVITATION
═══════════════════════════════════════════════════════

Configurer Expo Router pour les deep links (app scheme "pulse://") :

Liens d'invitation clubs/events privés :
- Dans les pages de détail des clubs/events privés dont l'utilisateur est owner :
  - Bouton "Copier le lien d'invitation" → génère un lien pulse://join/club/{clubId}?token={uniqueToken}
  - Token unique stocké dans une table invitation_tokens (id, type, target_id, token, expires_at, max_uses)
  - Quand un lien est ouvert : vérifier token, si valide → proposer de rejoindre le club/event
  - Fonctionne pour les personnes hors app (ouvre l'app via deep link ou redirige vers store)

═══════════════════════════════════════════════════════
5. ANALYTICS (PostHog)
═══════════════════════════════════════════════════════

Intégrer posthog-react-native :
- Initialiser avec EXPO_PUBLIC_POSTHOG_KEY
- Tracker les events : screen_view, post_created, post_liked, club_viewed, event_viewed, conversation_started, profile_viewed, search_performed
- Identifier l'utilisateur après connexion (posthog.identify(userId, { ...props }))
- Ne pas tracker d'informations personnelles sensibles
- Respecter le RGPD : ajouter toggle opt-out dans les paramètres du profil

═══════════════════════════════════════════════════════
6. RECHERCHE AVANCÉE (FEED)
═══════════════════════════════════════════════════════

Améliorer la recherche dans feed/index.tsx :
- Quand la barre de recherche est activée, afficher un panneau avec :
  - Sélecteur de type de recherche (chips) : "Profils", "Titre de post", "Description", "Tag"
  - Tri des résultats : Pertinence / Date / Likes / Commentaires / Partages
  - Filtres : Format (texte/image/galerie/vidéo), Tag spécifique (input)
- Implémenter la recherche full-text avec Supabase (to_tsvector / to_tsquery sur posts.title et posts.content)
- Résultats en temps réel (debounce 500ms)
- Historique de recherche (5 dernières, stocké AsyncStorage)

═══════════════════════════════════════════════════════
7. AMÉLIORATIONS UX & PERFORMANCES
═══════════════════════════════════════════════════════

- Mettre en cache les images avec expo-image (contentFit, cachePolicy: 'memory-disk')
- Implementer FlashList (Shopify) à la place de FlatList partout pour meilleures performances
- Pagination cursor-based (au lieu d'offset) pour feed + clubs + events
- Prefetch des données probables (prochaine page du feed au scroll)
- Images : lazy loading avec blur placeholder (blurhash depuis Supabase)
- Offline mode basique : afficher les dernières données chargées depuis le cache TanStack Query

═══════════════════════════════════════════════════════
INSTRUCTIONS V3
═══════════════════════════════════════════════════════

1. Génère supabase/migrations/003_v3.sql pour les nouvelles tables (invitation_tokens, etc.)
2. Génère toutes les Edge Functions dans supabase/functions/
3. Mets à jour le fichier .env.example avec les nouvelles variables (POSTHOG_KEY, etc.)
4. Documente les nouveaux endpoints et fonctions dans un README.md mis à jour.
5. Génère un script scripts/seed-external.ts pour pré-remplir la DB avec des données réalistes enrichies.
```

---

## 7. RÉSUMÉ EXÉCUTIF

### Comment sera faite l'application

**Stack finale :** Expo SDK 51 + React Native + TypeScript + Expo Router v3 + NativeWind v4 + Zustand + TanStack Query v5 + Supabase (DB/Auth/Storage/Realtime/Edge Functions)

**Architecture :** Monorepo simple, navigation file-based via Expo Router, state global léger (Zustand pour auth et thème, TanStack Query pour les données serveur), design system unifié via NativeWind/Tailwind.

**Données :** PostgreSQL via Supabase avec RLS, seed statique en V1, sync dynamique en V3. Realtime via Supabase Channels pour la messagerie.

**UI/UX :** Thème bleu primaire (#1E6BFF) + accent jaune (#FFD600), police Outfit, dark mode, icônes Ionicons, animations Reanimated. Logo = éclair jaune sur fond bleu.

### Étapes à suivre

1. **Créer le projet Expo** : `npx create-expo-app pulse --template blank-typescript`
2. **Configurer Supabase** : Nouveau projet sur supabase.com → copier URL + anon key
3. **Lancer le Prompt V1** dans Cursor Agent → générer tout le code de base
4. **Appliquer la migration SQL** dans Supabase Dashboard → SQL Editor → coller 001_initial.sql
5. **Appliquer le seed** → coller seed.sql
6. **Tester la V1** : `npx expo start` → iOS Simulator ou Expo Go
7. **Corriger les bugs** fichier par fichier avec DeepSeek/Cursor
8. **Lancer le Prompt V2** une fois V1 stable
9. **Répéter** jusqu'à V3

### Risques principaux

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| NativeWind v4 instabilité | Moyen | Fallback sur StyleSheet si problème |
| Performance FlatList (feed infini) | Moyen | Migration vers FlashList en V3 |
| Taille du prompt V1 trop grande pour Cursor | Élevé | Diviser en sous-prompts par section si nécessaire |
| Quota Supabase (free tier) | Faible | Limites généreuses pour un MVP |
| APIs externes indisponibles | Moyen | Seed statique en V1 pour contourner |
| Realtime messagerie scalabilité | Faible (MVP) | Supabase Realtime suffit jusqu'à ~1000 users |

---

*Document généré pour le projet Pulse · Version 1.0 · À utiliser avec Cursor Agent mode*
