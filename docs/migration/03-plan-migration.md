# 03 — Plan de migration
_Phase 2, 2026-10-07. Ordre : **sécurité d'abord**, puis meilleur ratio gain/effort, en respectant les dépendances. Chaque lot est petit, testable, réversible (règle 3). Tout lot « back requis » est **⛔ bloqué par Q-001** tant que l'accès à `ball-manager-back` n'est pas confirmé ; les lots **front seul** peuvent démarrer dès validation._

## Vue d'ensemble
| Lot | Intitulé | TRT | Prio | Back requis | Statut |
|-----|----------|-----|------|-------------|--------|
| LOT-00 | Vulnérabilités de prod | — | P1 | non | ✅ |
| LOT-01 | Auth : jeton mémoïsé + `getClaims()` | TRT-002 | P1 | non | ✅ `a4c2580` |
| LOT-02 | Roster public : recherche serveur **+ R-018 revendication soumise à validation admin** — **1ᵉʳ lot de la Phase 4** (R-013, révision obligatoire) | TRT-001 | P1 | oui (nouveau back) | ⛔ nouveau back |
| LOT-03 | Gymnases dynamiques (multi-tenant) | TRT-003 | P1 | à confirmer | ⛔ nouveau back |
| LOT-04 | Réglages club via `PATCH /v1/clubs/{id}` existant (+ vérifier validation du fuseau) | TRT-011 | P2 | **non** (endpoint existant, E-2) | ✅ livré (voir `git log`) |
| LOT-05 | Saison & journée côté serveur | TRT-007, TRT-008 | P2 | oui | ⛔ nouveau back |
| LOT-06 | Matchs : utiliser les filtres serveur existants (E-3) ; `weekends` nouveau | TRT-006 | P2 | partiel (`/matches/weekends`) | ✅ livré **derrière flag** `FF_MATCHES_SERVER_FILTERS` (défaut off) ; `period=weekend` non utilisé (Q-014) |
| LOT-07 | Endpoint tableau de bord (BFF) | TRT-005 | P1 | oui | ⛔ (dépend LOT-01, LOT-05) |
| LOT-08 | Résultats groupés côté serveur | TRT-009 | P2 | oui | ⛔ (dépend LOT-05) |
| LOT-09 | Import licenciés : parsing serveur | TRT-010 | P2 | oui | ⛔ nouveau back |
| LOT-10 | Opérations longues en jobs asynchrones | TRT-004 | P1→P2 | oui | ⛔ nouveau back (gros, à découper) |
| LOT-11 | CI minimale (typecheck, lint, tests, build) + gitleaks | — | P2 | non | ✅ (commit ci-après ; premier run réel à observer après push) |
| LOT-12 | Petites listes & résumés (opportuniste) | TRT-012 à 015 | P3 | oui | ⛔ |
| LOT-13 | Nettoyage : `worker/`, `next.config.ts`, commentaires | — | P3 | non | ⬜ Phase 5 (Q-005 ✅) |
| LOT-14 | En-têtes de sécurité (CSP **Report-Only** ✅) + durcissement jeton public (R-008, ⬜) | — | P2 | non (jeton : nouveau back) | 🟡 CSP Report-Only, anti-framing et jeton en fragment (front) livrés (`12-csp-report-only.md`) ; reste R-008, le passage en mode bloquant (plan `12` §6) et l'activation du transport par en-tête (dépend de `ball-manager-back`) |

