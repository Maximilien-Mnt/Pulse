# Pulse V3 - Documentation

## Nouvelles fonctionnalités V3

### 1. Synchronisation données externes

#### Edge Functions

- **`supabase/functions/geocode/index.ts`** - Géocodage d'adresses via Nominatim
  - Entrée: `{ address: string }`
  - Sortie: `{ latitude, longitude, display_name }`

- **`supabase/functions/sync-external-data/index.ts`** - Sync clubs/événements OpenStreetMap
  - Trigger: Cron quotidien 3h UTC
  - Sources: OpenStreetMap (Overpass API) pour LU, FR, BE
  - Tables: `external_clubs`, `external_events`

#### Tables

- `external_clubs` - Clubs sportifs externes synchronisés
- `external_events` - Événements sportifs externes
- `invitation_tokens` - Tokens d'invitation pour clubs/événements privés
- `user_settings` - Paramètres utilisateur (opt-out analytics)

### 2. Géolocalisation avancée

#### Filtres disponibles
- Tri "Proche de moi" avec calcul de distance Haversine
- Slider rayon de distance (1km-100km)

#### Fonctions DB
- `get_nearby_clubs(lat, lon, radius_km)` - Clubs à proximité
- `get_nearby_events(lat, lon, radius_km)` - Événements à proximité
- `calculate_distance(lat1, lon1, lat2, lon2)` - Distance entre deux points

### 3. Vidéos dans les posts

#### Création
- Format "Vidéo" ajouté aux options de création
- expo-image-picker avec `mediaTypes: ['videos']`
- Limite: 60 secondes, 100MB
- Upload vers bucket `posts-videos`

#### Affichage
- `PostMedia` gère maintenant le format video
- Thumbnail affichée avec bouton play
- Modal de lecture vidéo

### 4. Deep Links & Invitations

#### Configuration
- Scheme: `pulse://`
-deep links: `pulse://join/club/{clubId}?token={token}`

#### Tables
- `invitation_tokens` avec:
  - `token` unique
  - `type` (club/event)
  - `target_id`
  - `expires_at`
  - `max_uses`
  - `uses_count`

### 5. Analytics (PostHog)

#### Événements trackés
- `screen_view` - Navigation écran
- `post_created` - Création post
- `post_liked` - Like post
- `club_viewed` - Consultation club
- `event_viewed` - Consultation événement
- `conversation_started` - Début conversation
- `profile_viewed` - Consultation profil
- `search_performed` - Recherche

#### Configuration
- `EXPO_PUBLIC_POSTHOG_KEY` dans .env
- RGPD: Toggle opt-out dans paramètres profil

### 6. Recherche avancée (Feed)

#### Fonctionnalités
- Recherche full-text avec `to_tsvector`/`to_tsquery`
- Filtres: Format (texte/image/galerie/vidéo), Tag
- Tri: Pertinence / Date / Likes / Commentaires
- Historique de recherche (5 dernières)

#### Table
- `search_history` - Historique des recherches utilisateur

#### Fonction DB
- `search_posts(query, limit, offset, format, tag)`

### 7. Améliorations UX/Perf

#### Images
- expo-image avec `cachePolicy: "memory-disk"`
- Lazy loading avec placeholder blur

#### Listes
- Pagination cursor-based (au lieu d'offset)
- Prefetch des données probables

#### Offline
- Cache TanStack Query pour données récentes

## Variables d'environnement

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# PostHog
EXPO_PUBLIC_POSTHOG_KEY=your-posthog-key
POSTHOG_HOST=https://eu.i.posthog.com

# App
EXPO_PUBLIC_APP_SCHEME=pulse
```

## Scripts

```bash
# Seed données externes
npx tsx scripts/seed-external.ts

# Déployer Edge Functions
supabase functions deploy geocode
supabase functions deploy sync-external-data
```

## Migration

```bash
# Appliquer migration V3
psql -h your-host -U postgres -d postgres -f supabase/migrations/003_v3.sql
```

## API Endpoints

### Géocodage
```
POST /functions/v1/geocode
Body: { "address": "Paris, France" }
```

### Sync données externes
```
POST /functions/v1/sync-external-data
```

## Notes

- La géolocalisation nécessite permission utilisateur (expo-location)
- Les vidéos sont stockées dans le bucket `posts-videos`
- Les tokens d'invitation expirent après 7 jours par défaut
- La recherche full-text utilise le tokenizer français
