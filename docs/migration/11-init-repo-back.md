# 11 — Initialisation du nouveau repository du back (préparation, **rien n'est exécuté**)
_2026-10-07. Le propriétaire crée le repository lui-même et en communiquera l'URL ; **l'agent ne crée ni dépôt, ni code back, ni service Railway**. Ce document est une checklist et un plan de livraison. Prérequis de décision : ADR-003 (Q-015), ADR-005 (Q-016), Q-017, Q-018._

## 0. Décisions à prendre avant de commencer
| ID | Décision | Pourquoi ça bloque |
|---|---|---|
| Nom du dépôt, visibilité (privé recommandé), organisation GitHub | propriétaire | `ops/`, domaines, secrets |
| Q-015 | Base : Supabase (a) / Railway (b) / hybride file seule (c) | connexion de l'API et de `pg-boss` |
| Q-016 | Routage S3 : (a) client / (b) passerelle (recommandé : (c) = (a) maintenant) | structure de `ops/contract/` et du front |
| Q-017 ✅ | Front sur **Vercel** (décision 2026-10-07) | CORS (origine = domaine Vercel du front + domaines de prévisualisation à décider), CSP |
| **Q-018** | **« Annuaire public authentifié » (consigne du propriétaire) : quelle authentification, exactement ?** Voir §7 | forme du contrat du LOT-02 |

## 1. Arborescence initiale (sous-ensemble minimal pour le LOT-02 ; reprise du §12 de `05`, adaptée à Railway)
```
<nouveau-repo>/
├── README.md · package.json · tsconfig.json · vitest.config.ts · eslint.config.mjs · .nvmrc (24) · .gitignore (.env*)
├── Dockerfile                          # multi-étapes, node:24-slim épinglé par digest, non-root ; commandes api | worker
├── .github/
│   ├── workflows/ci.yml                # voir §4
│   ├── dependabot.yml                  # npm + github-actions + docker, hebdomadaire
│   └── CODEOWNERS
├── ops/
│   ├── railway.md                      # réglages du tableau de bord (§3)
│   ├── runbook.md                      # déploiement, retour arrière, rotation des secrets, vérifications V1–V6
│   └── contract/ported-routes.json     # préfixes portés, consommé par les tests du front (ADR-005)
├── docs/                               # ADR du back + openapi.json exporté
├── src/
│   ├── server.ts · app.ts · worker.ts  # worker : coquille vide au LOT-02 (démarre pg-boss si Q-015 tranchée)
│   ├── config/env.ts                   # Zod ; seule lecture de process.env
│   ├── shared/{http,db,log,auth,time}/ # http : error-envelope, cors, rate-limit, request-id ; log : redaction sans query
│   └── modules/public-access/          # routes.ts · service.ts · repo.ts · schemas.ts · *.test.ts
└── test/{contract,security,integration}/
```
Les modules `matches`, `dashboard`, `results`, `licencies`, `venues`, `jobs` sont **ajoutés lot par lot** (ne pas créer de dossiers vides).

