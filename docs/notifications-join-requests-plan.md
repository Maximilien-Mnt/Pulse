# Plan : Notifications de demandes d'adhésion aux clubs/events

## Résumé de l'existant

### Base de données
- Tables `club_join_requests` et `event_join_requests` existent avec statut `pending` par défaut.
- Table `notifications` existe déjà avec colonnes : `id`, `user_id`, `type`, `title`, `body`, `data` (jsonb), `read_at`, `created_at`.
- RLS sur `notifications` : actuellement `FOR ALL` sur `authenticated` sans restriction forte dans la V1. La migration 004 renforce avec `user_id = auth.uid()`.

### Frontend
- Écran `app/(tabs)/profile/notifications.tsx` existe déjà et affiche les notifications avec filtres Tout / En attente / Traités.
- Hook `useNotifications` existe déjà.
- Hook `useJoinRequestAction` existe déjà et gère accept/refuse côté client.

### Edge Function
- `supabase/functions/send-notification/index.ts` existe et envoie des push notifications Expo + insert dans `notifications`.

### Lacunes identifiées
1. **Aucun endroit dans le code ne crée de join request.** Les boutons "Rejoindre" sur les pages clubs/events n'existent pas encore dans le code exploré.
2. **La migration 004 n'a pas été appliquée** (pas dans la liste des migrations existantes).
3. **Pas d'intégration avec la conversation** : quand on refuse, il faut pouvoir contacter le propriétaire.
4. **Notification screen** : déjà fonctionnelle, mais peut être améliorée pour le cas refused (bouton "Contacter" sur la notification de refus).

---

## Plan d'implémentation

### Étape 1 — Appliquer la migration SQL

**Fichier** : `supabase/migrations/004_join_request_notifications.sql` (déjà écrit, à déployer)

Actions :
- Vérifie que le fichier `004_join_request_notifications.sql` est bien présent dans `supabase/migrations/`.
- Appliquer via `supabase db push` ou `supabase migration up`.
- Confirmer que les triggers `trg_club_join_request_notify` et `trg_event_join_request_notify` sont créés.
- Confirmer que les policies RLS sur `notifications` sont à jour.

> **Note** : Si le projet utilise un workflow manuel de migrations, exécuter le SQL directement dans le SQL Editor de Supabase.

---

### Étape 2 — Créer le hook `useJoinRequest` (création de demande)

**Nouveau fichier** : `hooks/useJoinRequest.ts`

Responsabilité : créer une demande d'adhésion pour un club ou un event privé.

```ts
export function useJoinRequest() {
  const userId = useAuthStore(s => s.userId);
  return useMutation({
    mutationFn: async ({ type, targetId }: { type: 'club' | 'event', targetId: string }) => {
      if (!userId) throw new Error('auth');
      const table = type === 'club' ? 'club_join_requests' : 'event_join_requests';
      const { error } = await supabase.from(table).insert({
        club_id: type === 'club' ? targetId : undefined,
        event_id: type === 'event' ? targetId : undefined,
        user_id: userId,
        status: 'pending',
      });
      if (error) throw error;
    },
  });
}
```

Optimistic UI possible : invalider `['club-members', clubId]` ou `['event-participants', eventId]` après succès.

---

### Étape 3 — Ajouter le bouton "Rejoindre" sur les pages détail club/event

**Fichiers à modifier** :
- Composant détail club (ex: `components/clubs/ClubDetailScreen.tsx` ou similaire)
- Composant détail event (ex: `components/events/EventDetailScreen.tsx` ou similaire)

Logique :
- Si `is_private === false` → bouton "Rejoindre" direct qui upsert dans `club_members` / `event_participants`.
- Si `is_private === true` → bouton "Demander à rejoindre" qui appelle `useJoinRequest`.
- Afficher un loader et désactiver le bouton pendant la mutation.
- Toast de succès/erreur.

Exemple pour club :
```tsx
const joinReq = useJoinRequest();
const isMember = /* query sur club_members */;
const isPending = /* query sur club_join_requests */;

if (isMember) return <Text>Membre</Text>;
if (isPending) return <Text>Demande en attente</Text>;
if (club.is_private) {
  return <Button title="Demander à rejoindre" onPress={() => joinReq.mutate({type:'club', targetId:club.id})} />;
}
return <Button title="Rejoindre" onPress={() => supabase.from('club_members').upsert({club_id:club.id, user_id:userId})} />;
```

---

### Étape 4 — Améliorer `formatNotificationTitle` et le rendu refused

**Fichier** : `app/(tabs)/profile/notifications.tsx`

Modifier `formatNotificationTitle` pour gérer les types refused :
```ts
case "club_join_request_response_refuse":
  return "Demande refusée";
case "event_join_request_response_refuse":
  return "Invitation refusée";
```

Ajouter un bouton "Contacter" sur les notifications de type refused, visible uniquement pour le demandeur :