**Ordre recommandé** : LOT-01 → LOT-11 (livrés) ; puis, dès que le nouveau back existe : **LOT-02 en tête (R-013)** → LOT-03 → LOT-04 → LOT-05 → (LOT-06 ∥ LOT-07 ∥ LOT-08) → LOT-09 → LOT-10 → LOT-12 ; LOT-13 en Phase 5.
**Phase 3 (2026-10-07)** : LOT-04 et la majeure partie de LOT-06 sont **réalisables sans nouveau back** (endpoints existants, `04` E-2/E-3). Ils ne sont pas lancés : en attente de la validation 🛑 de fin de Phase 3.
**Pourquoi LOT-07 (gros gain) après LOT-05** : il réutilise la borne de saison et la règle de journée côté serveur ; le faire avant dupliquerait la règle une 3ᵉ fois.
**Pourquoi LOT-10 tardif** : le plus risqué (comportements d'intégration FFBB/FBI non testables sans le back) ; il se découpe en sous-lots par endpoint (sync FFBB, process-jobs, parse-documents, check-all-derogations, dérogation respond/check, import).

## Modèle commun à chaque lot (rappel du cycle Phase 4)
Test de caractérisation → implémentation back + tests → bascule front (feature flag si risque moyen/élevé) → suppression du code front → mesure avant/après (`08-metriques.md`) → doc (`04`, `CHANGELOG`, `00`) → commit atomique.
Flags : variable `NEXT_PUBLIC_*` **interdite** pour un flag sensible ; utiliser une variable serveur Next (`FF_<LOT>`), lue côté Server Component, ou un paramètre côté back (à confirmer).




## LOT-01 — Auth : un seul `getUser()` par requête, `getClaims()` en proxy (TRT-002) — P1, **front seul**
- **Objectif** : passer de ~9 allers-retours Supabase Auth par navigation à ≤ 3, sans réduire la sécurité effective.
- **Périmètre** : `src/lib/api/auth.server.ts`, `src/lib/auth/session.ts`, `src/proxy.ts`. Aucune modification du back.
- **Étapes** : (1) mesurer le nombre d'appels Auth par page (log temporaire en test, compteur dans un test unitaire avec mock) ; (2) envelopper `getServerAccessToken` dans `cache()` (portée = requête) ; (3) `requireUser()` réutilise le même résultat ; (4) **si Q-008 = clés asymétriques** : `proxy.ts` utilise `getClaims()` ; sinon on s'arrête à (2)-(3).
- **Tests** : `server.test.ts` (401 → redirect `/login`, déjà présent) + nouveau test « N appels `api.*` → 1 `getUser()` » ; test `proxy` : non connecté → redirect `/login?redirectTo=`, routes publiques passantes.
- **Done** : tests verts ; build OK ; compteur d'appels Auth documenté avant/après ; revue sécurité écrite (durée d'invalidité d'un token révoqué = durée de vie JWT) acceptée par le propriétaire.
- **Bascule** : remplacement direct par étape (2)-(3) (garantie identique) ; l'étape (4) derrière variable serveur `FF_PROXY_CLAIMS`.
- **Rollback** : `git revert` du commit (étape par étape).

## LOT-02 — Roster public : recherche serveur (TRT-001) — P1, back requis
- **Objectif** : ne plus exposer la liste nominative complète d'un club à un anonyme.
- **Endpoints (à confirmer)** : `GET /v1/public/clubs/:slug/licencies?q=&limit=` (q ≥ 2 car., limit ≤ 8, rate-limit IP, `claimed` non exposé hors correspondance exacte). Ancien endpoint : conserver une période de transition puis fermer.
- **Front** : `IdentifyView.tsx` interroge le serveur avec debounce (300 ms) ; supprime `listPublicLicencies` complet et le filtre local.
- **Tests** : caractérisation du parcours d'identification (test de composant à créer — Vitest en env `node`, il faudra un environnement DOM : à décider, voir R-006) ; tests d'intégration back (q trop court → 400, énumération impossible).
- **Done** : un anonyme ne peut plus récupérer plus de 8 noms par requête ; ancien endpoint fermé ; mesure du payload avant/après.
- **Bascule** : double support (le front choisit selon `FF_PUBLIC_SEARCH`) puis coupure. **Rollback** : réactiver l'ancien endpoint + flag.

## LOT-03 — Gymnases dynamiques (TRT-003) — P1, back à confirmer
- **Objectif** : retirer `HOME_VENUES` (Clavel/Lido) du code ; colonnes de l'agenda dérivées des gymnases du club.
- **Endpoint** : `GET /v1/clubs/:clubId/venues` (existant) + rapprochement match↔venue (côté back si possible, `venuesLikelyMatch` existe d'après `HomeMatchesAgenda.tsx:22-24`) ; vue publique : équivalent public à confirmer.
- **Tests** : caractérisation de `resolveVenueColumnKey` avec les libellés réels (CLAVEL, LIDO, LE HETET, PALAIS DES SPORTS, THOMAS BARONCHELLI) avant refactor ; test « club sans gymnase configuré → une seule colonne ».
- **Done** : plus aucun nom de salle en dur dans `src/` (grep) ; rendu identique pour Sète.
- **Bascule** : flag serveur `FF_VENUE_COLUMNS` ; **rollback** : flag off.

## LOT-04 — Réglages du club via l'API (TRT-011, décision D-1) — P2, back requis
- **Objectif** : supprimer le dernier accès Supabase direct et valider le fuseau.
- **Endpoint (à confirmer)** : `PATCH /v1/clubs/:clubId/settings` (`name`, `shortName`, `timezone` validé contre `Intl.supportedValuesOf("timeZone")`, droits club_admin).
- **Front** : `club-settings.ts` appelle `api`, plus de `createServerSupabaseClient` ; `@/types/database` à réévaluer (Phase 5).
- **Tests** : action testée avant/après (mock) ; test back « fuseau invalide → 422 ».
- **Done** : `grep -rn "\.from(" src` vide.
- **Rollback** : revert du commit (l'ancien chemin RLS reste valide).

## LOT-05 — Saison et journée côté serveur (TRT-007, TRT-008) — P2, back requis
- **Objectif** : une seule définition de la saison et de la « journée » (Paris vs `club.timezone` tranché).
- **Endpoints (à confirmer)** : défaut `season=current` sur `GET …/matches` ; champ `weekendKey` par match ; `GET …/matches/weekends`.
- **Prérequis** : décision D-2 (fuseau : toujours Europe/Paris ou `club.timezone` ?).
- **Tests** : `season.test.ts`, `timezone.test.ts`, `match-filters.test.ts` (existants) deviennent les tests de caractérisation ; ajouter 31 juillet/1ᵉʳ août et changement d'heure.
- **Done** : plus de `currentSeasonStart` ni de `Europe/Paris` en dur hors affichage ; `src/lib/season.ts` supprimé.
- **Bascule** : flag `FF_SERVER_SEASON` ; **rollback** : flag off.

## LOT-06 — Matchs : filtres et pagination serveur (TRT-006) — P2
- **Périmètre** : `match-filters.ts`, `MatchesView.tsx`, pages matchs club/public. **Endpoint** : `?when=&side=&teamId=&weekend=&limit=&cursor=`. **Tests** : `match-filters.test.ts` comme oracle (mêmes entrées/sorties via le back en test d'intégration). **Done** : payload `/matchs` ≤ une journée (mesure). **Rollback** : flag.

## LOT-07 — Endpoint tableau de bord (TRT-005) — P1, back requis
- **Endpoint (à confirmer)** : `GET /v1/clubs/:clubId/dashboard` (rôle-aware). **Front** : `dashboard/page.tsx` → 1-2 appels, plus de calcul de victoires ; unifier la règle de victoire avec `matchOutcome` (corriger le cas `isHome === null`, **changement de comportement à documenter**). **Tests** : caractérisation des 4 cartes pour admin/non-admin avec jeu de données figé ; comparaison double-run (ancien calcul vs nouveau) en environnement de test. **Done** : ≤ 2 appels API, gain mesuré (`08`). **Bascule** : double-run puis flag `FF_DASHBOARD_BFF`. **Rollback** : flag.

## LOT-08 — Résultats groupés côté serveur (TRT-009) — P2
- **Endpoint** : `GET …/results`. **Tests** : `result-groups.test.ts` existant = oracle ; ajouter le cas « deux équipes même libellé » (jointure par `teamId`). **Rollback** : flag.

## LOT-09 — Import licenciés : parsing serveur (TRT-010) — P2
- **Endpoint** : `POST …/licencies/import` accepte `{ text }` ; parseur CSV/TSV réel (guillemets, virgules). **Tests** : extraire `parseRows` sans changer son comportement, fixer ses sorties (export FBI réel anonymisé), puis les rejouer côté back. **Done** : cas « nom entre guillemets avec virgule » correct. **Rollback** : l'ancien payload `{ licencies: [...] }` reste accepté pendant la transition.

## LOT-10 — Opérations longues en jobs asynchrones (TRT-004) — P1→P2, back requis, à découper
- **Principe** : endpoints `202 + jobId`, suivi via `getJob`/`pollJobUntilTerminal` (existants, `jobs.ts`). Sous-lots : 10a sync FFBB (`integrations.ts:64`), 10b process-jobs (`:82`), 10c parse-documents (`:98`), 10d check-all-derogations (`:138`), 10e dérogation respond/check (`derogations.ts:44`, `matches.ts:107,127`), 10f tables publiques (`publicTables.ts:134,143`), 10g import/auto-assign licenciés (`licencies.ts:52,65`). Planifier en cron ce qui est lancé à la main (10b, 10c).
- **Tests** : test d'intégration back par endpoint ; côté front, test de `pollJobUntilTerminal` (borne d'essais) ; scénario « onglet fermé pendant le job ». **Done** : plus aucun `timeoutMs` > 20 s dans `src/lib/api`. **Rollback** : par sous-lot (flag + ancien endpoint conservé).

## LOT-11 — CI minimale (P2, front seul)
- **Périmètre** : workflow qui lance `npm ci`, `typecheck`, `lint`, `test`, `build` (variables factices) + `npm audit --omit=dev --audit-level=high`. **Hébergeur** : Q-007 non renseignée → proposer GitHub Actions par défaut, à valider. **Done** : pipeline vert sur la branche. **Option** : scan de secrets (gitleaks) pour fermer R-009.

## LOT-12 — Petites listes et résumés (TRT-012 à 015) — P3, opportuniste
- À regrouper quand le back est ouvert ; chacun est un petit ajout de champ/paramètre. Aucun critère de gain mesurable avant décision.

## LOT-13 — Nettoyage (Phase 5) — P3
- Supprimer `worker/` après vérification qu'aucun script/déploiement/doc active ne le référence (Q-005 ✅) ; retirer `serverExternalPackages`/`outputFileTracingIncludes` morts de `next.config.ts:3-17` ; mettre à jour les commentaires obsolètes (`proxy.ts:55-58`, `supabase/server.ts:15`) ; retirer les variables mortes de `vitest.setup.ts:11-14`. **Done** : build/tests identiques ; `docs/FBI_WORKER.md` annoté.


## LOT-00 — Sécurité : vulnérabilités de dépendances de production (P1)
- **Objectif** : corriger les vulnérabilités `npm audit --omit=dev` (1 critique, 2 hautes) — détail en `01-cartographie-repo.md`.
- **Périmètre** : `package.json`, `package-lock.json` (+ `worker/` si concerné). Vulnérabilités de dev : consignées seulement.
- **Tests** : typecheck, lint, vitest, build identiques à la baseline (`07-tests-et-qualite.md`).
- **Critères de done** : `npm audit --omit=dev` sans critique/haute, ou exceptions justifiées en ADR.
- **Bascule / rollback** : commit unique, `git revert`.
- **Réalisé (2026-10-07)** : `next` 16.3.5 → 16.3.6 (exception autorisée à la règle 1), `eslint-config-next` aligné, `npm audit fix` sans `--force`. Résultats : `07-tests-et-qualite.md`.
- **Rollback** : `git revert <commit LOT-00>` puis `npm ci` (le lockfile revient à 16.3.5/sharp 0.35.4/source-map-js 1.2.1). Aucun changement de code applicatif à défaire.
- **Statut** : ✅ Terminé

## LOT-14 — En-têtes de sécurité et jeton public (R-008) — P2, **non implémenté**
- **Périmètre** : `next.config.ts` (`headers()` : CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`/`X-Frame-Options`, `Permissions-Policy`) ; `src/lib/publicToken.ts:13-41` (localStorage).
- **Points d'attention** : Next 16 + styles inline/Tailwind exigent une CSP à nonce (à valider dans `node_modules/next/dist/docs/` avant d'écrire du code, AGENTS.md) ; autoriser `connect-src` vers l'URL Supabase et `ball-manager-back` ; déployer d'abord en `Content-Security-Policy-Report-Only`.
- **Jeton public** : durée de vie, rotation et révocation côté back (Q-001) ; envisager un cookie `HttpOnly` plutôt que `localStorage` (change l'architecture du lien personnel : décision à part).
- **Tests** : test d'en-têtes sur la config ; parcours manuel connexion/espace public. **Done** : CSP en mode report-only sans violation sur les parcours principaux, puis enforcement. **Rollback** : retirer `headers()`.

## Rappels de la Phase 3
- Contrats détaillés par lot : `04-contrats-api.md` §B (B.1 = LOT-02, B.2 = LOT-03, B.3 = LOT-05/06, B.4 = LOT-04, B.5 = LOT-07, B.6 = LOT-08, B.7 = LOT-09, B.8 = LOT-10, B.9 = LOT-14/R-014, B.10 = LOT-12).
- Choix structurants : ADR-002 à ADR-007 (statut **Proposée**, en attente de Q-011/Q-012/Q-013).
- LOT-14 (CSP, jeton public) inclut le transport du jeton par en-tête (E-4, B.9) : exige le nouveau back **et** une modification du front.

## LOT-04 — livré (2026-10-07)
- `src/server/actions/club-settings.ts` appelle `api.clubs.update` (`PATCH /v1/clubs/{id}`) ; plus aucun import Supabase ni `.from(` dans le fichier ; `grep -rn "\.from(" src` : aucun résultat (Supabase ne reste que pour l'authentification : `server/actions/auth.ts`, `lib/api/auth.*`).
- **Validation du fuseau conservée côté front** (D-1) tant que Q-014 n'est pas confirmée (le `PATCH` rejette-t-il un fuseau invalide ?).
- Gestion d'erreurs : 400/422 → message du back ; 403 → message dédié ; service injoignable → message dédié ; redirection `/login` (401) jamais avalée (`unstable_rethrow`).
- Tests : `src/server/actions/club-settings.test.ts` (9) — caractérisation écrite d'abord sur l'ancien code (6 verts), puis adaptée à l'API.
- **Rollback** : `git revert <commit LOT-04>` (l'ancienne écriture RLS reste valide côté base).
- **Reste** : `src/types/database.ts` (typage du client Supabase) n'est plus nécessaire qu'à `lib/supabase/*` : à réévaluer en Phase 5.

## LOT-06 — livré derrière flag (2026-10-07)
- **Code** : `ListMatchesParams` étendu (`teamId`, `homeAway`, `status`) et `matchesFilterSearchParams` (`src/lib/api/matches.ts`, partagé club/public) ; `src/features/matches/load-matches.ts` (`buildServerMatchQuery`, `loadMatchesForView`) ; flag serveur `src/config/flags.ts` (`FF_MATCHES_SERVER_FILTERS`, défaut **off**) ; pages `c/[clubSlug]/matchs` et `public/[clubSlug]/matchs`.
- **Ce qui part au serveur** : `teamId` (seulement si l'id figure dans les équipes), `homeAway`, période « À venir » (`from=now`) / « Passés » (`to=now`). **Mode Journée : saison entière** (sélecteur de journée). `status` : paramètre disponible mais **aucune UI** ne l'utilise (aucun filtre de statut n'existait).
- **`period=weekend` non utilisé** (Q-014). Le filtrage local `applyMatchFilters` est **toujours appliqué ensuite** (idempotent) : parité garantie par construction ; à retirer en Phase 5 une fois Q-014 confirmée.
- **Pagination** : `listMatches` pagine déjà (pages de 200) ; la vue publique ne paginait pas (R-015) : **corrigé** par le commit R-015 ci-dessous.
- **Tests** : `load-matches.test.ts` (22) — caractérisation (comptes figés sur l'ancien code : 15 / 1 / 315 / 158 / 75 / 5 / 11), parité × 2 sémantiques de `to`, requêtes, appels réseau, mesure simulée.
- **Activer** : définir `FF_MATCHES_SERVER_FILTERS=1` sur le déploiement du front (variable **serveur**, jamais `NEXT_PUBLIC_*`), redéployer. **Rollback** : retirer la variable (ou `=0`) et redéployer ; `git revert` du commit en dernier recours.
- **Critère pour retirer le flag** : Q-014 confirmée, mesure réelle (pas simulée) sur un déploiement de prévisualisation, absence d'écart d'affichage sur une semaine d'usage.

## LOT-02 — spécification v2 (2026-10-07, Q-018 = option 1)
Contrat et règles : `04` §B.1 (OpenAPI), `11` §7 (règles chiffrées, mineurs, journaux, tests, bascule, fermeture de l'ancien endpoint). **Résumé** : `q` = prénom + nom (≥ 2 mots de ≥ 2 lettres) ; 5 résultats max ; `id` + prénom + initiale seulement ; plus de `claimed` ; budgets 30/min et 300/h par IP, 600/h par club ; journaux sans donnée personnelle (14 jours). **Dépendances** : repo du back (propriétaire), validation des règles (Q-020), vérification V1, fermeture de l'ancien endpoint (propriétaire, critère vérifiable `11` §7.7). **Statut** : spécifié, **non démarré**.



## R-015 — pagination de la vue publique des matchs (2026-10-07, front seul)
- **Défaut** : `listPublicMatches` faisait un seul appel `limit=200` (`publicMatches.ts`, ancien l.36-39) : sur le jeu synthétique de 390 matchs, **190 matchs perdus** (les plus récents si l'API trie par date croissante, hypothèse `matches.ts:40-52`). Concernait `public/[clubSlug]/matchs` et `public/[clubSlug]/resultats`.
- **Correctif** : pagination par pages de 200 avec `offset`, arrêt sur page incomplète ou `pagination.total` atteint ; **plafond de sécurité 25 pages = 5 000 matchs** (`PUBLIC_MATCHES_MAX_PAGES`, 10× la saison estimée). Au-delà du plafond la liste est volontairement partielle et silencieuse (documenté dans le code).
- **Tests** : `publicMatches.test.ts` (8) ; la caractérisation d'origine (1 appel, 200 reçus sur 390) a été écrite et passée **sur l'ancien code** avant le correctif, puis remplacée par l'attendu corrigé.
- **Coût** : +1 requête pour une saison de 201 à 400 matchs (séquentielle). **Rollback** : `git revert` du commit.
- **Non vérifié** : le comportement réel de l'API (tri, présence de `pagination` sur la route publique) — Q-014 T6/T7.

## LOT-14 — partie CSP livrée (2026-10-07)
En-têtes posés dans `next.config.ts` via `src/config/security-headers.ts` ; **CSP en `Content-Security-Policy-Report-Only` uniquement** ; sources et preuves, décisions Q-021 et procédure de lecture : `12-csp-report-only.md`. Tests : `security-headers.test.ts` (13). **Rollback** : retirer la fonction `headers()` de `next.config.ts` (ou `git revert`). **Reste** : R-008, fragment `#token=` (R-014), collecteur éventuel, passage en mode bloquant (nonce).

## Addendum 2026-10-07 — LOT-02 étendu à R-018 ; LOT-14 front livré
- LOT-02 : périmètre élargi (Q-022) : `request-link` uniforme + file de validation admin + exclusion des rôles coach/admin ; spécification `11` §7.9, contrat `04` B.1 bis. Tests de contrat d'abord (`11` §7.9.6).
- LOT-14 : livré côté front `4570207` (fragment `#token=`, nettoyage de l'URL, transport isolé, drapeau `NEXT_PUBLIC_PUBLIC_TOKEN_HEADER` défaut off) et `f2841a7` (anti-framing). **Rollback** : `git revert` du commit ; ou ne pas activer le drapeau. Ordre d'activation de l'en-tête : `ball-manager-back` accepte + autorise en CORS `X-Personal-Link-Token` → activer en prévisualisation → production → fermer `?token=` (`400 TOKEN_IN_QUERY`).
