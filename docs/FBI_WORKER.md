# Architecture FBI/e-Marque — worker et automatisation de bout en bout

> **⚠️ OBSOLÈTE (conservé pour l'historique de conception).** Ce document
> décrit une architecture (worker Playwright séparé, type Railway/Docker)
> qui n'a **jamais été déployée en production sous cette forme** et qui,
> depuis la migration vers
> [ball-manager-back](https://github.com/anisfut1/ball-manager-back) (voir
> `docs/MIGRATION_TO_API.md`), n'existe plus du tout dans ce repository —
> `src/app/api/internal/*` a été supprimé. L'architecture RÉELLEMENT
> implémentée (sans worker séparé, sans Railway/Render/Fly.io : trois
> phases cron sur des Vercel Functions) est documentée dans
> `docs/JOBS.md` et `docs/FBI.md` **côté ball-manager-back**. Le reste de ce
> document est conservé tel quel pour la trace de la décision de
> conception d'origine, jamais comme référence à jour.

Ce document décrit comment l'intégration FBI/e-Marque fonctionne
RÉELLEMENT, de bout en bout, sans intervention humaine après la
configuration initiale d'un club. Il complète (sans les remplacer) :

- `docs/FFBB_ECOSYSTEM_RESEARCH.md` — l'API publique FFBB (calendrier,
  résultats), qui reste la source PRIMAIRE et ne dépend jamais de FBI.
- `docs/FBI_AUTHENTICATED_SPIKE.md` — l'historique du spike FBI authentifié
  et ce qui a été relayé (jamais observé directement dans cette session).
- `docs/MULTI_TENANCY.md` — le modèle multi-club, dont tout ce qui suit
  hérite (chaque club a ses propres identifiants, jobs, documents, storage).
