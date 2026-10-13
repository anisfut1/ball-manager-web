# 07 — Tests et qualité

## Baseline Phase 0 (2026-10-07)
| Contrôle | Résultat |
|---|---|
| `npm ci` | ✅ OK (warnings allow-scripts : esbuild, fsevents, unrs-resolver) |
| `npm run typecheck` | ✅ OK |
| `npm run lint` | ✅ OK, 0 erreur |
| `npm test` (vitest) | ✅ 18 fichiers, 109 tests passés |
| `npm run build` | ✅ OK (avec variables NEXT_PUBLIC_* factices) |
| `npm audit` | ⚠️ 8 vulnérabilités (1 critique, 7 hautes) dont 3 en prod (1 critique, 2 hautes) — détail à analyser en Phase 1 |

Note : `worker/` a ses propres dépendances/tests, non exécutés en Phase 0.

## Constats Phase 1
- Tests uniquement unitaires sous `src/` (18 fichiers) ; aucun test de composant ni d'intégration ; pas de CI versionné.

## LOT-00 — avant / après (2026-10-07)
| | Avant | Après |
|---|---|---|
| `next` | 16.3.5 | **16.3.6** (exact, comme avant) |
| `eslint-config-next` | 16.3.5 | 16.3.6 (aligné sur next) |
| `sharp` (transitif) | 0.35.4 | 0.35.5 (+ binaires `@img/*` 0.35.5 / libvips 1.3.4) |
| `source-map-js` (transitif) | 1.2.1 | 1.2.2 |
| `npm audit --omit=dev` | 3 (1 critique, 2 hautes) | **0** |
| `npm audit` (complet) | 8 (1 critique, 7 hautes) | 5 hautes, **toutes dev** |
Baseline rejouée après `rm -rf node_modules && npm ci` : typecheck ✅, lint ✅, vitest ✅ 18 fichiers / 109 tests, build ✅ (variables factices).
Vulnérabilités dev restantes (consignées, hors lot) : `@next/eslint-plugin-next`, `eslint-config-next`, `braces`, `fast-glob`, `micromatch`. Le « correctif » proposé par `npm audit` est une rétrogradation majeure de Next (14.2.35) : non appliqué.
`npm audit fix` (sans `--force`) n'a modifié que des versions mineures/correctives (diff du lockfile vérifié : seuls next, @next/*, eslint-config-next, sharp et ses binaires, source-map-js).