## 2. Checklist d'initialisation (à exécuter par le propriétaire, dans l'ordre)
**Dépôt GitHub**
- [ ] Créer le dépôt (privé), branche par défaut `main`, **protection de `main`** : PR obligatoire, vérifications requises (`verify`, `gitleaks`), pas de force-push.
- [ ] Créer la branche `release` (déploiement production, §3), protégée de la même façon.
- [ ] Activer **Secret scanning + Push protection**, alertes Dependabot, `CODEOWNERS`.
- [ ] Ajouter les secrets GitHub **seulement si nécessaire** (la CI n'en a pas besoin : build et tests utilisent des valeurs factices).
**Projet Node**
- [ ] `npm init`, `engines.node >= 24`, `"type": "module"`, scripts `dev | build | start | start:worker | typecheck | lint | test`.
- [ ] Dépendances (**versions à relever le jour J**, ne pas copier de ce document) : `hono`, `@hono/node-server`, `@hono/zod-openapi`, `zod`, `kysely`, `pg`, `pino` ; `pg-boss` **seulement** quand Q-015 est tranchée ; dev : `typescript`, `vitest`, `tsx`, `eslint`, `kysely-codegen`.
- [ ] `src/config/env.ts` (Zod, échoue au démarrage si variable manquante) ; `GET /health` (sans secret) et `GET /ready` (BDD) ; **enveloppe d'erreur** `{ "error": { "code", "message", "details"? } }` (`errors.ts:3-58` du front) ; **auth par défaut** sur toute route (liste blanche explicite des routes publiques) ; CORS en liste blanche ; **refus de `?token=`** (`400 TOKEN_IN_QUERY`).
- [ ] `Dockerfile` : build en 2 étapes, `USER node`, `HEALTHCHECK` sur `/health`, pas de `railway.json`.
- [ ] Test **« routes publiques = liste blanche »** et test **« aucun log ne contient la query string »** dès le premier commit.
**Premier commit** : squelette + CI verte, **avant** toute logique métier.

## 3. Checklist Railway (réglages du tableau de bord, voir ADR-007)
- [ ] Projet Railway, environnements `staging` et `production`.
- [ ] **Région co-localisée avec le projet Supabase** (noter les deux régions dans `ops/railway.md`).
- [ ] Services `api` et `worker` : constructeur **Dockerfile**, commande de démarrage (`node dist/server.js` / `node dist/worker.js`), healthcheck `GET /health` (au déploiement seulement).
- [ ] Liaison GitHub : `staging` ← `main` ; `production` ← `release` ; **« Wait for CI » activé** ; déploiement de PR désactivé.
- [ ] Variables **(noms seulement ; aucune valeur dans ce dépôt)** : `DATABASE_URL` (rôle dédié, pooler session), `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `ALLOWED_ORIGINS`, `PERSONAL_TOKEN_HMAC_SECRET`, `CLUB_MANAGER_API_URL`, `CLUB_MANAGER_API_SERVICE_TOKEN`, `EMAIL_API_KEY`, `LOG_LEVEL`, `PORT` (fourni par Railway). Un jeu distinct par environnement.
- [ ] Domaine : fourni par Railway pour `staging` ; domaine propre pour `production` (**TLS à vérifier**, V4).
- [ ] Supervision externe de `GET /ready` + alerte de battement du worker.
**Vérifications obligatoires (résultats à consigner dans `ops/runbook.md` et `10-risques.md`)**
| # | Vérification | Critère | Si échec |
|---|---|---|---|
| **V1** | **Query string dans les journaux Railway (R-014)** : en staging, appeler `GET /health?probe=SENTINELLE-NON-SECRETE`, puis chercher cette valeur dans Observability / HTTP logs et dans les logs applicatifs | valeur **absente** partout | Garantie **non établie** : le nouveau back refuse déjà `?token=` ; ne jamais router de trafic à jeton vers Railway |
| V2 | `pg-boss` derrière le pooler **session** de Supabase (démarrage, migration de schéma, cron, redémarrage) | tout passe | Repli ADR-003 option (c) |
| V3 | Latence aller-retour Railway→Supabase (50 requêtes simples, p50/p95) | consignée ; seuil décidé avec le propriétaire | Changer de région ou option (b) |
| V4 | Domaine propre + TLS automatique | HTTPS valide | Rester sur le domaine Railway |
| V5 | IPv6 sortant (connexion directe à Supabase) | informatif | Rester sur le pooler IPv4 |
| V6 | « Variables scellées » disponibles ? | informatif | Variables classiques + rotation |

## 4. CI du nouveau dépôt (vérifications seulement, **aucun déploiement automatique**)
Même base que `.github/workflows/ci.yml` du front (validé : run `37612678201`) :
- `verify` : `npm ci`, `typecheck`, `lint`, `test`, `build`, `npm audit --omit=dev --audit-level=high`.
- **`gitleaks`** : binaire épinglé avec somme de contrôle, `--log-opts="--all"`, `--redact=100`, `fetch-depth: 0`.
- **`docker`** : `docker build` de l'image (sans publication), puis `hadolint` sur le `Dockerfile` (optionnel).
- Déclencheurs : `push`, `pull_request` et un cron hebdomadaire (comme le front). C'est ce workflow que « Wait for CI » attend côté Railway.
- Actions épinglées par tag majeur au départ ; **épinglage par SHA** recommandé (chaîne d'approvisionnement), non fait dans le front.

## 5. Plan de livraison — **LOT-02 en premier** (R-013, révision obligatoire à la livraison)
Ordre strict, **tests d'abord** :
1. **Contrat** : figer l'OpenAPI de `GET /v1/public/clubs/{clubSlug}/licencies/search?q=` (`04` B.1, v2) ; écrire **d'abord** les tests de contrat listés au §7.5, qui doivent tous échouer avant le code.
2. **Accès aux données** : rôle Postgres **lecture seule** limité aux colonnes `id`, prénom, nom de la table des licenciés ; normalisation (minuscules, sans accents, séparateurs) ; correspondance par **préfixe de mot** ; `LIMIT 5` dans la requête ; aucune pagination exposée ; aucune colonne sensible lue (date de naissance, catégorie, e-mail).
3. **Anti-énumération** : budgets du §7.2 (par IP, par club, résultats vides) ; clé de limitation = HMAC de l'IP à sel journalier, **en mémoire seulement** (un seul réplica ; sinon table de compteurs) ; journaux sans `q`, sans nom, sans IP (§7.4).
4. **Staging** : déploiement, vérifications V1 à V3, test d'énumération du §7.5 exécuté contre l'instance, calibrage des budgets sur un jour d'usage réel, **revue sécurité** (matrice, tentative d'énumération, `Origin` non autorisé).
5. **Front (PR dans ball-manager-web, séparée)** : `resolveBase(path)` dans `src/lib/api/client.ts` + liste de modules actifs ; `IdentifyView.tsx` interroge le serveur avec anti-rebond (≈ 300 ms), supprime le chargement complet (`IdentifyView.tsx:66-87`) et le filtre local ; **tests de composant** avec jsdom + Testing Library (Q-009 accepté, devDependencies seulement) ; drapeau `FF_PUBLIC_SEARCH`, défaut = ancien comportement.
6. **Bascule** : activer le drapeau en staging puis en production ; **fermer l'ancien endpoint** `GET …/licencies` (`410`) — **changement à faire côté `ball-manager-back` par le propriétaire** (l'agent n'y a pas accès) ; sans cela **R-013 reste ouvert**.
7. **Clôture** : mesure avant/après du payload (`08`), mise à jour de `04`/`CHANGELOG`/`10` (R-013 → fermé, ou renouvelé explicitement), commit atomique.
**Critères de done** : un anonyme ne peut plus obtenir plus de 5 prénoms+initiales par requête ; le test d'énumération (§7.5) passe ; aucun nom ni IP dans les journaux ; CI verte ; V1 consignée ; **et, pour clore R-013 : ancien endpoint fermé (§7.6)**.
**Rollback** : drapeau `FF_PUBLIC_SEARCH` à l'ancien comportement (redéploiement du front en option (a)) ; l'ancien endpoint n'est fermé qu'**après** une période d'observation (≥ 7 jours, estimé).
**Jeton en en-tête (R-014)** : le LOT-02 est **anonyme** et ne manipule aucun jeton. Le transport du jeton personnel par en-tête (`04` B.9, ADR-006) concerne les routes qui suivent (`request-link`, accueil, tables, dérogations) : il est livré avec **LOT-14** ; en attendant, ces routes restent chez `ball-manager-back`.

## 6. Ce que le front devra préparer (hors LOT-02, rappel)
`resolveBase` testé (chaque préfixe porté a un test), `NEXT_PUBLIC_NEW_API_URL` + liste de modules (non secrets), CSP/`connect-src` vers le nouveau domaine (LOT-14), erreurs `429`/`400 QUERY_TOO_SHORT` gérées dans l'UI.

## 7. Spécification du LOT-02 — recherche anonyme bornée (Q-018 = option 1, décision du 2026-10-07)
_Les valeurs chiffrées sont des **propositions justifiées par un modèle simple** (hypothèses explicites, marquées « estimé »). Aucune n'a été mesurée sur le roster réel. **À valider au 🛑 (Q-020)** puis à calibrer en staging._

### 7.1 Règles de recherche et d'affichage
| Règle | Valeur proposée | Justification |
|---|---|---|
| Forme de la requête `q` | **≥ 2 mots (prénom + nom), chacun ≥ 2 lettres** ; ≤ 4 mots ; ≤ 64 caractères ; lettres, espace, `-`, `'` seulement | Un visiteur légitime connaît son nom complet ; exiger les deux mots multiplie l'espace à deviner (voir 7.1 bis). Le jeton « 2 caractères » de la v1 laissait énumérer par préfixes à un mot |
| Correspondance | **début de mot** (prénom OU nom, ordre libre), insensible casse/accents, `-` `'` = séparateurs ; jamais de `%`/`_` interprétés | Tolère « elodie dupont » = « Dupont Élodie » ; évite les motifs génériques |
| Nombre maximal de résultats | **5**, fixe (pas de paramètre `limit`) | Assez pour départager les homonymes ; plafonne ce qu'une requête peut révéler ; moins de paramètres = moins de surface |
| Format affiché | **prénom complet + initiale du nom** (`Camille D.`) | Reconnaissable par la personne, insuffisant pour identifier un tiers ; le nom complet n'est jamais renvoyé |
| Champs exposés | `id` (UUID), `firstName`, `lastInitial` — **rien d'autre** | Voir 7.3 |
| Homonymes | si deux lignes ont le même `firstName`+`lastInitial`, l'UI invite à **préciser le nom** (la requête peut contenir plus de lettres du nom) ; si l'ambiguïté persiste, repli « **contacte ton club** » (pas d'auto-service) | Pas de donnée supplémentaire pour désambiguïser (mineurs) |
| `claimed` | **retiré** | Indiquait les profils sans lien déjà posé, c'est-à-dire ceux qu'on peut revendiquer (R-018) |

**7.1 bis — pourquoi « 2 mots » (modèle, estimé).** Roster N ≈ 1 000 (estimé). Attaque par dictionnaire de D = 1 000 prénoms × 1 000 noms (≈ 10⁶ couples) : une requête touche avec une probabilité ≈ N / D² ≈ 0,1 %. Avec le budget club de **600 requêtes/h** : ≈ 0,6 découverte/h → **≈ 35 jours** pour 50 % du roster ; en supposant des noms 10 fois plus concentrés que le modèle (pessimiste), **≈ 3,5 jours**. À titre de comparaison, la règle « un mot de 3 lettres » (17 576 préfixes, 5 résultats chacun) se parcourt en **≈ 1,2 jour** au même budget et révèle l'essentiel du roster ; la v1 d'origine (annuaire complet) : **une requête**. _Hypothèses : noms indépendants, aucun contournement par rotation massive d'IP au-delà du budget club ; la répartition réelle des noms est inconnue._

### 7.2 Limites de débit (par défaut ; **estimées, à calibrer**)
| Budget | Valeur | Justification |
|---|---|---|
| Par IP | **30 requêtes/minute** et **300/heure** | Une recherche saisie avec anti-rebond de 300 ms = 3 à 6 requêtes ; ~30 bénévoles derrière la même box/Wi-Fi d'un gymnase (NAT) × ~8 recherches = ~240/h : doit passer |
| Par IP, **résultats vides** | **30/heure** | Un bénévole se trompe rarement plus de quelques fois ; une attaque par dictionnaire produit surtout des vides |
| Par club | **600/heure** et **3 000/jour** | Journée de match avec ~100 personnes qui s'identifient (estimé) ≈ 500/h ; alerte à 50 % du budget |
| `request-link` (existant, hors LOT-02, **recommandé**) | 5/heure par licencié, 20/heure par IP | Évite l'envoi massif d'e-mails et le harcèlement d'une personne |
Réponse au dépassement : `429 RATE_LIMITED` + `Retry-After` (secondes) + en-têtes `RateLimit-*`. **Contrepartie assumée (R-019)** : un attaquant peut épuiser le budget club et bloquer l'auto-identification pendant la fenêtre ; repli « contacte ton club », alerte à 50 %.

### 7.3 Mineurs et données personnelles
- **Aucune donnée supplémentaire** n'est exposée pour qui que ce soit, **le serveur ne distingue pas les mineurs** (pas de traitement spécial qui pourrait se tromper) : date de naissance, catégorie, équipe, photo, e-mail, numéro de licence ne figurent jamais dans la réponse.
- Identifiants opaques (UUID v4) ; aucun ordre ou compteur global ; pas de total ; `Cache-Control: no-store`.
- Base légale/information (RGPD) : à documenter par le club (traitement de données de mineurs) ; contrat de sous-traitance avec Railway : **action du propriétaire**.

### 7.4 Journaux et conservation
| Où | Contenu | Durée proposée |
|---|---|---|
| Journaux applicatifs du back | `requestId`, route (gabarit), statut, durée, `resultCount` (0 à 5), décision de limitation ; **jamais `q`, nom, e-mail ni IP** | **14 jours** (estimé : suffisant pour un incident récent, minimal) |
| Compteurs agrégés d'alerte (par club, par heure) | nombres uniquement | 90 jours |
| Clé de limitation | HMAC(IP, sel journalier), **en mémoire**, jamais écrite sur disque ni journalisée | durée de la fenêtre (≤ 1 jour) |
| Journaux HTTP de la plateforme (IP source, chemin) | **hors de notre contrôle** : Railway, rétention selon l'offre (3 j Free … 90 j Enterprise, docs consultées) ; la valeur de `q` est en query string → **non garantie absente** (V1, ADR-007 §7) | à vérifier ; **conséquence : `q` contient un nom, donc de la donnée personnelle**. Option si V1 échoue : transporter `q` dans un corps `POST /search` (non journalisé) — **décision à prendre après V1** |

### 7.5 Tests de contrat à écrire **en premier** dans le nouveau dépôt (tous rouges avant le code)
1. `q` d'un seul mot, ou mot d'une lettre → `400 QUERY_TOO_SHORT` ; caractères interdits / > 4 mots / > 64 car. → `400 INVALID_QUERY`.
2. Jamais plus de **5** résultats, même pour « ab cd » sur un roster de 1 000 homonymes synthétiques.
3. **Forme stricte** de la réponse : exactement `{ licencies: [{ id, firstName, lastInitial }] }` ; aucun champ supplémentaire (`additionalProperties: false`) ; **absence** de `lastName`, `claimed`, `birthDate`, `email`, `category` ; `lastInitial` = 1 lettre.
4. Aucun résultat → `200 []` (jamais 404) ; forme identique ; club inconnu → 404.
5. Normalisation : « Élodie » = « elodie » ; « Jean-Pierre » = « jean pierre » ; `%`, `_`, `\` et guillemets traités littéralement (pas d'injection ni de joker).
6. **Énumération impossible (test central)** : sur un roster synthétique de 1 000 personnes, simuler (a) un parcours exhaustif de tous les couples de préfixes de 2 lettres, (b) une attaque par dictionnaire, (c) une rotation de 50 IP ; vérifier qu'**après le budget d'une heure** (300 requêtes/IP ; 600/club) la fraction du roster révélée est **≤ 2 % (une IP)** et **≤ 5 % (club entier)**, et que la 301ᵉ requête d'une IP reçoit `429`. _Seuils indicatifs : à fixer par le propriétaire._
7. Limites : 31ᵉ requête/minute/IP → `429` + `Retry-After` ; 31ᵉ recherche vide/heure/IP → `429` ; budget club épuisé → `429` pour toutes les IP ; compteurs indépendants entre clubs ; requêtes concurrentes comptées exactement.
8. **Journalisation** : un espion sur le logger prouve que ni `q`, ni un nom, ni une IP ne sont écrits (cas 200, 400, 429).
9. CORS : `Origin` du front autorisé → en-têtes CORS ; autre origine → refusée ; pas de `Access-Control-Allow-Credentials`.
10. `?token=` sur la route → `400 TOKEN_IN_QUERY` ; `Authorization` ignoré (route publique).
11. Parité d'autorisation : la route est dans la **liste blanche des routes publiques** (test de sécurité global, ADR-006).
12. Anti-timing : écart de médiane entre « 0 résultat » et « 5 résultats » < 20 ms en test (indicatif).

### 7.6 Bascule du front (Q-016 = option (a)) et rollback
1. PR front séparée : `resolveBase(path)` dans `src/lib/api/client.ts` (unique point d'aiguillage), `NEXT_PUBLIC_NEW_API_URL` + `NEXT_PUBLIC_NEW_API_MODULES` (liste, ex. `public-search`) ; `IdentifyView.tsx` interroge le serveur (anti-rebond ≈ 300 ms, `q` valide seulement), **supprime** `listPublicLicencies` (`IdentifyView.tsx:66-76`, `publicTables.ts:51-54`) et le filtre local (`:79-87`) ; gestion de `400/429` dans l'UI ; tests de composant (jsdom + Testing Library, Q-009).
2. **Drapeau de module** `public-search` : défaut = **ancien comportement** ; activation en prévisualisation Vercel, puis production.
3. **Rollback** : **promouvoir le déploiement Vercel précédent** (retour immédiat à l'ancien build) ou retirer `public-search` de la liste et redéployer. Aucun état à restaurer (lecture seule).
4. Observation ≥ 7 jours (estimé) avant de fermer l'ancien endpoint.

### 7.7 Fermeture de l'ancien endpoint dans `ball-manager-back` — **action du propriétaire** (R-013)
- **À faire** : faire répondre `410 GONE` (ou `404`) à `GET /v1/public/clubs/{clubSlug}/licencies`, **y compris** avec des paramètres (`?limit=1000`, `?q=`), sans authentification et avec un `Origin` du front. `POST …/licencies/{id}/request-link` doit continuer de fonctionner.
- **Critère de done vérifiable (une requête d'essai qui DOIT échouer)** :
```bash
API="https://<url-ball-manager-back>"; SLUG="<slug-du-club>"
curl -s -o /tmp/old.json -w "%{http_code}\n" "$API/v1/public/clubs/$SLUG/licencies"                 # attendu : 410 (ou 404) — JAMAIS 200
curl -s -o /dev/null -w "%{http_code}\n" "$API/v1/public/clubs/$SLUG/licencies?limit=1000&q=a"      # attendu : 410 (ou 404)
curl -s -H "Origin: https://<domaine-du-front>" -o /dev/null -w "%{http_code}\n" "$API/v1/public/clubs/$SLUG/licencies"   # idem
jq -e '.licencies' /tmp/old.json >/dev/null 2>&1 && echo "ÉCHEC : l'annuaire répond encore" || echo "OK : plus de liste"
# non-régression : l'envoi du lien doit rester possible (avec un identifiant factice → 404 attendu, PAS 410) :
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' "$API/v1/public/clubs/$SLUG/licencies/00000000-0000-4000-8000-000000000000/request-link"
```
- **R-013 reste OUVERT après la livraison du LOT-02 tant que ces commandes n'ont pas donné le résultat attendu** ; l'acceptation du risque (D-3) **expire à la livraison du LOT-02** et doit être explicitement renouvelée si l'ancien endpoint n'est pas fermé à ce moment.

### 7.8 Point de sécurité préexistant révélé par cette spécification (R-018) — **traité dans le LOT-02, voir §7.9**
Le flux « lien perdu / première inscription » demande une adresse e-mail quand aucune n'est connue (`IdentifyView.tsx:106-111` : `EMAIL_REQUIRED` → champ e-mail → `requestPersonalLink({ email })`, `publicTables.ts:57-62`) et la **rattache à la fiche**. D'après le code du front, **n'importe quel visiteur qui connaît un nom (même partiel) peut revendiquer une fiche sans adresse et recevoir le lien personnel d'un autre licencié** — y compris un coach ou un administrateur du club (`isClubAdmin`, droits d'écriture FBI via les routes publiques). La recherche bornée réduit la découverte des noms, **pas** cette revendication. **Non vérifié côté `ball-manager-back`** (code non lu). Mesures à étudier (hors LOT-02) : première revendication soumise à validation par un admin du club, ou pré-chargement des adresses par le club, ou code de confirmation envoyé à l'adresse **déjà connue** uniquement.

### 7.9 R-018 intégré au LOT-02 — revendication de fiche soumise à validation (Q-022, décision du 2026-10-07)
_Règles décidées : (1) la revendication d'une fiche **sans adresse connue** est soumise à la validation d'un **admin du club**, **sans envoi automatique du lien** ; (2) **aucune fiche portant un rôle coach ou admin n'est revendicable** par le parcours public — généralisé le 2026-10-07 : **tout rôle disposant de droits d'écriture** est exclu (§7.9.2). Les valeurs chiffrées ci-dessous sont des **propositions** (marquées « estimé »). **Paramètres fixés le 2026-10-07 (Q-024)** : délai d'expiration 14 jours, validateur `club_admin` seul, règle générale des rôles à droits d'écriture (§7.9.2). Reste « estimé » : les limites de débit.

**7.9.1 Flux**
1. **Demande publique** : `POST …/licencies/{licencieId}/request-link` (existant, comportement modifié). Corps : `{ email?, returnTo }`. Le serveur décide seul :
   | Situation de la fiche (lue côté serveur) | Effet interne | Réponse |
   |---|---|---|
   | adresse connue, rôle quelconque | lien envoyé **uniquement à l'adresse connue** (`email` du corps ignoré) | `202` uniforme |
   | **pas d'adresse**, rôle ni coach ni admin | création d'une **demande de revendication** `pending` (adresse saisie conservée) ; **aucun lien généré, aucun e-mail au demandeur** | `202` uniforme |
   | pas d'adresse, rôle **coach ou admin** | **rien** (ni demande, ni e-mail) ; compteur interne d'alerte | `202` uniforme |
   | `licencieId` inconnu / d'un autre club | rien | `202` uniforme |
2. **Réponse publique uniforme** : `202 {"status":"RECEIVED"}` — même corps, mêmes en-têtes, même ordre de grandeur de délai (traitement différé en arrière-plan : la réponse part avant l'envoi éventuel) dans **les quatre cas**. Elle ne révèle ni l'existence de la fiche, ni la présence d'une adresse, ni le rôle. **`maskedEmail` disparaît** (il révélait l'existence d'une adresse) ; `EMAIL_REQUIRED` disparaît aussi (il révélait « pas d'adresse connue »).
3. **Message de repli (affiché par le front dans tous les cas)** : « Si ta fiche peut être activée, tu recevras un message. Sans nouvelle sous quelques jours, **contacte ton club**. » Le champ e-mail est **toujours proposé, facultatif** (« à renseigner si le club ne connaît pas ton adresse »).
4. **File de validation (admin)** : la demande apparaît dans l'espace admin (compteur + liste : nom complet de la fiche, adresse saisie, date, échéance). L'admin **approuve** (le lien personnel est généré et envoyé **à l'adresse saisie**, une seule fois) ou **rejette** (rien n'est envoyé, rien n'est notifié au demandeur).
5. **Notification des admins** : un e-mail **sans donnée personnelle** (« N demande(s) d'activation en attente », lien vers l'espace admin), au plus **1 par heure et par club** (estimé), puis rappel quotidien tant qu'il reste des demandes.
6. **Expiration** : une demande non traitée passe à `expired` après **14 jours (décidé, Q-024)** ; l'adresse saisie est alors **effacée**. Les demandes décidées perdent leur adresse après **30 jours** ; le journal de décision (qui, quand, quelle fiche) est conservé 12 mois (estimé). Un travail planifié (cron du worker) applique ces purges.
7. **Revérification à l'approbation** : le rôle de la fiche est relu **au moment de l'approbation** ; si la fiche est devenue coach/admin entre-temps → `422 ROLE_NOT_CLAIMABLE`, aucun e-mail.

**7.9.2 Qui valide et quels rôles sont exclus (décidé le 2026-10-07, Q-024)** : **`club_admin` seul** valide. Un coach ne valide pas : il détient déjà des droits d'écriture (tables, dérogations) et l'élargir à la création d'identités agrandit la surface. Alternative écartée : admin ou coach pour les fiches de sa propre équipe.
**Règle générale : tout rôle disposant de droits d'écriture est exclu du parcours public de revendication et passe par l'admin.** Aujourd'hui : `coach`, `club_admin` et `coordinateur` de dérogations (écritures FBI via les routes publiques, `publicTables.ts:131,140`). Le critère est **calculé côté serveur à partir des droits** (`isClubAdmin`, `derogationRequests.canCreate/canManage`, `tables.canManage`, cf. `PublicIdentityProvider.tsx:8-14`), **pas d'une liste de noms de rôles** : un futur rôle avec droits d'écriture est exclu par défaut (test dédié).

**7.9.3 Nouveaux endpoints** (détail : `04` B.1 bis)
| Endpoint | Droits |
|---|---|
| `POST /v1/public/clubs/{slug}/licencies/{id}/request-link` (modifié) | anonyme ; limites §7.9.5 |
| `GET /v1/clubs/{clubId}/claim-requests?status=pending` | JWT, `club_admin` du club |
| `POST /v1/clubs/{clubId}/claim-requests/{requestId}/approve` | JWT, `club_admin` ; **revalidation forte (introspection, ADR-006)** car génère un lien |
| `POST /v1/clubs/{clubId}/claim-requests/{requestId}/reject` | JWT, `club_admin` |

**7.9.4 Données (esquisse)** : `claim_requests(id, club_id, licencie_id, requested_email, status, created_at, expires_at, decided_by, decided_at)` ; au plus **3 demandes `pending` par fiche** ; le jeton n'est jamais stocké dans cette table ni renvoyé par ces endpoints.

**7.9.5 Limites de débit (estimées, à calibrer)** : `request-link` : 5/heure par fiche, 20/heure par IP, **10 demandes `pending` créées par heure et par club, plafond 50 en attente** (au-delà : `202` uniforme mais la demande est ignorée + alerte — protège la file contre le spam, cf. R-019).

**7.9.6 Tests de contrat à écrire en premier (tous rouges avant le code)**
1. **Aucun lien sans validation (test central)** : pour une fiche sans adresse (rôle ordinaire), `request-link` avec une adresse → `202` ; l'espion d'envoi d'e-mails n'a **reçu aucun message**, aucun jeton n'existe en base, une demande `pending` existe ; seule l'approbation par un admin déclenche **un** envoi, à l'adresse saisie.
2. **Fiche coach ou admin non revendicable (test central)** : pour une fiche coach, admin (, **coordinateur de dérogations** et tout rôle à droits d'écriture) **sans adresse** → `202` identique, **aucune demande créée, aucun e-mail**, y compris avec 50 tentatives et 50 IP.
3. **Réponse uniforme** : corps, statut et en-têtes **identiques** (hors `requestId`) pour : adresse connue, revendiquable, coach/admin, id inconnu, id d'un autre club ; écart de médiane de délai < 20 ms (indicatif).
4. Adresse connue : le lien part **à l'adresse connue**, jamais à celle du corps.
5. Approbation par : coach, simple membre, anonyme, admin d'un autre club → `403`/`401`/`404` ; aucun e-mail.
6. Revérification : fiche promue coach après la demande → `422 ROLE_NOT_CLAIMABLE`, aucun e-mail.
7. **Expiration à 14 jours** (horloge simulée) : à J+13 23:59 l'approbation réussit ; à J+14 00:00 → `409 EXPIRED`, aucun e-mail ; la purge passe la demande à `expired` et efface `requested_email` ; une demande expirée ne bloque pas le plafond de 3 `pending` par fiche.
7 bis. **Coordinateur de dérogations non revendicable** : fiche coordinateur sans adresse → `202` identique, aucune demande, aucun e-mail ; test **paramétré sur les droits** : un rôle de test portant n'importe quel droit d'écriture est exclu, un rôle sans droit d'écriture reste revendicable.
8. Rejeu : double `approve` → `409` ; un seul e-mail.
9. Aucune réponse de ces endpoints ne contient de jeton ; le lien envoyé n'est jamais journalisé.
10. Journaux : ni adresse, ni nom, ni IP (cas 202, 403, 422). E-mail de notification admin : aucune donnée personnelle.
11. Limites de la §7.9.5 (dont plafond de 3 `pending` par fiche et de 50 par club) ; `?token=` → `400 TOKEN_IN_QUERY`.
12. Parité d'autorisation : les 3 routes `/v1/clubs/…/claim-requests` exigent un JWT (test de la liste blanche, ADR-006).

**7.9.7 Procédure de vérification de R-018 sur l'existant** _(à lancer par le propriétaire, sur un **club de test**, avec des fiches **synthétiques** ; aucune donnée réelle ; ne jamais coller de sortie contenant un jeton)_
Préparation (dans l'application, club de test) : fiche **A** « Test Joueur » sans adresse, sans rôle ; fiche **B** « Test Coach » sans adresse, rôle coach ; fiche **C** « Test Admin » sans adresse, rôle admin. Une boîte e-mail de test que vous contrôlez (`vous+r018@…`).
```bash
API="https://<url-ball-manager-back>"; SLUG="<slug-du-club-de-TEST>"; MAIL="<votre-adresse-de-test>"
# 1) récupérer les identifiants des 3 fiches de test (ancien endpoint, club de test uniquement)
curl -sS "$API/v1/public/clubs/$SLUG/licencies" | jq -r '.licencies[]|select(.lastName|test("^Test"))|"\(.id) \(.firstName) \(.lastName) claimed=\(.claimed)"'
A="<id fiche A>"; B="<id fiche B>"; C="<id fiche C>"
# 2) pour CHAQUE fiche : sans adresse -> le serveur la réclame-t-il ? (attendu aujourd'hui : 400 EMAIL_REQUIRED)
for ID in $A $B $C; do
  curl -sS -o /tmp/r018.json -w "$ID sans e-mail -> HTTP %{http_code}\n" -X POST -H "Content-Type: application/json" \
    -d '{"returnTo":"home"}' "$API/v1/public/clubs/$SLUG/licencies/$ID/request-link"; jq -c '.error.code // .' /tmp/r018.json
done
# 3) avec VOTRE adresse de test : un lien part-il sans aucune validation ?
for ID in $A $B $C; do
  curl -sS -o /tmp/r018.json -w "$ID avec e-mail -> HTTP %{http_code}\n" -X POST -H "Content-Type: application/json" \
    -d "{\"email\":\"$MAIL\",\"returnTo\":\"home\"}" "$API/v1/public/clubs/$SLUG/licencies/$ID/request-link"; jq -c 'del(.maskedEmail)' /tmp/r018.json
done
# 4) ouvrez la boîte de test : combien de messages « lien personnel » sont arrivés (0 à 3) ?
```
**Lecture des résultats** : un message reçu pour **A** = revendication sans validation **confirmée** (R-018 réel) ; un message pour **B** ou **C** = **aggravation** (lien coach/admin obtenu par un tiers : priorité maximale, rotation du jeton de ces fiches) ; aucun message et un `4xx` = R-018 **non reproduit** sur ce chemin (le noter, ne pas conclure sur les autres chemins).
**Si un message est arrivé pour B ou C** : (a) ne pas cliquer sur le lien depuis un navigateur partagé ; (b) régénérer/révoquer le jeton de la fiche concernée dans l'application ; (c) supprimer l'adresse de test des fiches ; (d) me renvoyer **uniquement** : les codes HTTP des 6 appels, le nombre de messages reçus pour A, B, C. **Ne pas** me renvoyer le lien ni le jeton.
**Nettoyage** : retirer l'adresse de test des fiches A, B, C ; supprimer les fiches de test si elles ne servent plus ; vider la boîte de test.

