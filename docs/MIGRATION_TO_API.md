# Migration vers ball-manager-back — audit et suivi

Ce document trace la reconnexion de ball-manager-web (frontend) à
[ball-manager-back](https://github.com/anisfut1/ball-manager-back) (commit de
référence `ae29566`), en remplacement de l'accès direct à Supabase pour
toute donnée métier. Il complète `README.md`/`ARCHITECTURE.md` — en cas de
divergence, ce document fait foi sur l'état de la migration elle-même.

## Architecture cible

```
Utilisateur → ball-manager-web (Next.js/Vercel) → Supabase Auth (JWT)
                                    → ball-manager-back (Vercel)
                                         → Supabase PostgreSQL/Storage
                                         → FFBB / FBI / e-Marque
```

Supabase n'est plus utilisé côté frontend QUE pour l'authentification/session
(`src/lib/supabase/{browser,server}.ts`) — jamais pour lire ou écrire une
donnée métier (clubs, matchs, intégrations, stats...), sauf les exceptions
explicitement documentées en catégorie D ci-dessous.

## A. Code conservé tel quel côté frontend

Pages, composants, layouts, navigation, auth UI (formulaire de connexion),
session Supabase, club switcher, `src/components/**`, `src/lib/auth/session.ts`
(lecture de session), `src/lib/permissions/roles.ts` (helpers UX
`isClubAdmin`/`hasRole`), `src/lib/logger.ts`, `src/types/database.ts`
(types du schéma PostgreSQL — encore nécessaires pour typer le client
Supabase Auth et l'écriture directe restante en catégorie D).

## B. Remplacé par des appels à ball-manager-back

| Ancien | Nouveau |
|---|---|
| `src/lib/tenancy/club-context.ts` (requêtes `clubs`/`club_memberships`/`membership_roles`) | `GET /v1/clubs` via `src/lib/api/server.ts` |
| `/c/[clubSlug]/matchs` (`SELECT matches/teams`) | `GET /v1/clubs/:clubId/matches` + `GET /v1/clubs/:clubId/teams` |
| `/c/[clubSlug]/matchs/[id]` (`SELECT matches/match_participants/...`, URLs signées via client admin) | `GET /v1/clubs/:clubId/matches/:matchId` + `.../documents` (URL déjà signée côté backend) |
| `/c/[clubSlug]/admin/integrations` + `/integrations/fbi` (Server Actions + client admin) | `GET/POST /v1/clubs/:clubId/integrations[/fbi[/test]]` via des Client Components (`src/features/admin/{FbiCredentialsForm,TestFbiConnectionButton,TriggerFfbbSyncButton}.tsx`) |
| `/c/[clubSlug]/admin/sync` (`SELECT sync_runs/matches/emarque_imports`) | `GET /v1/clubs/:clubId/sync-runs` + `GET /v1/clubs/:clubId/matches` |
| `/c/[clubSlug]/admin/issues` (`SELECT`/`UPDATE matches` via client admin) | `GET/POST /v1/clubs/:clubId/issues[/:matchId/resolve]` via `src/features/admin/ResolveIssueButton.tsx` |
| `/platform/clubs` (`SELECT clubs`/`fbi_integration_status`, calcul local des capabilities) | `GET/POST /v1/platform/clubs` via `src/lib/auth/platform.ts` + `src/features/platform/CreateClubForm.tsx` |
| `src/lib/auth/platform.ts` (`SELECT platform_admins`) | Statut déduit d'un 403 sur `/v1/platform/clubs` (même RPC `is_platform_admin()` que la RLS, côté backend) |

Toutes ces routes utilisent le client central `src/lib/api/` (voir
`docs/API_CLIENT.md`), jamais un `fetch()` dispersé ni une deuxième
implémentation de la logique métier côté Next.js (§9 de la demande).

## C. Supprimé après migration (plus aucune trace dans ball-manager-web)

- `src/lib/ffbb/**` (client Directus, `FfbbPublicProvider`)
- `src/lib/fbi/**` (`HttpFbiClient`, cookie jar, magasin d'identifiants,
  classification d'action, erreurs)
- `src/lib/domain/**` (mapping/diff FFBB, scheduler de sync, découverte et
  parsing e-Marque)
- `src/lib/storage/emarque-storage.ts` (accès direct au bucket Storage)
- `src/lib/security/crypto.ts` (chiffrement AES-256-GCM des identifiants FBI)
- `src/lib/tenancy/club-capabilities.ts` (recalculée localement — remplacée
  par `GET /v1/clubs/:clubId/capabilities`)
- `src/lib/supabase/admin.ts` (client service role)
- `src/server/emarque/**` (pipeline OCR/PDF complet : extractors, layout,
  normalizers, parser, persist, quality, schemas)
- `src/server/actions/{fbi-integration,ffbb-sync,emarque-issues,platform-clubs}.ts`
- `src/app/api/internal/**` (routes cron `sync-ffbb`, `discover-emarque`,
  `parse-emarque`)
- `src/config/env.server.ts` (validation `SUPABASE_SERVICE_ROLE_KEY`,
  `CRON_SECRET`, `FBI_CREDENTIALS_ENCRYPTION_KEY`)
- `vercel.json` (crons FFBB/FBI/e-Marque — appartiennent désormais
  exclusivement à ball-manager-back)
- `supabase/migrations/`, `supabase/tests/` (34 fichiers de migration
  vérifiés **identiques octet pour octet** avec ball-manager-back avant
  suppression — seul `supabase/tests/README.md` différait, par une
  correction de formulation sans rapport avec le schéma ; voir
  `docs/DEPLOYMENT.md` côté ball-manager-back pour l'application des
  migrations)
- `scripts/seed.ts` (nécessitait la service role, désormais interdite ici —
  cette capacité de seed appartient maintenant à ball-manager-back, pas
  encore réimplémentée là-bas : à traiter dans une phase ultérieure, pas
  cette migration)
- Dépendances devenues inutiles : `jszip`, `pdfjs-dist`, `tesseract.js`,
  `cheerio`, `@napi-rs/canvas` (pipeline OCR/PDF entièrement côté backend
  désormais)

## D. Conservé temporairement (BACKEND_API_GAP)

Rien n'a été supprimé avant d'avoir un remplacement fonctionnel (§1 de la
demande). Un seul point restant :

- **`src/features/admin/ClubSettingsForm.tsx` + `src/server/actions/club-settings.ts`**
  — écrit encore directement sur `clubs` (nom, nom court, fuseau horaire)
  via un client Supabase lié à la session (RLS, **pas** service role).
  Aucun secret ni privilège élevé n'est utilisé ; c'est une dérogation
  d'architecture documentée, pas une faille de sécurité. Bloqué par
  l'absence d'une route `PATCH /v1/clubs/:clubId` côté ball-manager-back
  (voir gap ci-dessous).

## BACKEND_API_GAP — manques identifiés côté ball-manager-back

Aucun de ces manques n'a été contourné : les fonctionnalités correspondantes
sont soit retirées de l'UI avec une note explicite, soit simplifiées, en
attendant que ball-manager-back expose la route nécessaire (§56 de la
demande).

1. **`PATCH /v1/clubs/:clubId`** — absent. Bloque le retrait complet de
   l'écriture directe `clubs` (voir catégorie D ci-dessus).
2. **`ClubDto` n'expose pas `ffbbClubId`** (disponible seulement sur
   `PlatformClubDto`, réservé platform_admin) — le code FFBB du club n'est
   plus affiché sur `/admin/integrations` ni `/admin/settings`.
3. **`GET /v1/me` n'expose pas de nom d'affichage** (`profiles.display_name`
   côté ball-manager-web) — l'email sert de nom d'affichage dans l'en-tête.
4. **Pas de route pour activer/désactiver `fbi_integration_status.auto_import_emarque`**
   — côté backend, seule l'écriture service role le permet (aucune policy
   RLS `authenticated` en écriture sur cette colonne). Le bouton a été
   retiré de `/admin/integrations/fbi` ; seul le statut en lecture est
   affiché (`GET /v1/clubs/:clubId/integrations`).
