# Client API — ball-manager-back

ball-manager-web ne parle jamais directement à Supabase pour une donnée métier, ni à
FFBB/FBI/e-Marque : tout passe par
[ball-manager-back](https://github.com/anisfut1/ball-manager-back) — voir
`docs/MIGRATION_TO_API.md` pour l'audit complet de cette migration.

## Architecture (`src/lib/api/`)

```
config.ts        URL du backend (NEXT_PUBLIC_CLUB_MANAGER_API_URL), jamais en dur ailleurs
errors.ts         ApiError (status/code/message) + ApiUnreachableError (réseau)
client.ts          apiFetch() — LE SEUL point d'appel réseau, isomorphe
auth.server.ts      Jeton d'accès depuis la session Supabase serveur ("server-only")
auth.browser.ts      Jeton d'accès depuis la session Supabase navigateur ("use client")
factory.ts           createApi(fetcher) — assemble les fonctions ergonomiques (api.clubs.list()...)
server.ts             api = createApi(...) pour Server Components / Server Actions
browserClient.ts       browserApi = createApi(...) pour Client Components (gère le refresh sur 401)
generated/schema.ts     AUTO-GÉNÉRÉ — types OpenAPI, ne jamais éditer à la main
clubs.ts, matches.ts, integrations.ts, issues.ts, jobs.ts, platform.ts
                         Fonctions par domaine, typées depuis generated/schema.ts
```

## Utilisation

**Server Component / Server Action :**

```ts
import { api } from "@/lib/api/server";

const clubs = await api.clubs.list();
const match = await api.matches.get(clubId, matchId);
```

**Client Component :**

```ts
"use client";
import { browserApi } from "@/lib/api/browserClient";

await browserApi.integrations.saveFbi(clubId, { username, password });
```

Ne jamais appeler `fetch()` directement vers ball-manager-back dans un
composant — toujours via `api`/`browserApi`.

## Régénération des types (`npm run api:generate`)

Les types de `src/lib/api/generated/schema.ts` sont générés depuis le
contrat OpenAPI RÉEL de ball-manager-back (`GET /openapi.json`), jamais
devinés à la main — voir `scripts/generate-api-types.ts`.

```bash
# 1. Backend ball-manager-back lancé en local (dans SON repository) :
npm run dev   # écoute par défaut sur http://localhost:3001

# 2. Depuis ce repository (ball-manager-web) :
npm run api:generate
```

Pour générer depuis un backend déployé plutôt qu'en local :

```bash
CLUB_MANAGER_OPENAPI_URL=https://api.example.com/openapi.json npm run api:generate
```

Le fichier généré est commité (le build de ball-manager-web ne doit jamais dépendre de
la disponibilité réseau de ball-manager-back) — commence par
`AUTO-GENERATED — DO NOT EDIT.` et ne doit jamais être modifié à la main.

**Après un changement de contrat côté ball-manager-back :**

1. Déployer (ou lancer localement) le backend avec le nouveau contrat.
2. `npm run api:generate`.
3. Inspecter le diff de `src/lib/api/generated/schema.ts` — un champ
   renommé/retiré casse potentiellement `src/lib/api/*.ts` (TypeScript le
   signale à la compilation).
4. Ajuster les fonctions de `src/lib/api/*.ts` si nécessaire, commit.

## Vérification live (`npm run api:smoke`)

`scripts/api-smoke.ts` — appelle `GET /health` du backend configuré par
`NEXT_PUBLIC_CLUB_MANAGER_API_URL`. Séparé de `npm test` (qui ne dépend
jamais d'un backend réel, voir ci-dessous) : à lancer à la main ou dans une
étape CI optionnelle. Ne contient aucun credential.

## Tests

Les tests (`npm test`) simulent systématiquement ball-manager-back (mock de
`fetch` ou du module `@/lib/api/server`) — jamais d'appel réseau réel, ni
vers ball-manager-back ni vers Supabase/FFBB/FBI. Voir
`src/lib/api/client.test.ts` (bearer token, base URL, 200/401/403/404/422/5xx,
JSON invalide, erreur réseau) et `src/lib/tenancy/club-context.test.ts`
(résolution club/rôles/isolation cross-tenant, API mockée).

## Auth

Le jeton d'accès Supabase (JWT) est lu depuis la session côté serveur ou
navigateur (`auth.server.ts`/`auth.browser.ts`) et transmis en
`Authorization: Bearer <token>` — jamais de mot de passe, jamais de clé
service role, jamais de refresh token transmis à ball-manager-back. Sur un
401 côté navigateur, `browserClient.ts` tente UNE fois un rafraîchissement
de session avant de rediriger vers `/login` (jamais de boucle).

## Erreurs

`ApiError` (réponse HTTP non-2xx, avec `status`/`code`/`message`) et
`ApiUnreachableError` (réseau coupé, jamais confondue avec une erreur
applicative — voir `docs/MIGRATION_TO_API.md`, "l'API ne doit jamais être
contournée parce qu'elle est en panne").
