# Audit de sécurité du web — novembre 2026 (W0, mise à jour des dépendances)

Périmètre : `ball-manager-web` (Next.js sur Vercel), état de `main` après la fusion des lots « dépendances » (#19) et « lien personnel expiré » (#20). Audit des dépendances et de la CI, depuis le lot 1.

## Synthèse

| Sujet | État | Action |
| --- | --- | --- |
| `npm audit --omit=dev` (production) | **0 vulnérabilité** | Aucune |
| `npm audit` complet | 20 avis modérés, tous **développement** | `vitest` : correctif simple (voir ci-dessous). Le reste : attendre la chaîne ESLint |
| Alertes GitHub | **Dependabot désactivé sur ce dépôt** (réponse 403) | **À activer** (droits admin) : voir « Alertes » |
| Mises à jour automatiques | Aucun `dependabot.yml` | W1 |
| CI | Présente, plusieurs écarts avec le back | W1 |

## Dépendances

### Avis de développement (20, modérés, aucun en production)

- **`vitest` / `@vitest/mocker`** (5.0.0-beta.1 à 5.0.2) : exécution de code via l'enregistrement de mocks manuels sans authentification. Outil de test seulement. **Correctif sans changement majeur : `vitest` 5.1.0.**
- **`minimatch` < 11.0.1** (déni de service par amplification de motifs) : tiré par `eslint`, `typescript-eslint`, `eslint-plugin-*`, `@redocly/openapi-core` (via `openapi-typescript`). Outils de build et de lint, jamais livrés. Les « correctifs » proposés par `npm audit fix --force` sont des **rétrogradations majeures** (`eslint@4`, `eslint-config-next@0.2.4`, `openapi-typescript@6`) : à ne pas appliquer. Décision en attente (feuille de route) : attendre une version d'ESLint qui corrige l'avis, ou forcer la version par un `overrides`.

### Versions en retard (`npm outdated`)

| Paquet | Actuelle | Disponible | Lecture |
| --- | --- | --- | --- |
| `next` | 16.4.4 (épinglée) | 16.4.5 | Correctif ; à passer par Dependabot avec la CI verte |
| `eslint-config-next` | 16.4.4 | 16.4.5 | Avec `next` |
| `@supabase/supabase-js` | 2.116.0 | 2.118.0 | Mineure |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.3 | 4.3.4 | Correctif |
| `lucide-react` | 1.48.0 | 1.67.0 | Mineure |
| `vitest` | 5.0.1 | 5.1.0 | **Corrige l'avis ci-dessus** |
| `@types/node` | 22.20.4 | 22.20.5 (26.6.6 existe) | Rester sur 22 tant que Vercel n'est pas passé à une autre version de Node |
| `react`, `react-dom` | 19.2.8 (épinglées) | 19.3.1 | Mineure à tester avec Next |
| `typescript` | 5.9.3 | 7.0.2 | À ne pas monter : refusé sur le back (`typescript-eslint` 8 ne l'accepte pas) ; la même chaîne de lint est utilisée ici, **non vérifié** sur le web |
| `eslint` | 9.39.5 | 10.14.0 | À étudier avec `eslint-config-next` (peut bloquer) |
| `jsdom` | 29.1.1 | 30.1.3 | Majeure, outil de test |

`next` et `react` sont épinglés en version exacte : Dependabot les proposera une par une.

## Alertes GitHub — non vérifiables

- **Dependabot alerts : désactivé** sur `anisfut1/ball-manager-web` (l'API répond « Dependabot alerts are disabled »). Aucune alerte ne peut donc remonter sur ce dépôt. À noter : `next` 16.4.0 (2 RCE) est resté sur `main` après le lot 1 jusqu'à la PR #19 ; avec les alertes actives, cet écart aurait été signalé (non démontré). **À activer** : Settings → Code security → Dependabot alerts (et security updates).
- Code scanning : non accessible depuis cette session. Secret scanning : non accessible depuis cette session. **Non vérifiés.**

## CI existante — écarts à traiter en W1

La CI (`.github/workflows/ci.yml`) fait déjà typecheck, lint, tests, build, audit de production (seuil `high`) et gitleaks, avec un run hebdomadaire. Écarts avec la CI du back :

1. Actions référencées par **tag** (`actions/checkout@v7`, `actions/setup-node@v7`), pas par SHA.
2. `persist-credentials: false` absent du checkout.
3. `npm ci` sans `--ignore-scripts`.
4. gitleaks : la somme de contrôle est **téléchargée avec l'archive**, depuis la même release (le back épingle le SHA-256 dans le workflow).
5. Pas de `.github/dependabot.yml`.
6. Pas de champ `engines` dans `package.json` : la version de Node n'est fixée que dans la CI (Node 24). Version réellement utilisée par le projet Vercel : **non vérifiée**.

## Non vérifié

- Version de Node du projet Vercel du web.
- Alertes Dependabot, code scanning et secret scanning (voir ci-dessus).
- Contrôles obligatoires sur `main` (Settings → Branches).