## Mesures conservatoires et LOT-01 / LOT-11 (2026-10-07)
- Baseline après D-1 : 19 fichiers / **115 tests** ; après LOT-01 : 21 fichiers / **124 tests**, typecheck/lint/build ✅.
- Tests ajoutés : `src/lib/timezone.test.ts` (+2, `isValidTimezone`), `src/server/actions/club-settings.test.ts` (4), `src/lib/api/auth-calls.test.ts` (5 : caractérisation 8 → 1 appel, jeton transmis, pas de cache inter-requêtes, JWT refusé, sans session), `src/proxy.test.ts` (4).
- CI : `.github/workflows/ci.yml` validé par **actionlint** (0 erreur) ; la logique de vérification de somme de contrôle de gitleaks testée localement ; **premier run réel non effectué** (nécessite un push). Les jobs : `verify` (npm ci, typecheck, lint, test, build, `npm audit --omit=dev --audit-level=high`) et `gitleaks` (historique complet).
- Actions épinglées par tag majeur (`checkout@v7`, `setup-node@v7`) ; gitleaks épinglé `8.30.1`. Épingler par SHA = durcissement possible (chaîne d'approvisionnement), non fait.

## Premier run CI réel (2026-10-07)
Run `37612678201` : `verify` ✅ (9 étapes) et `gitleaks` ✅. Détails et limites : `10-risques.md`. Aucun correctif nécessaire. Branche poussée : `refactor/migration-back` uniquement (jamais `main`, pas de `--force`).

## LOT-04 et LOT-06 (2026-10-07)
- Baseline avant les lots : **124 tests** ; après LOT-04 : **129** (`club-settings.test.ts` passe de 4 à 9) ; après LOT-06 : **151 tests, 22 fichiers** ; typecheck, lint (0 avertissement), build (flag off **et** flag on) ✅.
- LOT-04 : caractérisation écrite d'abord sur l'ancien code (6 tests verts), puis adaptée à `api.clubs.update` ; vérification `grep -rn "\.from(" src` = aucun résultat.
- LOT-06 : jeu synthétique 390 matchs ; parité d'affichage 7 scénarios × 2 sémantiques de `to` ; comptes figés relevés sur le code d'origine (un premier jeu de valeurs saisi à la main était faux : corrigé en lisant le résultat réel de l'ancien code).

## CI après LOT-04, LOT-06 et révision Railway (2026-10-07)
Run `37618494863` (https://github.com/anisfut1/ball-manager-web/actions/runs/37618494863), commit `b540bbd` : `Typecheck, lint, tests, build` ✅ et `Secrets (gitleaks, historique complet)` ✅. Ce commit inclut le code des LOT-04 et LOT-06 (151 tests). Le push qui consigne ce run déclenche un run supplémentaire (docs seulement), non relevé ici.

## R-015 et LOT-14/CSP (2026-10-07)
- R-015 : `publicMatches.test.ts` (8 tests) ; la caractérisation d'origine (1 appel, 200 reçus sur 390) était verte sur l'ancien code avant le correctif.
- LOT-14/CSP : `security-headers.test.ts` (13) dont deux tests sur le `headers()` **réel** de `next.config.ts` (CSP uniquement en Report-Only, jamais d'en-tête `Content-Security-Policy` bloquant). Vérification de bout en bout : `next build` + `next start` local + `curl -I` sur `/login` et `/public/demo/matchs` (en-têtes présents). Non testé : comportement d'un vrai navigateur (relevé des violations = décision 1, `12` §3).
- Baseline : 159 tests avant LOT-14 ; **172 tests (24 fichiers) après**, typecheck, lint et build propres.

## CI après R-015 et LOT-14/CSP (2026-10-07)
Run `37681560073` (https://github.com/anisfut1/ball-manager-web/actions/runs/37681560073), commit `f830e38` : `Typecheck, lint, tests, build` ✅ (172 tests) et `Secrets (gitleaks, historique complet)` ✅. Le push qui consigne ce run déclenche un run docs seulement, non relevé.

## Q-020 à Q-023 : jeton en fragment et anti-framing (2026-10-07)
- Baseline avant : **172 tests** (24 fichiers). Après : **223 tests (26 fichiers)**, typecheck, lint propres, build OK avec drapeau off **et** on.
- Jeton (`4570207`) : `publicToken.test.ts` (caractérisation d'origine d'abord, verte avant tout changement ; puis fragment, priorité, nettoyage, StrictMode) et `publicTokenCalls.test.ts` (14 appels × {query par défaut, en-tête}, valeurs du drapeau). Deux attentes de caractérisation saisies à la main étaient fausses (`+` contre `%20` de `URLSearchParams`) : corrigées en relevant le résultat réel de l'ancien code.
- Anti-framing (`f2841a7`) : 14 tests dans `security-headers.test.ts` dont le `headers()` réel de `next.config.ts` ; vérifié par `next build` + `next start` + `curl -I` (`Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`).
- **Non testé** : comportement d'un vrai navigateur (`history.replaceState`, préflight CORS de l'en-tête), aucun environnement DOM dans le dépôt (Q-009 : jsdom pas encore ajouté) ; les fonctions sont donc testées avec un `window` factice.

## Q-009 : environnement DOM, et CI dédoublonnée (2026-10-07)
- Ajouts (devDependencies seulement) : `jsdom`, `@testing-library/react`, `@testing-library/dom`. `npm audit --omit=dev` : **0**. Environnement `node` par défaut ; `// @vitest-environment jsdom` **par fichier** (`publicToken.test.ts`, `PublicIdentityProvider.test.tsx`). `vitest.config.mts` inclut maintenant `*.test.tsx`.
- Tests : 223 → **227** (20 tests de `publicToken.test.ts` en vrai `window` : fragment, priorité sur la query, URL sans jeton, état et longueur d'historique conservés, ancre intacte, double lecture, reset, `replaceState` en échec, vrai `localStorage` ; +2 tests de double montage StrictMode du provider, dont jeton invalide). Équivalence avec l'ancien `window` factice démontrée par la couverture des mêmes cas ; **mutation** : suppression de l'appel `replaceState` → 7 tests échouent. `window` factice retiré.
- Durée de la suite (3 mesures chacune) : **≈ 0,69-0,73 s avant** → **≈ 0,89-0,91 s après** (+0,2 s, démarrage de jsdom par les 2 fichiers concernés).
- CI : cause des 2 runs = `on: push` + `on: pull_request` (`ci.yml:4-5`) avec la PR n°1 ouverte vers la branche de base ; `concurrency` (`ci.yml:13-15`) existait mais groupait par `github.ref`, différent entre `refs/heads/…` et `refs/pull/1/merge`. Correctif : `pull_request` supprimé ; gitleaks inchangé (`fetch-depth: 0`, `--all`, `ci.yml` job gitleaks) et **passé** sur le run `37685831364`. Perte assumée : la fusion avec la base n'est plus testée avant merge (testée par le `push` qui suit).