- `worker/README.md` — l'usage pratique et le déploiement du worker
  lui-même (Railway, variables d'environnement, tests).

## 1. Vue d'ensemble

```
┌─────────────────┐        ┌──────────────┐        ┌─────────────────────┐
│  Next.js/Vercel  │        │  PostgreSQL   │        │   Worker FBI          │
│                  │        │  (Supabase)   │        │   (Railway, Docker)   │
│ - Admin UI       │◄──────►│               │◄──────►│ - Chromium headless   │
│ - Cron enqueue   │  jobs  │ - fbi_jobs    │  claim │   (Playwright)        │
│   (rapide, léger)│  ─────►│ - match_docs  │◄────── │ - Login FBI par club  │
│ - Cron parsing   │        │ - matches     │        │ - Découverte/DL       │
│   (OCR, léger)   │        │ - fbi_creds   │        │   documents e-Marque  │
└─────────┬────────┘        └──────┬───────┘        └──────────┬───────────┘
          │                        │                            │
          │                        │                            ▼
          │                        │                  Supabase Storage
          │                        │                  (bucket privé `emarque`)
          ▼                        │
   FFBB API publique      RLS + policies club-scopées
   (calendrier, résultats)
```

Trois processus complètement séparés partagent la même base PostgreSQL :

1. **L'app Next.js/Vercel** — jamais de Playwright. Deux crons légers
   (`vercel.json`) :
   - `/api/internal/discover-emarque` : empile des jobs `fbi_jobs`
     (type `discover_emarque`), un par match candidat, pour les clubs qui
     ont FBI configuré ET la récupération automatique activée. Ne fait
     JAMAIS de login FBI lui-même.
   - `/api/internal/parse-emarque` : consomme `match_documents` (type
     `emarque_zip`, statut `downloaded`) et réutilise TEL QUEL le pipeline
     OCR/PDF déjà construit (`src/server/emarque/**`) — jamais de
     Playwright non plus.
2. **PostgreSQL (Supabase)** — la file de travail (`fbi_jobs`,
   `FOR UPDATE SKIP LOCKED` via `claim_next_fbi_job`) et le manifeste des
   fichiers (`match_documents`).
3. **Le worker FBI** (`worker/`, service séparé, voir `worker/README.md`)
   — le SEUL endroit où Playwright tourne. Réclame des jobs, pilote un
   Chromium headless, dépose les fichiers dans Supabase Storage et une
   ligne `match_documents` par fichier. Ne parse jamais lui-même les ZIP
   (ça reste le rôle du cron `parse-emarque`, pour ne pas dupliquer la pile
   OCR dans l'image Docker du worker).

## 2. Pourquoi cette séparation (et pas Playwright dans une route Vercel) ?

Une Vercel Function a une durée d'exécution limitée et ne prévoit pas de
faire tourner un navigateur headless de façon fiable. Le worker est un
processus Node **long-running**, déployé séparément (Railway — voir
`worker/README.md` pour pourquoi ce choix plutôt que Render/Fly.io), qui
peut se permettre d'attendre une page FBI, remplir un formulaire, cliquer,
et télécharger un fichier sans contrainte de timeout serverless.

## 3. `HttpFbiClient` vs `BrowserFbiClient`

Les deux implémentent la même interface conceptuelle (`login`,
`isSessionValid`, `findEmarqueDocuments`, `downloadDocument`) — voir
`src/lib/fbi/types.ts` (`FbiAutomationClient<TSession>`) côté app.

| | `HttpFbiClient` (`src/lib/fbi/http-client.ts`) | `BrowserFbiClient` (`worker/src/fbi/browser-client.ts`) |
|---|---|---|
| Où | App Next.js (Vercel) | Worker uniquement |
| Comment | `fetch` + cookie jar (`SimpleCookieJar`) | Chromium headless (Playwright) |
| Login | PREPARED — détection dynamique du formulaire (cheerio), jamais de nom de champ deviné | PREPARED — mêmes heuristiques, transposées en Playwright |
| Découverte e-Marque | Échoue explicitement (`EMARQUE_DOWNLOAD_ENDPOINT_NOT_CONFIRMED`) — aucun endpoint HTTP confirmé, jamais inventé (§58 du brief FBI) | Voie FONCTIONNELLE — navigue et scanne la page comme le ferait un humain |
| Utilisé pour | Le bouton "Tester la connexion" de `/c/{slug}/admin/integrations/fbi` (synchrone, rapide) | Les jobs `discover_emarque` (et optionnellement `test_connection`, voir `worker/src/jobs/process-test-connection.ts`) |

`HttpFbiClient` reste la stratégie PRIMAIRE testée en premier là où c'est
suffisant (login seul). Le reste de l'app ne sait jamais laquelle est
active à un instant donné — un club "FBI connecté" l'est identiquement du
point de vue de l'UI, que la dernière vérification ait été faite en HTTP ou
en navigateur.

## 4. Détection du login (§15 du brief FBI)

Un code HTTP 200 ne prouve rien pour une appli Java legacy : elle peut très
bien renvoyer 200 sur sa propre page de connexion en cas d'échec. La preuve
utilisée par les deux clients est l'ABSENCE d'un champ `input[type=password]`
sur la page d'atterrissage (`looksLikeLoginPage`).

`classifyFbiLoginStatus` (`src/lib/fbi/errors.ts`, dupliqué dans
`worker/src/fbi/errors.ts`) traduit le résultat en un statut exploitable :

| Statut | Signification | Comportement du worker |
|---|---|---|
| `CONNECTED` | Login réussi | Continue le job |
| `INVALID_CREDENTIALS` | Formulaire soumis, refusé | Job marqué `failed` immédiatement — jamais de retry (un mauvais mot de passe ne se corrige pas tout seul) |
| `FBI_UNAVAILABLE` | Page injoignable / requête échouée | Job replanifié avec backoff court (`nextErrorBackoffSeconds`), abandonné après `max_attempts` |
| `AUTH_FLOW_CHANGED` | Formulaire non reconnu (structure FBI changée) | Job marqué `failed`, `fbi_integration_status.last_error` porte le message — visible sur `/c/{slug}/admin/integrations` (§44 du brief FBI : la panne reste scopée à ce club, jamais toute la plateforme) |
| `UNKNOWN_ERROR` | Autre exception | Traité comme une panne transitoire (retry avec backoff) |

## 5. Sélecteurs centralisés (§16 du brief FBI)

`worker/src/fbi/selectors.ts` centralise TOUTE la détection d'éléments côté
navigateur : jamais de sélecteur positionnel (`div:nth-child(4)`), toujours
un attribut stable (`type`, `name`, `href`), du texte visible, ou un
libellé. Si FBI change légèrement sa mise en page, un seul fichier est à
ajuster.

## 6. Rapprochement match FBI ↔ match local (§17/§18 du brief FBI)

Chaque job `discover_emarque` porte un `match_id` déjà connu localement
(créé par la synchronisation FFBB, jamais par FBI — voir §9 ci-dessous). Le
`numero` de rencontre (colonne `matches.numero`, alimentée par l'API
publique FFBB) est le critère de recherche transmis à
`BrowserFbiClient.findEmarqueDocuments` — jamais un identifiant deviné.
Aucun mécanisme actuel ne permet à FBI de créer un nouveau match : le
job échoue simplement (`match introuvable`) s'il n'y a pas de `numero`, il
n'invente jamais de correspondance ambiguë.

## 7. Découverte et téléchargement des documents e-Marque (§19/§20 du brief FBI)

`findEmarqueDocuments` (navigation générique, voir §5) renvoie une liste de
liens. Le ZIP complet a TOUJOURS priorité s'il est présent
(`processDiscoverEmarqueJob`, `worker/src/jobs/process-discover-emarque.ts`) ;
sinon, les documents séparés (feuille, résumé, positions de tir) sont
téléchargés individuellement. Le téléchargement lui-même passe par
`context.request.get(url)` (Playwright) : la requête réutilise
automatiquement les cookies de la session authentifiée, sans jamais
toucher le système de fichiers du worker (§21 du brief FBI) ni celui d'un
utilisateur — le fichier reste en mémoire (`Buffer`) du téléchargement
jusqu'au dépôt Storage.

## 8. `match_documents` — le manifeste (§23/§24 du brief FBI)

Une ligne par fichier individuel (pas par match) :

| Colonne | Rôle |
|---|---|
| `type` | `emarque_zip` / `match_sheet` / `summary` / `shot_chart` / `other` |
| `sha256` | Empreinte du contenu réel — UNIQUE sur `(club_id, match_id, type, sha256)` |
| `storage_path` | `private/emarque/{clubId}/{season}/{matchId}/{fileName}` (identique app/worker, voir `src/lib/storage/emarque-storage.ts` et `worker/src/storage.ts`) |
| `status` | `downloaded` → `parsing` → `imported`/`error` (mis à jour par le cron de parsing, jamais par le worker) |

Un même fichier (même hash) n'est jamais dupliqué : une tentative
d'insertion en conflit (`23505`) est traitée comme "déjà téléchargé", pas
comme une erreur. Une NOUVELLE version du document (hash différent) crée
une NOUVELLE ligne — l'historique n'est jamais supprimé silencieusement.

## 9. FBI est facultatif — capacités par club

`src/lib/tenancy/club-capabilities.ts` centralise la question "qu'est-ce que
ce club peut faire ?" :

```ts
interface ClubCapabilities {
  ffbb: boolean;    // calendrier/résultats — toujours vrai sauf club désactivé
  fbi: boolean;      // identifiants FBI enregistrés
  emarque: boolean;  // fbi ET dernière connexion réussie
}
```

Le calendrier FFBB (matchs, résultats, salles) ne dépend JAMAIS de `fbi`.
FBI n'enrichit que des matchs DÉJÀ connus via l'API publique FFBB — jamais
l'inverse, jamais de second calendrier parallèle. Concrètement :

- Un club SANS identifiants FBI : `enqueueEmarqueDiscoveryJobsForClub`
  (`src/lib/domain/emarque/discover-emarque.ts`) renvoie
  `skippedNotConfigured: true` sans même interroger les matchs — AUCUN job
  `fbi_jobs` créé, AUCUNE erreur. Le reste de l'app (calendrier, sync FFBB,
  modules internes) continue de fonctionner normalement.
- Un club AVEC FBI configuré mais actuellement en panne : les jobs
  continuent d'être créés et tentés (ils échoueront et seront replanifiés
  par le worker) — le calendrier FFBB de ce club n'est jamais affecté.

