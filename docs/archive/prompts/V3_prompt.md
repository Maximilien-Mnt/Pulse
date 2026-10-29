Tu travailles sur l'application Pulse (V2 déjà implémentée). Tu dois maintenant implémenter la V3 : intégration de données externes, géolocalisation avancée, et fonctionnalités supplémentaires.

═══════════════════════════════════════════════════════
1. SYNCHRONISATION DONNÉES EXTERNES
═══════════════════════════════════════════════════════

Créer un système de sync des clubs et événements externes :

supabase/functions/sync-external-data/index.ts :
- Fonction Supabase Edge Function déclenchée par cron (quotidienne, 3h du matin UTC)
- Sources à synchroniser :
  a. OpenStreetMap Overpass API : clubs sportifs (amenity=club, sport=*) par pays (LU, FR, BE)
     URL : <https://overpass-api.de/api/interpreter> avec query Overpass QL
     → transformer chaque résultat en format clubs table (name, sport, address, latitude, longitude, website)
  b. HelloAsso API (FR, si disponible publiquement) : événements sportifs
  c. Données statiques enrichies : parser les JSONs de seed et les mettre à jour

- Pour chaque club/event synchronisé :
  - Upsert dans la table (basé sur source_url comme clé unique)
  - is_external = true, source_name = 'OpenStreetMap' / 'HelloAsso' / etc.
  - Géocodage si latitude/longitude absents : utiliser Nominatim (OpenStreetMap) API gratuite

supabase/functions/geocode/index.ts :
- Prend une adresse en input
- Appelle <https://nominatim.openstreetmap.org/search>
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