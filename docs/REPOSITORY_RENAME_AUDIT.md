# Audit avant renommage des dépôts

Date : 2026-10-10. Audit fait **avant** toute modification.

| Ancien | Nouveau | Rôle |
|---|---|---|
| `anisfut1/SCSB` | `anisfut1/ball-manager-web` | Frontend web Next.js (Vercel) |
| `anisfut1/club-manager-api` | `anisfut1/ball-manager-back` | API Hono, Supabase, FFBB/FBI, push (Vercel) |
| (nouveau) | `anisfut1/ball-manager-app` | App mobile Expo / React Native |

## Dépôts GitHub (état constaté)

| | SCSB | club-manager-api |
|---|---|---|
| Visibilité | **public** | **public** |
| Droits du compte connecté | admin | admin |
| Branche par défaut | `claude/sete-basket-app-architecture-c3hlxx` | `main` |
| Autres branches | `claude/ios-app` (+5 commits non fusionnés), `claude/fervent-brahmagupta-pu78c4`, `docs/adr-fastapi`, `fix/next-security`, `integration/back-fastapi`, `refactor/migration-back` | `claude/ios-app` (+3 commits non fusionnés) |
| Tags | aucun | aucun |
| Workflows | `.github/workflows/ci.yml` (lint, typecheck, tests, build, gitleaks) | `.github/workflows/fbi-frequent-sync.yml` (crons toutes les 15 min) |
| Webhooks | non lisibles via l'outil (API refusée par le proxy) | idem |

**Un renommage GitHub conserve** :
- l'historique, les branches, les tags, les issues et les PR ;
- les secrets Actions (`CRON_SECRET`) ;
- les protections de branche.

**Il redirige** les anciennes URL, en HTTPS, en git et pour `raw.githubusercontent.com`, tant qu'aucun nouveau dépôt ne reprend l'ancien nom. Il ne faut donc **jamais** recréer un dépôt `SCSB` ou `club-manager-api`.

## Vercel

L'audit n'a pas pu être fait directement : aucun accès Vercel depuis cette session.

| Dépôt | Projet Vercel (déduit du code) | Domaine |
|---|---|---|
| SCSB | projet du frontend | `www.ball-manager.fr` (prod) |
| club-manager-api | projet `club-manager-api`, d'après le domaine `club-manager-api-two.vercel.app` | `club-manager-api-two.vercel.app` |

- **Liaison Git.** Vercel suit les dépôts par leur identifiant GitHub, pas par leur nom. Un renommage ne devrait pas casser les déploiements, mais **il faut vérifier après coup** dans Project → Settings → Git que le dépôt affiché est bien le nouveau nom.
- **Projets Vercel.** On ne les renomme **pas**. Le domaine `club-manager-api-two.vercel.app` dérive du nom du projet backend, et il est appelé par le workflow GitHub et par la variable `NEXT_PUBLIC_CLUB_MANAGER_API_URL` du frontend. Le renommer casserait les crons et le site, pour un gain purement esthétique.
- **Crons.** Ceux de `vercel.json` (quotidiens) et le workflow GitHub (15 min) appellent le **domaine Vercel**, pas le dépôt. Le renommage n'a pas d'effet sur eux.

## Références aux anciens noms

### À NE PAS changer (identifiants techniques en production)

| Valeur | Où | Pourquoi |
|---|---|---|
| `club-manager-api-two.vercel.app` | workflow `fbi-frequent-sync.yml`, variables Vercel, docs | domaine de production de l'API |
| `NEXT_PUBLIC_CLUB_MANAGER_API_URL`, `CLUB_MANAGER_OPENAPI_URL` | variables d'environnement web | noms de variables configurés sur Vercel |
| `scsb:public-token:*`, `scsb:public-tokens:*` | `localStorage` (web) | clés des liens personnels déjà enregistrés chez les familles : les changer les déconnecterait |
| `scsb-public-known` | cookie (web) | idem |
| `scsb-public-session:` | sel de chiffrement de `bm_session` (`src/lib/public-session/seal.ts`) | le changer invaliderait toutes les sessions web |
| `/opt/club-manager-api` | `ops/fbi-session-worker/install.sh` | répertoire déjà installé sur le serveur du worker FBI |
| `short_name: "SCSB"` | test (`club-settings.test.ts`) | nom court du club SC Sète, pas le dépôt |
| `design-system/scsb/` | chemin de dossier, cité en commentaire | sans lien avec GitHub ; laissé tel quel pour ne pas casser les renvois |

### À changer (désignent le dépôt ou le projet)

| Où | Nombre |
|---|---|
| Web : commentaires (`src/**`), README, ARCHITECTURE, `docs/**`, `.env.example`, `scripts/generate-api-types.ts`, `scripts/api-smoke.ts`, CI | ~300 occurrences de `club-manager-api`, ~40 de `SCSB` |
| Back : docs, README, ARCHITECTURE, `.env.example`, migrations (commentaires uniquement), `src/**` (commentaires) | ~150 |
| Back : `package.json` `name` | `club-manager-api` → `ball-manager-back` |
| Back : titre OpenAPI (`src/openapi.ts`) et son test | `club-manager-api` → `ball-manager-back` |
| Web : `package.json` `name` | `scsb` → `ball-manager-web` |
| Back : URL du dépôt dans `ops/*/install.sh` | `anisfut1/club-manager-api` → `anisfut1/ball-manager-back` |

**Migrations SQL déjà appliquées** : ce sont des commentaires dans des fichiers historiques. On les **laisse tels quels**, car modifier une migration appliquée brouille l'historique.

## Liens entre dépôts

- **OpenAPI.** Le web génère `src/lib/api/generated/schema.ts` depuis `/openapi.json` du backend (`npm run api:generate`, avec `CLUB_MANAGER_OPENAPI_URL` ou `http://localhost:3001`). Aucun chemin de fichier inter-dépôts : seulement une URL HTTP. Le renommage n'a pas d'effet.
- **Pas de sous-module git, pas de dépendance npm** entre les dépôts.
- **Capacitor** (état au 2026-10-10) : `SCSB/mobile/`, sur la branche `claude/ios-app`, non fusionnée. **Retiré depuis** (branche `claude/mobile-support`) : `ball-manager-app` (Expo) est l'unique application mobile.

## Remotes locaux (cette session)

- `https://github.com/anisfut1/SCSB`
- `https://github.com/anisfut1/club-manager-api`

À mettre à jour après le renommage, avec `git remote set-url`. Le partenaire (Rida) devra faire de même sur ses clones.

## Supabase

Projet unique (`eu-west-1`). Aucun nom de dépôt dans la configuration de la base. Le renommage n'a pas d'effet sur elle.
