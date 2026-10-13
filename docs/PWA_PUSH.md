# Web Push — infrastructure préparée (INACTIVE)

Aucune notification n'est envoyée, aucun service externe n'est utilisé, aucun coût. Web Push est gratuit (serveurs push d'Apple/Google/Mozilla, protocole VAPID).

## Déjà en place dans ce dépôt
- `public/sw.js` : handlers `push` (affiche titre/corps/URL relative) et `notificationclick` (ouvre/focalise l'appli).
- `src/lib/push/client.ts` : détection de support (sur iPhone : iOS ≥ 16.4 **et PWA installée** uniquement), demande de permission sur geste, abonnement VAPID, désabonnement. Inactif tant que `NEXT_PUBLIC_PUSH_ENABLED` ≠ `1` ou sans `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- `src/lib/api/push.ts` : contrat client des endpoints proposés ci-dessous (non appelés).

## À construire côté ball-manager-back (non fait : dépôt absent de cet environnement)
Table `push_subscriptions` (migration Supabase côté API) :
```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  licencie_id uuid not null references licencies(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text not null,
  topics text[] not null default '{convocations,match-changes,training-changes,match-reminders,club-news}',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);
create index on push_subscriptions (club_id, licencie_id) where revoked_at is null;
```
Endpoints (jeton personnel, mêmes règles d'isolation club/licencié que `/me`) :
`GET|POST /v1/public/clubs/:slug/push-subscriptions`, `DELETE …/:id` (appareil retiré depuis « Mes appareils »).
Envoi : bibliothèque `web-push` + clés VAPID en secret serveur ; supprimer l'abonnement sur réponse 404/410 ; ne jamais mettre de donnée sensible dans la charge (titre court + URL relative).

## Événements prévus (`topics`)
`convocations` (nouvelle convocation), `match-changes` (horaire/lieu), `training-changes`, `match-reminders` (J-1 / H-2), `club-news` (information importante).

## Activation (plus tard)
1. Générer les clés VAPID (`npx web-push generate-vapid-keys`), secret côté API, clé publique en `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
2. Implémenter les endpoints ci-dessus et l'envoi.
3. Ajouter un écran « Notifications » (permission, appareils, désabonnement) qui appelle `subscribeToPush` sur clic, puis `NEXT_PUBLIC_PUSH_ENABLED=1`.
