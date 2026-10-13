# ball-manager-web — frontend web du Basket Club Manager SaaS

ball-manager-web est le **frontend web uniquement** de la plateforme Basket Club
Manager — une seule application Next.js, plusieurs clubs (tenants)
totalement isolés les uns des autres. **SC Sète Basket** (identifiant FFBB
`OCC0034008`) est le tenant pilote, pas un cas particulier câblé dans le
code.

Toute la logique métier (synchronisation FFBB, connexion FBI, parsing
e-Marque, jobs, chiffrement des identifiants, accès à PostgreSQL/Storage)
vit désormais dans un repository séparé :
**[ball-manager-back](https://github.com/anisfut1/ball-manager-back)**.

```
Utilisateur → ball-manager-web (Next.js/Vercel) → Supabase Auth (JWT)
                                    → ball-manager-back (Vercel)
                                         → Supabase PostgreSQL/Storage
                                         → FFBB / FBI / e-Marque
```

**Application mobile** : l'unique app mobile est
**[ball-manager-app](https://github.com/anisfut1/ball-manager-app)** (Expo /
React Native). Ce repository n'en contient aucune ; il fournit seulement son
support web (AASA, connexion depuis Safari, liens de connexion, pages
`/confidentialite` et `/support`, Smart App Banner) : voir
[`docs/MOBILE_WEB_SUPPORT.md`](docs/MOBILE_WEB_SUPPORT.md).

Ce frontend :

- utilise **Supabase Auth directement**, uniquement pour l'authentification
  et la session (connexion, déconnexion, rafraîchissement) — jamais pour
  lire ou écrire une donnée métier ;
- appelle **ball-manager-back** pour tout le reste (clubs, matchs,
  intégrations, statistiques, documents), via un client HTTP central
  (`src/lib/api/`, voir `docs/API_CLIENT.md`) qui transmet le JWT Supabase
  en `Authorization: Bearer` ;
- ne connaît **jamais** le détail de comment FFBB est synchronisé, comment
  FBI se connecte, ni comment e-Marque est parsé — il consomme uniquement
  les DTO exposés par l'API (`GET /v1/clubs/:clubId/matches`, etc.).

Voir [`ARCHITECTURE.md`](./ARCHITECTURE.md) pour l'architecture
fonctionnelle (modules, modèle produit) et
[`docs/MULTI_TENANCY.md`](./docs/MULTI_TENANCY.md) pour le modèle
multi-tenant (isolation, RLS, rôles — dont ball-manager-back est
maintenant l'unique implémenteur). **[`docs/MIGRATION_TO_API.md`](./docs/MIGRATION_TO_API.md)**
documente en détail la migration depuis l'ancienne architecture
"tout-en-Next.js" : ce qui a été remplacé par des appels API, ce qui a été
supprimé, et les manques encore ouverts côté ball-manager-back
(`BACKEND_API_GAP`).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript strict
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Auth](https://supabase.com) (`@supabase/ssr`) — authentification/session UNIQUEMENT, voir ci-dessus
- [openapi-typescript](https://openapi-ts.dev) pour générer les types du client API depuis le contrat OpenAPI réel de ball-manager-back (`npm run api:generate`, voir `docs/API_CLIENT.md`)
- [Vitest](https://vitest.dev) pour les tests unitaires
- Déploiement visé : [Vercel](https://vercel.com) — projet **séparé** de ball-manager-back (voir docs/MIGRATION_TO_API.md)

## Prérequis

- Node.js 22+ et npm
- Un projet Supabase (le **même** que celui utilisé par ball-manager-back) — [supabase.com](https://supabase.com/dashboard)
- Un backend ball-manager-back accessible (en local via `npm run dev` dans son repository, ou déployé)

## Installation

```bash
npm install
cp .env.example .env.local
```

Remplir `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_CLUB_MANAGER_API_URL=http://localhost:3001   # ou l'URL du backend déployé
```

Plus aucun secret serveur (service role, CRON_SECRET, clé de chiffrement
FBI...) n'est nécessaire dans ce projet — ces valeurs vivent uniquement
dans ball-manager-back. Voir `docs/MIGRATION_TO_API.md` pour le détail de ce
qui a été retiré.

## Générer les types du client API

```bash
# 1. ball-manager-back lancé en local (dans SON repository) :
npm run dev   # http://localhost:3001

# 2. Depuis ce repository :
npm run api:generate
```

Voir [`docs/API_CLIENT.md`](./docs/API_CLIENT.md) pour le détail (source
`CLUB_MANAGER_OPENAPI_URL`, fichier généré commité, workflow après un
changement côté backend).

## Lancer le projet

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Toute route est
protégée par défaut (redirection vers `/login`) sauf `/login` elle-même
(voir `src/proxy.ts` et `src/config/site.ts#PUBLIC_PATHS`). Après
connexion, `/` résout automatiquement le club de l'utilisateur (0, 1 ou
plusieurs clubs, via `GET /v1/clubs`).

Il n'y a pas d'inscription publique : les comptes sont créés par
invitation, envoyée par ball-manager-back (`POST /v1/platform/clubs`),
jamais par ce frontend.

## Commandes

```bash
npm run dev          # serveur de développement
npm run build        # build de production
npm run start         # sert le build de production
npm run lint           # ESLint
npm run typecheck       # génère les types de routes Next.js puis tsc --noEmit
npm run test              # tests unitaires (Vitest) — n'appellent jamais un backend réel
npm run test:watch         # tests en mode watch
npm run api:generate        # régénère src/lib/api/generated/schema.ts depuis le contrat OpenAPI réel
npm run api:smoke            # vérifie qu'un backend ball-manager-back configuré répond (GET /health) — séparé de npm test
```

Toutes ces commandes doivent passer sans erreur sur `main`.

## Organisation du code

```
src/
  app/                    Routes Next.js (App Router) — couche fine, pas de logique métier
    login/                Page de connexion (publique)
    page.tsx              Résolution du club courant après connexion (0/1/plusieurs clubs)
    platform/             Réservé platform_admin : liste + création de clubs (via ball-manager-back)
    c/[clubSlug]/          Tout l'espace d'UN club
      dashboard/
      matchs/               Liste filtrée + détail (onglets) — lecture seule, via ball-manager-back
      admin/                Espace club_admin DE CE CLUB : intégrations, sync, anomalies, réglages
    layout.tsx             Layout racine
    error.tsx, not-found.tsx
  components/             UI partagée, sans logique métier
    ui/                    Composants génériques (Card...)
    nav/                   Navigation (en-tête, sélecteur de club)
  features/                UI + logique spécifiques à un module métier (Client Components → ball-manager-back)
    auth/                   Formulaire de connexion (Supabase Auth directement)
    admin/                   Identifiants FBI, réglages club, boutons de test/sync/résolution
    platform/                Formulaire de création de club
  lib/
    supabase/                Clients Supabase : browser + server, AUTH UNIQUEMENT (plus de client admin/service role)
    auth/                    Session (lecture) et statut platform_admin (déduit de ball-manager-back)
    tenancy/                  ClubContext : résout "quel club, quels droits" depuis GET /v1/clubs
    permissions/              Rôles de club (ClubRole, hasRole...) — helpers UX uniquement
    api/                      Client HTTP central vers ball-manager-back — voir docs/API_CLIENT.md
    logger.ts                 Logger minimal
  server/
    actions/                 Server Actions restantes : auth (login/logout Supabase), réglages club (catégorie D, voir docs/MIGRATION_TO_API.md)
  config/                  Configuration (env validée, constantes produit)
  types/
    database.ts               Types du schéma PostgreSQL (encore utilisés par l'écriture directe résiduelle + le typage du client Auth)
  proxy.ts                 Protection des routes + rafraîchissement de session

scripts/
  generate-api-types.ts    npm run api:generate
  api-smoke.ts               npm run api:smoke

docs/
  MIGRATION_TO_API.md       Audit complet de la migration (A/B/C/D, BACKEND_API_GAP)
  API_CLIENT.md               Client API : architecture, régénération des types, auth, erreurs
  MULTI_TENANCY.md             Modèle multi-tenant (désormais implémenté par ball-manager-back)
  FBI_WORKER.md                OBSOLÈTE — architecture pré-migration, conservée pour l'historique
  FFBB_ECOSYSTEM_RESEARCH.md    Spike de recherche historique (API publique FFBB)
  FBI_AUTHENTICATED_SPIKE.md    Spike de recherche historique (FBI authentifié)

spikes/                    Outils de diagnostic développeur historiques (jamais requis en exploitation normale, jamais importés dans l'app)
  ffbb-ecosystem/            Scripts d'exploration de l'API publique FFBB
  fbi-auth/                  Outil Playwright à lancer LOCALEMENT (identifiants réels), voir docs/FBI_AUTHENTICATED_SPIKE.md
```

Principe : les routes sous `app/` restent fines et appellent `lib/api/`
(Server Components) ou `lib/api/browserClient` (Client Components) —
jamais Supabase directement pour une donnée métier (voir
`docs/MIGRATION_TO_API.md`, catégorie D pour l'unique exception
documentée).

## Tests

```bash
npm run test
```

Vitest teste des fonctions TypeScript pures et le client API avec des
mocks (jamais d'appel réseau réel, ni vers ball-manager-back ni vers
Supabase/FFBB/FBI) :

- Config d'environnement (`src/config/env.public.test.ts`)
- Connexion/déconnexion Supabase Auth (`src/lib/auth/service.test.ts`)
- Rôles de club (`src/lib/permissions/roles.test.ts`)
- Client API central : jeton Bearer, base URL, codes 200/401/403/404/422/5xx,
  JSON invalide, erreur réseau (`src/lib/api/client.test.ts`)
- `ClubContext` : résolution club/rôles, isolation cross-tenant, avec
  `@/lib/api/server` mocké (`src/lib/tenancy/club-context.test.ts`)

Les tests FFBB/FBI/e-Marque/RLS multi-tenant (précédemment dans ce
repository) vivent désormais dans ball-manager-back — voir son propre
`README.md`/`docs/MIGRATION.md`.

## Fichiers générés automatiquement

`AGENTS.md` et `CLAUDE.md` à la racine sont générés par `next dev` (Next.js
16) pour documenter aux agents IA les changements de convention de cette
version de Next.js. Ils sont recréés automatiquement s'ils sont supprimés
— ce n'est pas une erreur, ils sont commités volontairement.

## Configuration manuelle restante

- Créer/récupérer les clés du projet Supabase (le même que ball-manager-back)
- Déployer ball-manager-back et récupérer son URL
- Renseigner `.env.local` (développement) et les variables d'environnement
  du projet sur Vercel (production) — voir "Installation" ci-dessus
- Connecter CE repository à un projet Vercel **séparé** de ball-manager-back
- Tout le reste (créer un club, inviter son premier admin, configurer
  FFBB/FBI) se fait depuis l'application, qui appelle ball-manager-back