## 10. Automatisation, jobs, retry (§9-§13, §27, §47 du brief FBI)

- `fbi_jobs` (PostgreSQL) est la file de travail — pas de Redis/Kafka.
- `claim_next_fbi_job` (SQL, `FOR UPDATE SKIP LOCKED`) garantit qu'aucun job
  n'est traité deux fois, et qu'un club n'a jamais plus d'une session FBI
  active simultanément, quel que soit le nombre de workers/boucles internes.
- `WORKER_CONCURRENCY` (défaut 2) borne le nombre de boucles de réclamation
  DANS un même processus worker — commencer bas (§12 du brief FBI).
- Un document pas encore disponible n'est jamais une erreur
  (`nextWaitingBackoffSeconds` : 30 min / 2h / 6h / 24h, puis 24h en continu
  — §47 : la fréquence baisse après plusieurs jours plutôt que de
  s'arrêter). Une vraie panne (`nextErrorBackoffSeconds`, plus courte)
  abandonne après `max_attempts` (`fbi_jobs.max_attempts`, défaut 6).

## 11. Dérogations et licenciés FBI — point d'extension, pas un module (§40/§41 du brief FBI)

Le spike relayé (voir `docs/FBI_AUTHENTICATED_SPIKE.md` §6) indique qu'un
export XLSX des dérogations est accessible, et que des routes AJAX de
consultation existent (ex. `afficherLicenceStatistiqueAjax.fbi`, classée
READ_ONLY par `src/lib/fbi/action-classification.ts`). Aucune route exacte
n'a été confirmée directement dans cette session : ni le module dérogations,
ni une synchronisation licenciés FBI complète ne sont développés. Le point
d'extension prévu est une méthode `listDerogations()` sur
`FbiAutomationClient`, à ajouter le jour où la route sera confirmée — sans
qu'aucune donnée de dérogation soit persistée en base pour l'instant.

## 12. Multi-tenant — isolation (§13, §56 du brief FBI)

- Chaque `BrowserFbiClient.login()` crée un `BrowserContext` Playwright
  ISOLÉ (équivalent navigation privée) — jamais de cookie partagé entre deux
  clubs, même si un même worker traite les deux à des instants différents.
  Testé dans `worker/test/browser-client.test.ts`
  ("isole chaque session dans son propre contexte navigateur").
- Le déchiffrement des identifiants (`worker/src/crypto.ts`) utilise le
  `club_id` comme AAD (Additional Authenticated Data) — un ciphertext
  déplacé par erreur vers un autre club ne se déchiffre jamais avec l'AAD
  de ce nouveau club. Testé dans `worker/test/crypto.test.ts`.
- Chaque fichier déposé va sous `private/emarque/{clubId}/...` — jamais de
  chemin partagé entre deux clubs.

## 13. Observabilité (§42 du brief FBI)

Chaque opération loggée (`worker/src/logger.ts`, même format que
`src/lib/logger.ts`) porte `club_id`, `job_id`/`match_id`, l'opération, et
le statut — jamais un mot de passe, un cookie, un contenu de document, ou
un nom complet de joueur.

## 14. Ce qui reste honnêtement NON testé en conditions réelles

- Tout appel réseau réel contre `*.ffbb.com` (bloqué depuis tous les
  environnements où ce code a été écrit, voir
  `docs/FBI_AUTHENTICATED_SPIKE.md` §2).
- La navigation post-login réelle de `BrowserFbiClient.findEmarqueDocuments`
  (recherche de rencontre, page de résultat) : conçue de façon générique et
  défensive faute d'avoir pu observer le markup réel — testée uniquement
  contre des fixtures HTML synthétiques plausibles
  (`worker/test/fixtures/*.html`).
- Le déploiement effectif sur Railway (le `Dockerfile` et la configuration
  sont prêts, voir `worker/README.md`, mais aucun déploiement n'a été
  effectué depuis cet environnement).
