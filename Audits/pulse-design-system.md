# Pulse — Design System & Brand Guidelines v1.0

**Ton rythme. Ta communauté.**
Identité visuelle & design system pour mobile (React Native) et web (Next.js).

---

## Sommaire

- [Principes de marque](#principes-de-marque)
- [01 — Couleurs](#01--couleurs)
- [02 — Typographie](#02--typographie)
- [03 — Grille & espacement](#03--grille--espacement)
- [04 — Composants](#04--composants)
- [05 — Iconographie](#05--iconographie)
- [06 — Illustration & imagerie](#06--illustration--imagerie)
- [07 — Motion](#07--motion)
- [08 — Écrans clés](#08--écrans-clés)
- [09 — Voix & UX writing](#09--voix--ux-writing)
- [10 — Accessibilité](#10--accessibilité)
- [11 — Gouvernance](#11--gouvernance)

---

## Principes de marque

Pulse s'adresse à des sportifs de 15 à 35 ans, tous niveaux, tous sports. Le nom porte déjà l'idée directrice : le pouls comme rythme cardiaque de l'effort, et comme pouls d'une communauté vivante en temps réel. Cette double lecture (biologique / sociale) est le fil conducteur de toute l'identité — elle apparaît littéralement dans l'UI via un motif signature : **l'anneau qui pulse** (voir section Composants).

| Principe | Description |
|---|---|
| **Vivant, jamais criard** | De l'énergie dans les accents et le mouvement, pas dans le bruit visuel. Une seule couleur vive attire l'œil à la fois. |
| **Sérieux sans être froid** | Ni corporate/fitness-app-B2B, ni ludique/enfantin. Le ton est celui d'un coach respecté : direct, encourageant, jamais infantilisant. |
| **Un système, pas un skin** | Chaque décision (couleur, typo, radius) est un token réutilisable. Le MVP pose la structure que la V2 étendra sans tout refondre. |

---

## 01 — Couleurs

Trois couleurs de marque à rôles distincts + une échelle de neutres chauds. Architecture à deux niveaux : **tokens primitifs** (échelles ci-dessous) → **tokens sémantiques** (`--primary`, `--surface`, `--text-1`…) qui changent de valeur entre thème clair et sombre. Ne jamais coder un hex en dur dans un composant : toujours passer par le token sémantique.

### Primaire — Pulse Blue
*Navigation, actions principales, liens, marque*

| Token | Hex |
|---|---|
| blue-50 | `#EEF2FF` |
| blue-100 | `#DCE6FF` |
| blue-200 | `#B9CDFF` |
| blue-300 | `#8FACFF` |
| blue-400 | `#5C82FF` |
| **blue-500 · primary** | `#3358FF` |
| blue-600 | `#2542DB` |
| blue-700 | `#1B32AD` |
| blue-800 | `#142480` |
| blue-900 | `#0D1852` |

### Secondaire — Ignite Coral
*Énergie, gamification, live, CTA rares*

| Token | Hex |
|---|---|
| coral-50 | `#FFF1EC` |
| coral-100 | `#FFDED2` |
| coral-200 | `#FFBBA3` |
| coral-300 | `#FF9670` |
| coral-400 | `#FF7850` |
| **coral-500 · accent** | `#FF5A36` |
| **coral-600 · texte/bouton** | `#E14A26` |
| coral-700 | `#B83A1B` |
| coral-800 | `#8C2C14` |
| coral-900 | `#5E1D0C` |

### Tertiaire — Thrive Green
*Succès, statut « membre », en ligne*

| Token | Hex |
|---|---|
| green-50 | `#E7FAF1` |
| green-100 | `#C9F4DF` |
| green-200 | `#93E8C0` |
| green-300 | `#5CDBA1` |
| green-400 | `#2ED191` |
| green-500 | `#17C982` |
| green-600 | `#0FA36A` |
| **green-700 · texte** | `#0E7A54` |
| green-800 | `#0A5B3F` |
| green-900 | `#073E2B` |

### Neutres chauds
*Fonds, textes, bordures*

| Token | Hex |
|---|---|
| neutral-0 | `#FFFFFF` |
| neutral-25 | `#FAFAFB` |
| neutral-50 | `#F4F5F7` |
| neutral-100 | `#E8EAED` |
| neutral-200 | `#D3D6DC` |
| neutral-300 | `#B0B4BD` |
| neutral-400 | `#888D97` |
| neutral-500 | `#666B76` |
| neutral-600 | `#4A4F59` |
| neutral-700 | `#33373F` |
| neutral-800 | `#23262C` |
| neutral-900 | `#14161A` |

### États sémantiques

| Token | Hex |
|---|---|
| error-500 | `#E5484D` |
| **error-600 · texte/bouton** | `#C7222D` |
| warning-500 | `#F5A524` |
| info · = primary | `#3358FF` |

### Tokens sémantiques (clair / sombre)

| Token | Clair | Sombre |
|---|---|---|
| `--bg` | neutral-25 `#FAFAFB` | `#0E1015` |
| `--bg-alt` | neutral-50 `#F4F5F7` | `#14171D` |
| `--surface` | neutral-0 `#FFFFFF` | `#171A20` |
| `--border` | neutral-100 `#E8EAED` | `#262A32` |
| `--border-strong` | neutral-200 `#D3D6DC` | `#333842` |
| `--text-1` (primaire) | neutral-900 `#14161A` | `#F5F6F8` |
| `--text-2` (secondaire) | neutral-600 `#4A4F59` | `#A7ACB5` |
| `--text-3` (tertiaire) | neutral-400 `#888D97` | `#767C87` |
| `--primary` | blue-500 `#3358FF` | blue-400 `#5C82FF` |
| `--primary-hover` | blue-600 `#2542DB` | blue-300 `#8FACFF` |
| `--primary-active` | blue-700 `#1B32AD` | `#7A9CFF` |
| `--primary-tint` | blue-50 `#EEF2FF` | `#182240` |

### Règles

| Règle | Détail |
|---|---|
| Un seul accent vif par écran | Le corail est réservé aux moments d'énergie (live, streak, badge) — jamais utilisé comme couleur de bouton par défaut, qui reste bleue. |
| Texte sur couleur | Corail-500 et Green-500 n'ont pas un contraste suffisant pour du texte blanc en petite taille (≈3:1) — utiliser corail-600/green-700 pour tout label, ou une variante « teinte + texte foncé » (chip). |
| Couleur ≠ seul signal | Un statut (membre / en attente / erreur) est toujours accompagné d'une icône ou d'un mot, jamais de la couleur seule (accessibilité daltonisme). |
| Mode sombre | Le bleu et le corail « s'éclaircissent » d'un cran (500→400) en mode sombre pour rester lisibles sur fond foncé — jamais la même valeur qu'en clair. |

### Palette « tags sport »
*Teintes pastel dérivées, cohérentes entre elles*

| Sport | Fond | Texte |
|---|---|---|
| Football | `#E3F6EA` | `#1E7A46` |
| Musculation | `#FFE9E1` | `#C2431B` |
| Basketball | `#FFF1D9` | `#9A5B0A` |
| Course à pied | `#EEF2FF` | `#1B32AD` |
| Tennis | `#F3F8D9` | `#5C6B12` |
| Natation | `#DFF6F7` | `#0E6E74` |
| Cyclisme | `#F0E9FC` | `#5B3B94` |
| Yoga / bien-être | `#FDEAF1` | `#9C2F5C` |

---

## 02 — Typographie

**Space Grotesk** (titres, chiffres) + **Inter** (corps, UI) — une géométrique légèrement technique posée sur une humaniste très lisible. Ni Poppins (trop « startup jouet »), ni un serif éditorial (trop institutionnel). Les deux polices sont nativement supportées par `next/font/google` côté web et par `expo-google-fonts` côté React Native : zéro friction cross-platform.

| Style | Spécification | Exemple |
|---|---|---|
| **Display** | Space Grotesk 700 · 34/40 · tracking -2% | Trouve ton rythme |
| **H1** | Space Grotesk 700 · 26/32 | Clubs près de toi |
| **H2** | Space Grotesk 500 · 20/26 | Créer un événement |
| **Subtitle** | Inter 600 · 17/22 | Marathon de Luxembourg |
| **Body large** | Inter 400 · 16/24 | Séance jambes terminée, 3 records personnels battus |
| **Body** | Inter 400 · 14/20 | On se retrouve samedi 9h au terrain municipal. |
| **Caption** | Inter 500 · 12/16 | Il y a 3 h · Kirchberg |
| **Overline** | Inter 600 · 11/14 · tracking +6% · CAPS | ÉVÉNEMENTS À VENIR |
| **Stat / chiffre** | Space Grotesk 500 · tabular-nums | 1 284 followers |
| **Button label** | Inter 600 · 15/20 | Rejoindre |

### Règles

| Règle | Détail |
|---|---|
| Chiffres | Toujours en `tabular-nums` (compteurs, stats, chronos) pour éviter que les colonnes « sautent » — détail qui renforce la lecture « data sportive ». |
| Une seule display par écran | Space Grotesk Bold n'apparaît qu'une fois par écran (le titre principal) — jamais en cascade sur plusieurs niveaux de hiérarchie. |
| Taille min. | 12px plancher absolu (légal/captions) ; le corps de lecture ne descend jamais sous 14px. |

---

## 03 — Grille & espacement

Base 8px (avec demi-pas 4px pour les ajustements fins). Sous-ensemble volontairement restreint pour garder de la cohérence — s'appuie directement sur l'échelle par défaut de Tailwind (4px par unité), sans valeurs arbitraires.

**Échelle d'espacement (px)** : 4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 80 · 96

| Élément | Valeur |
|---|---|
| Radius xs | 6px |
| Radius sm | 8px (inputs) |
| Radius md | 12px (boutons/chips) |
| Radius lg | 16px (cards) |
| Radius xl | 24px (sheets/modales) |
| Radius full | 999px (avatars/pills) |
| Touch target | 44px min. iOS, 48px min. Android/web |

### Breakpoints

| Breakpoint | Layout |
|---|---|
| `base` <640px | Mobile — colonne unique, tab bar basse à 5 entrées. |
| `md` ≥768px | Tablette / web — la tab bar devient un rail latéral gauche icône seule (72px). |
| `lg` ≥1024px | Desktop — rail étendu avec labels (240px), colonne de contenu centrée max 640px. |
| `xl` ≥1280px | Conteneur global plafonné à 1120–1200px ; espace réservé pour un futur panneau latéral droit (suggestions, tendances). |

---

## 04 — Composants

### Boutons

| Variant | Style | État |
|---|---|---|
| Primaire | Fond `primary`, texte blanc | Hover → blue-600, Active → blue-700 |
| Secondaire | Fond transparent, bordure 1.5px `primary`, texte `primary` | |
| Ghost | Fond transparent, texte `primary`, pas de bordure | |
| Destructif | Fond error-600, texte blanc | Réservé aux actions irréversibles |
| Énergie | Fond coral-600, texte blanc | Max 1 fois par écran |
| Désactivé | Fond neutral-200, texte neutral-400 | |

Hauteur 48px mobile / 44px web · radius 12 · label Inter SemiBold 15px · pression = échelle 0.98 + assombrissement. Le corail « énergie » n'apparaît au maximum qu'une fois par écran.

### Chips filtres

Pill (radius full), hauteur 36px. Inactif : fond `bg-alt`, texte `text-2`. Actif : fond `primary`, texte blanc.
Exemples : `Pour toi` (actif) · `Abonnements` · `🏀 Basket` · `🏃 Course`

### Post card

- **En-tête** : avatar 40px rond, nom (Subtitle) + chip sport tag, meta (Caption) — ex. *Lena Weber · Course · Il y a 3 h · Kirchberg*
- **Corps** : texte (Body 14/20) — ex. *« 10km ce matin avant le boulot, nouveau record perso »*
- **Média** : bloc image/vidéo, radius md
- **Actions** : ❤️ Like (rempli primary si liké, compteur) · 💬 Commenter (compteur) · ↗ Partager

Radius 16 · padding 16 · bordure 1px neutral-100 (le mode sombre remplace l'ombre par une bordure neutral-800, les ombres portées sont peu lisibles sur fond foncé).

### Signature — l'anneau qui pulse

- **Indicateur « live »** : point coral-500 (12px) avec un anneau qui s'étend jusqu'à ~52px en s'estompant, boucle 1.8s ease-out — utilisé pour événement en cours, notification en temps réel.
- **Like** : au tap, le cœur se remplit en **bleu** (pas rouge) + une micro-onde se propage puis s'efface (~700ms).

### Navigation — mobile vs web

**Tab bar mobile (5 entrées)** : Feed · Explorer (Clubs/Événements) · **Créer** (bouton surélevé bleu, 56px) · Messages · Profil.

**≥768px** : la même IA devient un rail latéral gauche (icône+label dès 1024px), le bouton Créer reste circulaire mais posé dans le rail plutôt que flottant.

> *Alternative équivalente (option B)* : tab bar plate à 5 icônes de même poids, sans surélévation du bouton Créer — plus sobre, moins orientée « incitation à publier ». Les deux options sont valides ; l'option A (surélevée) est recommandée pour l'objectif d'engagement du MVP.

---

## 05 — Iconographie

Trait fin uniforme, 1.75px à la grille 24px, angles arrondis. Bibliothèque recommandée : **Lucide** (MIT, `lucide-react-native` + `lucide-react`) — un seul set pour les deux plateformes. État actif = version remplie/duotone du même glyphe, jamais un glyphe différent.

**Icônes clés** : Feed (home) · Explorer (search) · Créer (plus) · Messages (message-circle) · Profil (user) · Like (heart) · Membre (check) · Événement (calendar)

| Taille | Usage |
|---|---|
| 16px | Icônes inline dans le texte, badges denses |
| 20px | Boutons, inputs, listes |
| 24px | Tab bar, navigation principale |
| 32px | États vides, mise en avant d'une fonctionnalité |

---

## 06 — Illustration & imagerie

**À faire**
- Photos/vidéos utilisateurs affichées en couleur naturelle, sans filtre imposé par l'app.
- Illustrations système (onboarding, états vides) en duotone plat bleu+corail (ou bleu+vert pour le positif), trait identique aux icônes.
- Un léger grain (4-6% opacité) sur les illustrations pour éviter l'effet « vecteur corporate ».
- Le dégradé bleu→corail est réservé au hero d'onboarding uniquement.

**À éviter**
- Mascottes ou personnages cartoon (trop enfantin pour la cible).
- Photos stock de sportifs souriants génériques.
- Icônes 3D à ombres portées lourdes.
- Dégradés décoratifs multiples sur un même écran.

---

## 07 — Motion

« Vif et posé » — la confiance d'un athlète, pas le rebond d'un dessin animé. Pas d'overshoot/spring bondissant.

| Contexte | Durée | Easing |
|---|---|---|
| Micro-interaction (tap, toggle) | 120–180ms | ease-out |
| Transition d'écran / sheet | 250–320ms | ease-out (entrée), ease-in (sortie) |
| Anneau qui pulse (signature) | 600–900ms, une fois | ease-out, expand+fade |
| Indicateur « live » en boucle | 1.8s loop, faible amplitude | linear/ease-out doux |

Toujours respecter `prefers-reduced-motion` : désactiver les boucles et micro-ondulations, ne garder que des fondus d'opacité.

---

## 08 — Écrans clés

### Onboarding
1. **Hero** plein écran, fond dégradé bleu→corail à 8% d'opacité, mark + wordmark, headline Display, tagline, CTA primaire « Commencer ».
2. **Sélection des sports pratiqués** : grille de chips (icône+label) multi-sélection, pas de limite arbitraire, CTA activé dès 1 sport choisi.
3. **Création de compte** (email/social), champ profil public/privé expliqué en une phrase (« Public = tes posts sont visibles par tous, tu peux changer à tout moment »).

### Feed
- Top bar : mark 24px à gauche, cloche de notification (badge corail si non lu) à droite.
- Rangée de chips filtres horizontale scrollable (Pour toi / Abonnements / sport), sticky au scroll.
- Liste de post cards, skeleton shimmer neutral-100 pendant le chargement.
- État vide (aucun post) : illustration duotone + « Ton feed est calme. Rejoins un club pour voir plus d'activité. » + CTA vers Explorer.

### Explorer (Clubs & Événements)
- Toggle segmenté en haut : « Clubs » / « Événements ».
- Barre de recherche pill + rangée de chips sport en filtre.
- Club card : cover 16:9, titre H3, nombre de membres, tag sport, bouton d'adhésion à 3 états : **Rejoindre** → **Demande envoyée** → **✓ Membre**.
- Event card : identique + badge date (coin haut-gauche, jour en gros + mois en majuscule caption).

### Créer
- Tap sur le bouton central ouvre une bottom sheet (radius top 24) à 4 choix : Post / Club / Événement / Conversation — chaque ligne = icône 24px + label + chevron.
- Formulaire de création : champs texte spec inputs, sélection sport via chips, aperçu média, CTA primaire en bas fixe « Publier » / « Créer le club » / « Créer l'événement ».

### Messages
- Liste de conversations : avatar 48px, nom (Inter SemiBold, gras si non lu), dernier message tronqué à 1 ligne (regular si lu, semibold si non lu), timestamp caption à droite, petit point bleu si non lu.
- Barre de recherche pill en haut pour filtrer les conversations.

### Profil
- Cover + avatar 96px en superposition, nom (H1), bio (body), tags sport pratiqués.
- Rangée de stats en chiffres tabular-nums (Posts / Clubs / Abonnés).
- Switch « Profil public » bien visible avec micro-explication, toggle vert quand actif.
- Bouton « Modifier le profil » (secondaire), accès paramètres (icône engrenage) → suppression de compte en bouton destructif + modale de confirmation à double validation.

### Bonus — Défis (post-MVP)
Non présent dans le MVP mais le système est prêt à l'accueillir : un « défi » réutilise post card + chip sport + le corail (badge/streak) + l'anneau qui pulse comme indicateur de progression en temps réel. Aucun nouveau token à créer.

---

## 09 — Voix & UX writing

| Principe | Description |
|---|---|
| **Tutoiement** | « Tu » partout — cible 15-35 ans, registre social et direct, jamais infantilisant. |
| **Verbes d'action** | Les boutons sont des verbes à l'infinitif (« Rejoindre », « Publier ») — le mot du bouton doit être celui du message de confirmation qui suit. |
| **Erreurs factuelles** | On dit ce qui s'est passé et comment le corriger, sans « Oups ! » ni excuse superflue. |
| **États vides = invitation** | Un écran vide propose toujours une action concrète, jamais juste un constat. |

---

## 10 — Accessibilité

| Critère | Cible |
|---|---|
| Contraste texte | AA (4.5:1 texte normal, 3:1 texte large/UI) — vérifier chaque nouvelle couleur avec un outil de contraste avant intégration. |
| Zones tactiles | 44px iOS / 48px Android-web minimum. |
| Focus clavier (web) | Anneau de focus visible (2px, blue-300) sur tout élément interactif. |
| Couleur seule | Jamais l'unique porteur d'information (statuts, erreurs toujours + icône/texte). |
| Reduced motion | Respecté partout, animations non essentielles désactivées. |
| Dynamic type | Layout ne casse pas jusqu'à +200% de taille de texte (RN & web). |

---

## 11 — Gouvernance

**v1.0 — MVP.** Centraliser tous les tokens dans un seul package/dossier source de vérité (ex. `packages/design-tokens` ou `src/theme`), consommé à la fois par `tailwind.config.js` (web) et par un thème React Native. Quand l'équipe grandit, migrer vers un outil de gestion de tokens type Style Dictionary ou Tokens Studio pour synchroniser Figma ↔ code automatiquement.