```tsx
const isRefused = (n: any) =>
  n.type === "club_join_request_response_refuse" ||
  n.type === "event_join_request_response_refuse";

// Dans renderItem, après les boutons accept/refuse :
{isRefused(item) && (
  <Pressable
    onPress={() => {
      // Créer une conversation 1:1 avec le propriétaire
      router.push(`/(tabs)/conversations/${data.target_id}`);
    }}
    className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 ml-2"
  >
    <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
      Contacter
    </Text>
  </Pressable>
)}
```

> **Note** : il faut d'abord créer ou récupérer une conversation 1:1. Voir Étape 5.

---

### Étape 5 — Créer un hook `useStartConversationWith`

**Nouveau fichier** : `hooks/useStartConversationWith.ts`

Responsabilité : créer ou récupérer une conversation 1:1 avec un autre utilisateur, puis naviguer.

```ts
export function useStartConversationWith() {
  const userId = useAuthStore(s => s.userId);
  const contact = useContactUser();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!userId) throw new Error('auth');
      return contact.mutateAsync(otherUserId);
    },
    onSuccess: (convId) => {
      router.push(`/(tabs)/conversations/${convId}`);
    },
  });
}
```

Utilisation dans notifications.tsx :
```tsx
const startConv = useStartConversationWith();
// ...
onPress={() => startConv.mutate(data.target_id)}
```

---

### Étape 6 — Wrapper l'insert de notification dans un seul helper (optionnel mais propre)

**Fichier** : `hooks/useNotifications.ts`

Ajouter :
```ts
export async function createNotification({
  userId,
  type,
  title,
  body,
  data = {},
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data,
    read_at: null,
  });
  if (error) throw error;
}
```

Utiliser ce helper dans `useJoinRequestAction` au lieu de l'insert inline.

---

### Étape 7 — Tester le flow complet

1. **Créer un club/event privé**.
2. **Se connecter avec un autre compte** et demander à rejoindre.
3. **Vérifier** que le propriétaire reçoit une notification.
4. **Accepter** : vérifier que le demandeur est ajouté comme membre/participant et reçoit la notification d'acceptation.
5. **Refuser** : vérifier que le demandeur reçoit la notification de refus et peut contacter le propriétaire.
6. **Tester les filtres** dans `notifications.tsx` (Tout, En attente, Traités).

---

## Ordre de travail recommandé

| Ordre | Fichier | Action |
|-------|---------|--------|
| 1 | `supabase/migrations/004_join_request_notifications.sql` | Appliquer la migration |
| 2 | `hooks/useJoinRequest.ts` | Créer le hook de création de demande |
| 3 | `hooks/useStartConversationWith.ts` | Créer le hook de conversation 1:1 |
| 4 | Pages détail club/event | Ajouter les boutons Rejoindre / Demander |
| 5 | `app/(tabs)/profile/notifications.tsx` | Ajouter le bouton Contacter sur refused |
| 6 | `hooks/useNotifications.ts` | Factoriser `createNotification` |
| 7 | Tests manuels du flow complet | Valider accept/refuse + conversation |

---

## Risques et points d'attention

- **RLS notifications** : après application de la migration 004, vérifier que chaque utilisateur ne voit que SES notifications.
- **Trigger recursif** : la fonction PL/pgSQL `notify_join_request` ne doit pas causer de récursion. Pas de risque ici car elle ne modifie pas `club_join_requests` / `event_join_requests`.
- **Performance** : les index créés dans 004 couvrent les requêtes les plus courantes. Vérifier le plan d'exécution si la volumétrie augmente.
- **Push notifications** : l'edge function `send-notification` envoie Expo Push et insert dans `notifications`. Le trigger SQL insère aussi dans `notifications`. Il n'y a donc pas de doublon car :
  - Le trigger insère la notification manager (propriétaire) au moment de la demande.
  - Le hook `useJoinRequestAction` insère la notification réponse (accept/refuse) au demandeur.
  - L'edge function n'est utilisée que pour les push en arrière-plan via webhook Supabase si besoin.
- **Unicode et troncature** : le trigger utilise `left(v_entity_name, 50)` pour éviter des textes trop longs.
- **Auto-notification** : le trigger vérifie `v_target_user_id = NEW.user_id` pour ne pas notifier le créateur qui demande à rejoindre son propre club/event.

---

## Fichiers existants à ne pas modifier

- `supabase/functions/send-notification/index.ts` : OK, fonctionne déjà.
- `hooks/useInvitations.ts` : gère les invitation tokens, pas les join requests.
- `hooks/useContactUser.ts` : déjà bien écrit, on l'utilise tel quel.
- `hooks/usePushNotifications.ts` : OK, gère les permissions Expo.

---

## Fichiers à créer

- `hooks/useJoinRequest.ts`
- `hooks/useStartConversationWith.ts`
- `docs/notifications-join-requests-plan.md` (ce fichier)

---

## Fichiers à modifier

- `supabase/migrations/004_join_request_notifications.sql` → **appliquer**
- `app/(tabs)/profile/notifications.tsx`
- `hooks/useNotifications.ts`
- Pages détail club/event (fichiers à identifier selon la structure exacte du projet)