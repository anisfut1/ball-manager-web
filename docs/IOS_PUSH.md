# Notifications push de l'app mobile Ball Manager

APNs direct : pas de OneSignal, pas de Firebase, pas de service push Expo. Le code serveur est dans `ball-manager-back/src/modules/push/`, le code de l'app dans `ball-manager-app/src/push/` (voir `ball-manager-app/docs/PUSH.md`).

## Parcours

1. **Permission.** Elle n'est jamais demandée au lancement. L'utilisateur la déclenche lui-même, après connexion : invitation sur l'accueil ou Profil → Notifications.
2. **Jeton.** L'app récupère le jeton APNs brut (`getDevicePushTokenAsync`, `expo-notifications`) et l'envoie à `PUT /v1/public/clubs/{slug}/auth/session/push-token`, pour **chaque** club connecté (une session par club), avec :
   - `environment` : lu dans le profil de signature (`getIosPushNotificationServiceEnvironmentAsync`) : `development` pour une Development Build, `production` pour TestFlight et l'App Store ;
   - `appVersion`.
3. **Rafraîchissement.** Au démarrage, si la permission est déjà accordée, le jeton est ré-envoyé : il peut changer après une réinstallation ou une restauration.
4. **Arrêt.**
   - « Ne plus recevoir celles de ce club » : `DELETE …/session/push-token`.
   - « Se déconnecter » : la session est révoquée, et son jeton avec.
   - Lien réinitialisé par un admin, ou session expirée après 180 jours sans usage : plus aucune notification, sans autre action.

## Modèle (migration `20261011120000_push_notifications.sql`)

| Table | Rôle |
|---|---|
| `device_push_tokens` | Un jeton par **session d'appareil** (`session_id` unique). Champs : `token`, `environment`, `app_version`, `last_seen_at`, `revoked_at`, `revoked_reason`. |
| `notification_outbox` | File d'envoi. Champs : `kind`, `dedupe_key` (unique, pour l'idempotence), `licencie_ids`, `title`, `body`, `path`, `status` (pending → sending → sent / failed / expired), `attempts`, `last_error`, `next_attempt_at`, `devices_sent`. |

RLS est activée sans policy : l'accès se fait par l'API seulement.

## Destinataires

On notifie des **licenciés**. Les appareils sont résolus **au moment de l'envoi** :
- droit de session (`device_session_grants`) sur ce licencié dans **ce** club ;
- lien personnel encore valide ;
- session non révoquée et non expirée ;
- jeton push non révoqué.

Un iPhone qui suit deux enfants convoqués reçoit **une** seule notification, car on déduplique par jeton.

## Déclencheurs

| Événement | `kind` | Qui | Destination |
|---|---|---|---|
| Convocation envoyée (1re fois) | `CONVOCATION_NEW` | convoqués | `/public/{slug}/matchs/{id}#convocation` |
| Convocation renvoyée, heure / lieu / match changé | `CONVOCATION_UPDATED` | convoqués | idem |
| Convocation renvoyée, autre changement | `CONVOCATION_NEW` | nouveaux convoqués seulement | idem |
| « Demander les disponibilités » | `AVAILABILITY_REQUEST` | joueurs sans réponse | `/public/{slug}/matchs/{id}` |
| « Relancer » | `RESPONSE_REMINDER` | « en attente » / sans réponse | convocation ou match |
| Synchro FFBB : match à venir déplacé (date, heure, salle) | `MATCH_CHANGED` | joueurs de l'équipe | match |
| Synchro FFBB : match annulé ou reporté | `MATCH_CANCELLED` | joueurs de l'équipe | match |
| Séance à venir modifiée | `TRAINING_CHANGED` | joueurs de l'équipe | `/public/{slug}/accueil#seance-{id}` |
| Séance à venir annulée | `TRAINING_CANCELLED` | joueurs de l'équipe | idem |
| Dérogation prise en charge, refusée ou traitée par quelqu'un d'autre | `DEROGATION_UPDATED` | le coach demandeur | `/public/{slug}/derogations/{id}` |

Aucune notification n'est envoyée pour un score, ni pour un match ou une séance déjà passés.

Les chemins sont produits par `paths.*` (`src/links/links.ts`). Ce sont **les mêmes** que ceux du web et des Universal Links. L'app ouvre `path` avec le même résolveur que les Universal Links (`resolveDestination`), et une session est requise.

## Contenu (écran verrouillé)

Le titre et une phrase courte, **sans nom ni donnée personnelle**. Exemple : « Nouvelle convocation — Tu es convoqué pour un prochain match. Confirme ta présence. »

Payload envoyé :

```json
{ "aps": { "alert": { "title": "…", "body": "…" }, "sound": "default", "thread-id": "<kind>" }, "path": "/public/…" }
```

En-têtes APNs :
- `apns-push-type: alert` ;
- `apns-expiration` : +24 h ;
- `apns-collapse-id` : `dedupe_key`, ce qui évite les doublons à l'écran.

## Envoi et fiabilité

- **Envoi immédiat** dans la requête qui déclenche l'événement (`notify()`). Une erreur n'empêche **jamais** l'action elle-même : elle est journalisée sans contenu personnel.
- **Rattrapage** : `GET /internal/cron/push`, protégé par `CRON_SECRET`, appelé toutes les 15 min par `.github/workflows/fbi-frequent-sync.yml`. Il gère :
  - les échecs passagers, réessayés après 1, 2, 4 puis 8 min, avec 5 essais au maximum ;
  - les réservations abandonnées (bail de 10 min) ;
  - l'expiration après 24 h.
- **Idempotence** : une `dedupe_key` unique, et une réservation conditionnelle (`status = pending` → `sending`), donc jamais deux envois concurrents.
- **Au moins un appareil atteint** : la notification est « envoyée ». On ne réessaie pas pour les autres appareils, ce qui provoquerait des doublons.
- **Jeton refusé définitivement** (410, `Unregistered`, `BadDeviceToken`, `DeviceTokenNotForTopic`) : il est révoqué et n'est plus jamais utilisé.

## Configuration (API, variables Vercel)

| Variable | Valeur |
|---|---|
| `APNS_TEAM_ID` | `YFZ72KY47V` |
| `APNS_KEY_ID` | identifiant de la clé `.p8` (10 caractères) |
| `APNS_PRIVATE_KEY` | contenu PEM de la clé `.p8` (`\n` accepté) |
| `APNS_BUNDLE_ID` | `fr.ballmanager.app` (défaut) |

Si elles sont absentes, le push est **désactivé** : rien n'est mis en file, et le cron répond `{ "enabled": false }`.

Le JWT fournisseur est signé en ES256 et renouvelé toutes les 50 min. Une même clé `.p8` sert pour le sandbox comme pour la production : l'hôte est choisi selon l'`environment` du jeton.

## Ce qui est testé, et ce qui ne l'est pas

- **Testé**, avec un expéditeur APNs simulé (`src/modules/push/push.test.ts`, 15 tests) :
  - enregistrement et révocation du jeton ;
  - déduplication par appareil ;
  - déconnexion, lien réinitialisé et session expirée ;
  - isolation entre clubs ;
  - idempotence ;
  - push désactivé ;
  - 410 → révocation ;
  - réessais puis abandon ;
  - expiration ;
  - déclencheurs FFBB et séances ;
  - JWT ES256 vérifié par la clé publique ;
  - contenu du payload.
- **Pas testé** : aucun envoi réel vers APNs, aucune réception sur iPhone, ni l'ouverture d'une notification sur un appareil. Il faut un iPhone, une build signée et la clé `.p8` (voir `ball-manager-app/MANUAL_STEPS.md`).
