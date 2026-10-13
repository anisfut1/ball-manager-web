# ADR-005 — Coexistence puis remplacement progressif de `ball-manager-back` (S3)
- **Date** : 2026-10-07 (révisé le même jour)
- **Statut** : **Acceptée pour S3** (décision Q-011) — **le mécanisme de routage reste à trancher (Q-016)**.
- **Révision** : la version de Phase 3 supposait un reverse proxy commun (sur un VPS, d'après une réponse erronée de Q-007) ; le nouveau back est sur **Railway** (Q-012) et le front sur **Vercel** (Q-017) : ce proxy n'existe pas.

## Contexte
- `ball-manager-back` (Vercel) porte les 92 opérations consommées, FFBB, FBI (navigateur headless), e-Marque, les crons et les migrations ; son code n'a **pas** été lu (`04` §A, `05` §13).
- Le front (`src/lib/api/`) appelle **une seule base d'URL** : `NEXT_PUBLIC_CLUB_MANAGER_API_URL` (`config.ts:8`, `env.public.ts:24`), via un client central `apiFetch` (`client.ts:45-83`) enveloppé par `server.ts` (Server Components) et `browserClient.ts` (Client Components). Les routes publiques à jeton appellent `apiFetch` **directement** (`publicTables.ts:11-14`).
- Le nouveau back (Railway, ADR-007) livre d'abord les endpoints **nouveaux** : LOT-02 (recherche publique), puis 03, 05, 07, 08, 09, 10.
- **Contrainte R-014** : tout trafic portant `?token=` transiterait par l'infrastructure qui le route ; Railway ne documente ni ne permet d'exclure la journalisation des query strings (ADR-007 §7).
- **Chemin réel du trafic à jeton personnel (Q-017, front sur Vercel)** — établi par lecture du code :
  1. *Lien reçu par e-mail* : `https://<front Vercel>/public/{slug}/…?token=…` → **requête de page vers le projet Vercel du front** (toutes les pages `/public/*` sont dynamiques, `npm run build` : `ƒ`). Le jeton n'est lu que **dans le navigateur** (`PublicIdentityProvider.tsx:22-24` via `window.location`), puis retiré de la barre d'adresse (`:30-36`, `stripTokenFromUrl`) **après** la résolution d'identité — donc après que le serveur l'a reçu.
  2. *Appels API ensuite* : `getPublicMe`, `listPublicTableAssignments`, etc. sont appelés depuis des **Client Components** (`PublicIdentityProvider.tsx:79-84`) via `apiFetch` : **navigateur → `ball-manager-back` directement** (autre projet Vercel), jeton en `?token=` (`publicTables.ts:72-131`). Le serveur Next du front **n'est pas un relais** (aucun Route Handler : `src/app/api` n'existe pas) et ne voit jamais le jeton des appels API.
  3. *Stockage* : `localStorage` (`publicToken.ts:19-28`) et un cookie « reconnu » qui ne contient **pas** le jeton (`PublicIdentityProvider.tsx:46`).
  → Le jeton passe donc par **deux projets Vercel** (front : à l'ouverture du lien ; `ball-manager-back` : à chaque appel). **Les journaux d'exécution Vercel enregistrent les « Search Params » de la requête** (source : *vercel.com/docs/logs/runtime*, « Log details », consultée le 2026-10-07 ; rétention : 1 h Hobby, 1 jour Pro, 30 jours avec Observability Plus, 3 jours Enterprise). **R-014 est donc déjà réel côté Vercel**, indépendamment de Railway.
- Le jeton Supabase (Bearer) est le même pour les deux back (même émetteur) ; CORS : le navigateur appelle déjà `ball-manager-back` en cross-origin.

## Options de routage (sans reverse proxy commun)
### (a) Routage par module dans le client front
Le client résout, pour chaque requête, la base d'URL **selon le chemin** : une table `préfixe → base` (ex. `/v1/public/clubs/*/licencies/search` → nouveau back ; le reste → `ball-manager-back`), pilotée par **un drapeau par module**. Implémentation : un `resolveBase(path)` dans `src/lib/api/client.ts` (un seul point, comme `apiFetch` aujourd'hui) ; configuration par `NEXT_PUBLIC_NEW_API_URL` + liste de modules actifs.
- (+) **Le nouveau back n'est jamais sur le chemin critique des modules non portés** ; aucune latence ni panne ajoutée au trafic hérité ; rollback = retirer le module de la liste.
- (+) **Compatible R-014** : le trafic `?token=` hérité va directement à Vercel, sans passer par Railway.
- (+) Aucun composant réseau supplémentaire à exploiter ; chaque back garde son périmètre de sécurité.
- (−) La table de routage vit **dans le front** (code + déploiement du front pour la changer) ; les variables `NEXT_PUBLIC_*` sont **inlinées au build**. **Sur Vercel, le rollback d'un drapeau de routage se fait par la promotion du déploiement précédent** (retour immédiat à l'ancien build, avec ses anciennes valeurs inlinées) **ou** par modification de la variable puis redéploiement. Les appels faits côté serveur peuvent lire un drapeau serveur sans reconstruire.
- (−) **CORS** à configurer sur le nouveau back ; **deux URLs publiques** de back exposées au navigateur ; le jeton Bearer est envoyé aux deux (même émetteur).
- (−) Risque de **dérive** : un module routé vers le nouveau back mais non à parité côté données.
### (b) Le nouveau back proxifie `ball-manager-back` pour les routes non portées (passerelle)
Le front n'appelle que le nouveau back ; celui-ci traite les routes portées et **transmet le reste** à `ball-manager-back` avec l'en-tête `Authorization` inchangé.
- (+) **Une seule base d'URL** et une seule configuration CORS ; **le front ne change quasiment pas** ; rollback par module = variable du **proxy** (runtime, sans redéployer le front) ; trajectoire S3 naturelle (le hérité « rétrécit » derrière la passerelle) ; point central pour limitation de débit/journalisation.
- (−) **Le nouveau back devient critique pour 100 % du trafic dès le premier jour** : une panne Railway = panne totale (aujourd'hui seule une panne Vercel l'est) ; +1 saut réseau Railway→Vercel sur tout le trafic hérité (latence non mesurée).
- (−) **R-014 aggravé** : tout le trafic `?token=` (14+ appels, `04` E-4) **traverserait Railway**, dont la journalisation des query strings n'est pas garantie (ADR-007 §7). Ne devient acceptable qu'**après** la bascule du jeton vers un en-tête (LOT-14/B.9) **et** son déploiement sur tous les appels du front.
- (−) Les opérations longues (jusqu'à 280 s, `integrations.ts:64-138`) tiendraient des connexions à travers la passerelle (limite plateforme : 5 min d'inactivité) avant LOT-10.
- (−) Le nouveau back doit propager fidèlement en-têtes, codes, corps et erreurs (enveloppe `{error:{…}}`) : surface de bugs.
### (c) Hybride (recommandation) : **(a) puis (b) quand les conditions sont réunies**
Démarrer en (a) ; migrer vers (b) **uniquement** lorsque : (1) le jeton personnel est passé en en-tête sur tous les appels (R-014 clos), (2) LOT-10 a retiré les requêtes longues, (3) la majorité du trafic (estimé > 50 %) est déjà servie par le nouveau back, (4) disponibilité du nouveau back mesurée ≥ celle de l'existant sur 30 jours.