5. **Pas de route listant `emarque_imports`** — la section "Derniers
   imports e-Marque" (`/admin/sync`) et le libellé "Dernier import e-Marque"
   (`/admin/integrations`) ont été retirés.
6. **`IssueDto` n'expose pas `quality_warnings`/`last_error`** — la page
   `/admin/issues` affiche désormais uniquement le statut
   (`error`/`needs_review`), sans le détail des avertissements.
7. **`GET /v1/clubs/:clubId/matches` n'accepte aucun filtre en query
   params** (période, équipe, domicile/extérieur) **ni pagination** — tous
   les matchs du club sont récupérés en un appel, filtrés côté frontend
   (`/c/[clubSlug]/matchs`). Acceptable au volume actuel, à corriger si un
   club atteint un volume significatif.
8. **`GET /v1/clubs/:clubId/integrations` n'expose pas le `username` FBI
   déjà configuré** — `FbiCredentialsForm` ne pré-remplit plus
   l'identifiant.

## Duplication restante

**Nulle côté logique backend.** Le seul reliquat est l'écriture directe
`clubs` du point D ci-dessus (RLS, sans secret) — tout le reste (FFBB, FBI,
e-Marque, jobs, chiffrement, parsing) n'existe plus qu'une fois, dans
ball-manager-back.