## Décision proposée (Q-016 : à trancher par le propriétaire)
**Option (c) : (a) maintenant (acceptée).** Motifs : R-014 interdit de faire transiter le trafic à jeton par Railway ; le nouveau back ne doit pas être un point de défaillance global avant d'avoir fait ses preuves ; la livraison du LOT-02 (en tête, R-013) n'exige qu'un seul préfixe routé.
Garde-fous : (1) **une seule fonction `resolveBase(path)`** — aucun `fetch` ailleurs ; (2) table de routage **testée** (chaque préfixe routé a un test de contrat) ; (3) drapeaux **par module**, défaut = hérité ; (4) pas de routage par expression générique : liste explicite de préfixes ; (5) le jeton personnel n'est **jamais** envoyé au nouveau back en query string (`400 TOKEN_IN_QUERY`).

## Trajectoire de remplacement module par module
**Critère de bascule commun (tout module)** : (i) tests de contrat du module verts (fixtures dérivées de `04`) ; (ii) **double exécution** ancien/nouveau en staging puis en production (en lecture) avec **0 écart** sur ≥ 7 jours (durée **estimée**) ; (iii) p95 de latence ≤ celui de l'existant (à mesurer, non mesuré aujourd'hui) ; (iv) taux d'erreur ≤ existant ; (v) revue sécurité du module (matrice rôle × route, anti-énumération). **Rollback commun** : retirer le module de la liste de routage (+ redéploiement du front en (a)) ; **aucune donnée à restaurer** tant que le module ne fait que lire ou n'écrit que dans les tables du nouveau back.
| Ordre | Module (lot) | Nature | Particularité de bascule / rollback |
|---|---|---|---|
| 1 | `public-access` — recherche licenciés (LOT-02) | lecture publique | Ancien endpoint `GET …/licencies` fermé **après** bascule du front (`410`) ; rollback = remettre le préfixe hérité ; **expire R-013** |
| 2 | `matches` — `season`, `weekendKey`, `/weekends` (LOT-05/06) | lecture | Double exécution contre `applyMatchFilters` (oracle existant) |
| 3 | `dashboard` (LOT-07), 4 `results` (LOT-08) | lecture agrégée | Double exécution des compteurs ; **règle de victoire corrigée** : écart attendu et documenté (`04` B.5) |
| 5 | `licencies` — import texte (LOT-09) | **écriture** (tables héritées) | Bascule **en deux temps** : lecture/aperçu d'abord, écriture ensuite ; tant que le propriétaire des tables est l'existant, le nouveau back **appelle** l'endpoint hérité (adaptateur) — rollback = flag |
| 6 | `jobs` — opérations longues (LOT-10) | orchestration | Adaptateur serveur-à-serveur vers l'existant ; sous-lots par endpoint ; ancien chemin synchrone conservé (`Prefer: respond-async`) |
| 7+ | `venues`, `tables`, `derogations`, `clubs`, `platform` | lecture puis écriture | Pas avant que la propriété du schéma soit tranchée (Q-015) |
| dernier | `integrations` (FFBB, FBI, e-Marque) | pipelines | **Jamais en premier** ; ADR dédié après lecture du code existant |
**Fin de trajectoire** : quand tous les modules sont portés et la propriété des migrations transférée, `ball-manager-back` est arrêté (décision explicite, hors de ce plan).

## Conséquences
- (+) Livraison incrémentale, R-013 refermé vite, le front garde un seul client réseau, sécurité du jeton préservée.
- (−) Pendant S3, **deux autorisations** à garder identiques (mêmes tables de membership, test de parité) ; **dérive de schéma** si les deux écrivent (règle : le nouveau back n'écrit que dans ses tables, ADR-003) ; deux jeux d'URLs/CORS jusqu'au passage éventuel en (b).
- (−) En (a), un rollback par drapeau `NEXT_PUBLIC_*` passe par la promotion du déploiement Vercel précédent ou un redéploiement ; documenté dans le runbook du LOT-02 (`11` §7).
- **À surveiller** : disponibilité et latence du nouveau back (non mesurées), dérive de contrat (le schéma commité est déjà inexact, `04` E-1), CORS : l'origine autorisée est le domaine du front Vercel (production) ; les domaines de prévisualisation Vercel (`*.vercel.app`) sont à traiter au cas par cas (à décider, jamais de joker global).
