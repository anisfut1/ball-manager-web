# 02 — Inventaire des traitements front candidats
_Phase 2, 2026-10-07. Périmètre : `src/` + `worker/` (hors `spikes/`, `.vscode/`). Toute cible qui dépend de `ball-manager-back` est **« à confirmer après accès au back »** (Q-001 ouverte) : les endpoints cités sont des propositions, pas des faits._
_Mesures : aucune mesure runtime n'a été prise (pas de back, pas de profil navigateur) ; les volumes sont des **estimations** signalées comme telles. Les mesures vont dans `08-metriques.md` avant chaque lot._

## Synthèse
| ID | Traitement | Catégorie | Prio | Cplx | Risque | Cible | Dépend du back |
|----|-----------|-----------|------|------|--------|-------|----------------|
| TRT-001 | Roster public complet envoyé au navigateur, recherche locale | Données sensibles | **P1** | M | moyen | recherche serveur `?q=` | oui |
| TRT-002 | `getUser()` réseau à chaque appel API et chaque navigation (jusqu'à 9) | Calcul/Sécurité (perf) | **P1** | S | moyen | rester côté Next : token mémoïsé + `getClaims()` | non |
| TRT-003 | Gymnases du club pilote codés en dur dans l'agenda | Logique métier | **P1** | M | moyen | venues du club (API existante) | à confirmer |
| TRT-004 | Opérations de 1 à 5 min pilotées en synchrone depuis le navigateur | Tâches longues | **P1** | L | élevé | 202 + `jobId` + suivi | oui |
| TRT-005 | Tableau de bord : agrégats recalculés depuis toute la saison (9 appels) | Agrégation / cascade | **P1** | M | moyen | endpoint BFF `dashboard` | oui |
| TRT-006 | Liste des matchs : saison entière, filtrée/triée/regroupée côté Next | Pagination/filtre | P2 | M | moyen | filtres serveur **déjà disponibles** (`04` E-3) : bascule front | non (sémantique `period=weekend` à confirmer) |
| TRT-007 | Borne de saison calculée côté front, fuseau du runtime | Logique métier | P2 | S | faible | `season=current` côté API | oui |
| TRT-008 | Règle « journée = week-end » + `Europe/Paris` en dur (≠ `club.timezone`) | Logique métier | P2 | M | moyen | `weekend=` / regroupement serveur | oui |
| TRT-009 | Résultats : groupage par équipe, bilan V/D/N, jointure classements | Transformation | P2 | M | moyen | endpoint `results` | oui |
| TRT-010 | Import licenciés : parsing TSV/CSV + règles de mapping dans le navigateur | Calcul CPU / règles | P2 | M | moyen | `POST …/import` accepte le texte brut | oui |
| TRT-011 | Réglages du club : écriture directe Supabase, sans validation du fuseau | Sécurité/Validation | P2 | S | moyen | `PATCH /v1/clubs/{id}` **existe déjà** (`04` E-2) : bascule front | non (validation du fuseau à confirmer) |
| TRT-012 | Conversion fuseau/DST codée 3 fois (+ 1 côté back) | Duplication | P3 | S | faible | un seul module / champs prêts à afficher | partiel |
| TRT-013 | Comptages/filtres sur petites listes admin | Transformation légère | P3 | S | faible | champs `summary` / `?status=` | oui |
| TRT-014 | Résumé de journée Tables (`computeDaySummary`) | Logique métier | P3 | S | faible | `summary` dans la réponse | oui |
| TRT-015 | Liste complète des licenciés + recherche locale | Pagination/recherche | P3 | S | faible | `?q=&limit=` | oui |

## Détail
### TRT-001 — Roster public complet côté navigateur  · P1
- **Localisation** : `src/features/public/IdentifyView.tsx:66-76` (chargement), `:79-87` (filtre local), `:22-23` (`SEARCH_MIN_CHARS=2`, `SEARCH_MAX_RESULTS=8` appliqués **côté client**) ; `src/lib/api/publicTables.ts:51-54` ; consommé par `PublicLoginApp.tsx`, `PublicLinkBanner.tsx`.
- **Données** : `GET /v1/public/clubs/:slug/licencies`, **sans authentification** ; chaque entrée = `id`, `firstName`, `lastName`, `claimed` (`generated/schema.ts:7702-7708`). Volume estimé : un roster entier de club (centaines à ~1 000 personnes, dont des mineurs).
- **Problème** : tout visiteur anonyme peut télécharger la liste nominative complète d'un club et savoir qui a déjà activé son lien (`claimed`). Les garde-fous « min 2 caractères / 8 résultats » ne sont que de l'UX : ils ne protègent rien (règle « Données sensibles : ne pas envoyer plutôt que filtrer »). L'endpoint est un annuaire énumérable.
- **Cible (à confirmer)** : `GET /v1/public/clubs/:slug/licencies?q=<≥2 car.>&limit=8` ; réponse limitée aux correspondances ; rate-limit par IP ; `claimed` retiré ou conservé seulement pour la confirmation. Le front garde l'input + l'affichage.
- **Gain** : réduction nette de l'exposition de données personnelles ; payload divisé (liste → ≤8 lignes). **Cplx** M (changement de contrat public ; compatibilité des anciens liens). **Risque** moyen (parcours d'identification critique pour les bénévoles). **Test de caractérisation** : parcours « taper un nom → choisir → demande de lien » (aucun test composant aujourd'hui).

### TRT-002 — Appels `getUser()` en rafale  · P1 (front seul)
- **Localisation** : `src/proxy.ts:39` (1× par requête) ; `src/lib/auth/session.ts:19` via `requireUser()` (`club-context.ts:25`, `platform.ts:35`, `app/page.tsx:23`) ; **`src/lib/api/auth.server.ts:16` : `getUser()` + `getSession()` à CHAQUE appel `api.*`** (`server.ts:25`).
- **Mesure par lecture du code** (navigation `/c/x/dashboard`, club_admin, module dérogations actif) : proxy 1 + `requireUser` 1 + `api.clubs.list` 1 + `api.me` 1 + `matches`, `issues`, `derogations`, `derogationRequests.context`, `.list` = 5 → **9 allers-retours** vers Supabase Auth pour une seule page. Chacun est un appel réseau (`getUser()` interroge le serveur Auth). Les `Promise.all` les parallélisent mais ne les suppriment pas ; `cache()` n'est appliqué qu'à `getUserClubs` et `getShellIdentity` (`club-context.ts:24`, `session.ts:13`), pas au jeton.
- **Fréquence** : chaque navigation et chaque Server Action. **Estimation** : 9 × ~30-100 ms de latence Auth cumulée (non mesuré — à mesurer en `08-metriques.md`).
- **Alternatives et impact sécurité** :
  1. **Mémoïser le jeton par requête** (`cache()` autour de `getServerAccessToken`) : 9 → ~3. **Sans changement de garantie** (même `getUser()` une fois par requête). Recommandé en premier.
  2. **`getClaims()`** (supabase-js 2.116, présent) : vérification locale de la signature JWT via JWKS **si le projet utilise des clés de signature asymétriques** ; sinon retombe sur un appel réseau. Gain : proxy + `requireUser` quasi gratuits. Compromis : un utilisateur révoqué/banni reste valable jusqu'à expiration du JWT (≤ durée de vie du token) ; acceptable car `ball-manager-back` revalide le JWT à chaque requête et fait foi sur les droits (`ARCHITECTURE.md` §1). **À confirmer** : type de clés JWT du projet Supabase (Q-008).
  3. Supprimer `getSession()` redondant : `getClaims()`/`getSession()` après `getUser()` relit le cookie, pas de coût réseau — pas de gain.
- **Cible** : reste dans le front (hors périmètre « migration vers le back », mais gros gain). **Cplx** S. **Risque** moyen (auth). **Test** : tests unitaires de `auth.server` avec mock Supabase ; test de non-régression du 401 → `/login` (`server.test.ts` existe).

### TRT-003 — Gymnases du club pilote en dur  · P1
- **Localisation** : `src/features/matches/HomeMatchesAgenda.tsx:30-33` (`HOME_VENUES` : `CLAVEL`, `LIDO`), `:43-48` (`resolveVenueColumnKey`), `:103-109` (colonnes). Le commentaire `:4-26` cite « SC Sète Basket » et des comptes de matchs réels.
- **Problème** : règle métier propre à **un** tenant dans un produit multi-clubs (`ARCHITECTURE.md` en-tête : « tenant pilote, pas une hypothèse câblée »). Pour tout autre club, **tous** les matchs à domicile tombent dans « Autre salle ». Usage : `MatchesView` (vue club **et** vue publique).
- **Cible (à confirmer)** : colonnes dérivées des gymnases du club (`GET /v1/clubs/:clubId/venues`, existant : `src/lib/api/members.ts:9`) et du `venueId`/`venueLabel` du match (`schema.ts:7355,7381`). Il faut vérifier côté back si un match porte un `venueId` ; sinon ajouter le rapprochement venue↔match (`venuesLikelyMatch` existe déjà côté back d'après le commentaire `:22-24`).
- **Gain** : correction fonctionnelle multi-tenant, suppression de ~30 lignes. **Cplx** M. **Risque** moyen (rendu différent pour Sète si le rapprochement diffère) → test de caractérisation sur `resolveVenueColumnKey` avec les libellés réels.

### TRT-004 — Opérations longues pilotées en synchrone depuis le navigateur  · P1
- **Localisation** : `src/lib/api/client.ts:8-19,31` (timeout 20 s par défaut) ; timeouts allongés : `integrations.ts:64` (280 s, sync FFBB), `:82` (process-jobs), `:98` (parse-documents), `:138` (check-all-derogations, « ~4-5 min »), `derogations.ts:44`, `matches.ts:107,127`, `publicTables.ts:134,143` (120 s), `licencies.ts:52,65` (60 s) ; déclencheurs UI : `features/admin/ProcessFbiJobsButton.tsx`, `TriggerFfbbSyncButton.tsx`.
- **Problème** : une requête HTTP maintenue ouverte 1 à 5 min depuis un onglet. Incident de production déjà constaté (`client.ts:13-17`, 2026-09-24 : « Traitement impossible » alors que le job réussissait) et `matches.ts` / `derogations.ts` (2026-09-28). Fermer l'onglet ou perdre le réseau = résultat perdu. Les boutons font office de **cron manuel** (traitement par lots piloté par un humain).
- **Cible (à confirmer)** : le back expose déjà le motif `202 + jobId` + `GET /v1/jobs/:jobId` (`src/lib/api/jobs.ts:7,25-44`, utilisé pour le test de connexion) → généraliser à ces endpoints ; planifier côté cron ce qui est aujourd'hui lancé à la main.
- **Gain** : robustesse, plus de 504 opaques, front sans logique de timeout. **Cplx** L (plusieurs endpoints). **Risque** élevé (comportements back, pas de test d'intégration). **Dépend** entièrement de Q-001.

### TRT-005 — Tableau de bord : agrégats côté Next  · P1
- **Localisation** : `src/app/c/[clubSlug]/dashboard/page.tsx:61-73` (jusqu'à 5 `api.*` + `getShellIdentity`), `:75-102` (filtres/tris/`results`, `upcoming`, `weekend`), `:133-193` (compteurs, **victoires** `:184-188`) ; `features/derogation-requests/DashboardRequestsCard.tsx:13` (comptage par statut sur `list(limit: 200)`, `dashboard/page.tsx:70`).
- **Données** : toute la saison de matchs (estimation : ~15 équipes × ~25 matchs ≈ 300-500 `MatchListItemDto`) + 200 demandes pour afficher ~6 nombres et 6 cartes. Rendu à chaque ouverture de l'accueil.
- **Problème** : sur-fetching ; **incohérence de règle** : `dashboard/page.tsx:184-188` calcule une victoire avec `m.isHome ? … : …` sans garde `isHome === null`, alors que `match-display.tsx:93-100` (`matchOutcome`) renvoie `null` dans ce cas → deux définitions de « victoire ».
- **Cible (à confirmer)** : `GET /v1/clubs/:clubId/dashboard` (BFF) renvoyant compteurs (weekend, à venir, joués, victoires), 6 derniers résultats, anomalies ouvertes, dérogations à répondre, résumé des demandes ; autorisation par rôle côté back. Garde les composants.
- **Gain** : 9 appels → 1-2 (cumulé avec TRT-002), payload ÷ ~50 (estimation). **Cplx** M. **Risque** moyen.

### TRT-006 — Liste des matchs : filtrage/tri/regroupement local  · P2
- **Localisation** : `src/app/c/[clubSlug]/matchs/page.tsx:35` et `public/[clubSlug]/matchs/page.tsx:37` (saison entière) ; `features/matches/match-filters.ts:77-99` (`applyMatchFilters`), `:116-132` (`groupMatchesByWeekend`), `:145-156` (`weekendOptions` : recalcule le filtre sur toute la saison **pour chaque rendu**) ; `MatchesView.tsx:30-37`.
- **Fréquence** : chaque changement de filtre (navigation serveur, car l'état est dans l'URL) → **re-téléchargement de la saison complète à chaque clic**, puis filtrage en mémoire côté serveur Next.
- **Mise à jour Phase 3 (2026-10-07)** : `GET …/matches` supporte **déjà** `period`, `teamId`, `homeAway`, `status`, `limit`, `offset` (`schema.ts:569-580`) ; le front n'envoie que `from`/`to` (`matches.ts:56-75`) et boucle sur des pages de 200. **Cible** : utiliser ces filtres (bascule front) ; seul `GET …/matches/weekends` (compteurs par journée) est nouveau (`04` B.3). **Cplx** M. **Risque** moyen. **Test** : `match-filters.test.ts` existe (caractérisation acquise).

### TRT-007 — Borne de saison  · P2
- **Localisation** : `src/lib/season.ts:6-8` (1ᵉʳ août via `getMonth()`/`new Date(y,7,1)` = **fuseau du runtime**, UTC sur Vercel) ; 6 usages : `dashboard/page.tsx:63`, `matchs/page.tsx:35`, `resultats/page.tsx:30`, `admin/sync/page.tsx:41`, `public/…/matchs/page.tsx:37`, `public/…/resultats/page.tsx:27`.
- **Problème** : règle de gestion (« la saison commence le 1ᵉʳ août ») dupliquée côté front ; le 31 juillet 23:xx Paris peut basculer selon le fuseau → bornes ±1-2 h. Un seul endroit à changer si la règle évolue (ex. autre sport/ligue).
- **Cible (à confirmer)** : défaut serveur `season=current` (ou paramètre explicite), le front n'envoie plus `from`. **Cplx** S. **Test** : `season.test.ts` existe.

### TRT-008 — « Journée = week-end » et fuseau  · P2
- **Localisation** : `src/lib/timezone.ts:35-63,66-74` (règle samedi/dimanche, `weekendRangeForSaturday`) ; `match-filters.ts:57-64` — `matchWeekendKey`/`defaultWeekend` **fixent `"Europe/Paris"`** alors que `tables/page.tsx:37` et `BoardView.tsx:46` utilisent `club.timezone`. 28 occurrences de `"Europe/Paris"`/`PARIS` dans `src/` (grep). `match-display.tsx:10-15` justifie le choix par « le basket français n'existe qu'en France » ; `club-settings.ts:25,36` permet pourtant de saisir un fuseau.
- **Problème** : règle métier dupliquée avec le back (`timezone.ts:6-11` le dit : « même technique que `computeDayRange` côté ball-manager-back ») ; incohérence selon l'écran (Paris vs fuseau du club).
- **Cible (à confirmer)** : le back calcule la journée et renvoie `weekendKey` + libellé par match ; ou accepte `weekend=YYYY-MM-DD`. Lié à TRT-006. **Cplx** M. **Test** : `timezone.test.ts`, `match-filters.test.ts` existent.

### TRT-009 — Résultats : groupage, bilan, jointure  · P2
- **Localisation** : `src/features/results/result-groups.ts:33-70` (filtre « joué », tri, groupage par libellé, bilan `record`, rattachement des classements par **libellé d'équipe**) ; `matchOutcome` `match-display.tsx:93-100` ; `app/c/.../resultats/page.tsx:28-35` (+ miroir public).
- **Problème** : jointure matchs↔classements par comparaison de libellés (`:60-62`) = fragile (fusion de groupes si deux équipes ont le même libellé) ; bilan recalculé à chaque rendu ; règle de victoire dupliquée (TRT-005).
- **Cible (à confirmer)** : `GET /v1/clubs/:id/results?season=` renvoyant groupes, bilans et classements rattachés par `teamId`. **Cplx** M. **Test** : `result-groups.test.ts` existe (caractérisation acquise pour le groupage ; à compléter pour la jointure classements si absente).

### TRT-010 — Import de licenciés : parsing dans le navigateur  · P2
- **Localisation** : `src/features/licencies/ImportLicenciesPanel.tsx:20-28` (alias d'en-têtes), `:32-37` (séparateur TSV/CSV : **`split(",")` simple, casse sur un nom entre guillemets contenant une virgule**), `:44-49` (date `DD/MM/YYYY`→ISO), `:51-101` (règles de rejet, `sexe`).
- **Problème** : règles de gestion de l'import FFBB (colonnes, dédoublonnage, lignes rejetées) vivent dans le client ; le serveur ne revoit que des lignes déjà interprétées, donc un second client (mobile, script) devrait les réimplémenter. Le CSV n'est pas un vrai parseur.
- **Cible (à confirmer)** : `POST …/licencies/import` accepte `{ text }` (ou fichier) et renvoie un rapport (importés / ignorés / raisons). **Cplx** M. **Risque** moyen. **Test** : caractérisation de `parseRows` (fonction non exportée → à extraire avant, sans changer le comportement).

### TRT-011 — Réglages du club : écriture directe  · P2
- **Localisation** : `src/server/actions/club-settings.ts:34-37` (seul `.from()` Supabase de `src/`), validations `:25-31` (nom non vide uniquement) ; `docs/MIGRATION_TO_API.md` catégorie D (`BACKEND_API_GAP`).
- **Constats** : (a) seule dérogation à la règle « Supabase = auth uniquement » ; (b) la protection repose sur RLS + `GRANT/REVOKE` de colonnes (`:13-17`) — OK mais invisible depuis ce repo ; (c) **le fuseau (`timezone`) n'est pas validé** : n'importe quelle chaîne est stockée (`:25,36`). `new Intl.DateTimeFormat(…, { timeZone: "xyz" })` lève `RangeError` (`timezone.ts:16`, `labels.ts:32`) → un fuseau invalide saisi par un admin peut **casser les pages Tables/Dérogations de son club**. À vérifier : contrainte en base ?
- **Mise à jour Phase 3** : la route `PATCH /v1/clubs/{clubId}` (`name`, `shortName`, `timezone`, `logoUrl`, `accentColor`, `schema.ts:7305-7312`) **existe** et `api.clubs.update` est câblé (`clubs.ts:24-25`) : aucun nouvel endpoint. **Décision D-1 (migrer) retenue** ; mesure conservatoire livrée (`cb085e1`). Ancienne recommandation : `PATCH /v1/clubs/:clubId/settings` (validation Zod du fuseau via `Intl.supportedValuesOf("timeZone")`, club_admin imposé par le back), car (1) c'est l'unique accès BDD direct, (2) la validation manque, (3) `@supabase` côté serveur n'a plus d'autre rôle que l'auth. **Cplx** S. **Test** : action testable (mock Supabase) avant migration.

### TRT-012 — Conversion fuseau/DST dupliquée  · P3
- **Localisation** : `src/lib/timezone.ts:13-32` (`zonedWallTimeToUtc`), `features/derogation-requests/labels.ts:108-120` (`zonedIso`, même algorithme), `labels.ts:68-72`/`timezone.ts:35-38` (`localDateKey`/`todayInTimezone`), + version back (`timezone.ts:6-11`). Utilisé par `SlotPicker.tsx:26-31` (propose 6 week-ends, construit l'ISO de la demande).
- **Cible** : unifier en un module front **ou** faire renvoyer par l'API des champs prêts (`localDate`, `localTime`). Dépend de TRT-008. **Cplx** S.

### TRT-013 — Comptages et filtres de petites listes admin  · P3
- `admin/issues/page.tsx:32-34` (filtre `auto_corrected` côté Next, comptage erreurs/avertissements) ; `admin/stats/page.tsx:42-47` (tri + comptage par état) ; `platform/clubs/page.tsx:49,60-63` (comptes sur `clubs`) ; `features/admin/DerogationsList.tsx:94-99` ; `derogation-requests/labels.ts:128-146` (`groupRequests`, regroupement par statut) ; `dashboard/page.tsx:100-102`.
- **Volumes** : dizaines d'éléments → coût négligeable ; l'intérêt est de ne pas dupliquer des règles (« `auto_corrected` ne s'affiche pas » = règle produit, `issues/page.tsx:28-31`). **Cible** : `?status=open` + compteurs dans la réponse. **Cplx** S, **Risque** faible. À grouper en un lot opportuniste.

### TRT-014 — Résumé de journée (Tables)  · P3
- `features/tables/DaySummary.tsx:13-26` : calcule postes totaux/affectés/conflits, en appliquant `refereeNotNeeded` — règle métier « arbitre non requis » reproduite hors du moteur back (le commentaire `:3-4` dit s'aligner dessus). **Cible** : `summary` dans la réponse Tables. **Cplx** S. `DaySummary` a un test (`computeDaySummary`).

### TRT-015 — Liste des licenciés + recherche locale  · P3
- `app/c/.../joueurs/page.tsx:29` (tout le roster), `features/licencies/RosterBoard.tsx:314-318` (filtre local). Authentifié, volume borné (centaines) ; à traiter seulement si TRT-001 introduit déjà `?q=&limit=`.

## Traitements examinés et **conservés** côté front (justification)
| Élément | Localisation | Pourquoi on garde |
|---|---|---|
| Recherche dans les candidats déjà chargés | `tables/TableSuggestionsSheet.tsx:31-35,179-185` | Filtre UX sur ≤ quelques dizaines de lignes déjà envoyées par l'API (moteur de suggestion = back, `:125`). |
| Formatage d'affichage (dates/heures/libellés) | `matches/match-display.tsx:8-35,56-90`, `labels.ts` | Présentation pure (hors fuseau, voir TRT-008/012). |
| Planning des gymnases | `derogation-requests/VenuePlanning.tsx:1-70` | Disponibilités/conflits/horaires **déjà calculés par l'API** (`:36-38`) ; le front ne fait que le placement graphique. |
| Groupage visuel par jour | `public-home/group-by-day.ts:13-34` | Regroupement d'affichage d'une liste déjà filtrée (≤ quelques dizaines). |
| État UI | `RosterBoard.tsx`, toasts, `JourneePicker`, wizard | Interactions. |
| Jeton personnel public | `lib/publicToken.ts:13-41`, `PublicIdentityProvider.tsx:46` | Stockage d'un identifiant opaque (l'authentification reste côté back) — risque XSS-vol de `localStorage` noté en R-008. |

## Autres catégories de la grille — résultat de la recherche
- **Secrets / clés exposées** : aucun (voir `01-cartographie-repo.md` §6).
- **Appels API tierces depuis le front** : aucun (`fetch` unique, `client.ts:60`) ; FFBB/FBI/e-Marque uniquement côté back.
- **Contrôles d'autorisation côté client** : redirections par rôle dans `club-context.ts:43-67` et `nav.ts` (affichage) ; **à vérifier côté back** que chaque route revérifie (R-007, Q-001).
- **Calcul CPU lourd (PDF/images/crypto)** : aucun dans `src/`. `worker/` (Playwright, AES) est hors-chemin (Q-005).
- **Polling** : seulement `pollJobUntilTerminal` (`jobs.ts:25-44`, borné à 40 essais) ; pas d'`setInterval`.
- **`worker/`** : voir Q-005, suppression prévue en Phase 5 ; aucun traitement à migrer.


## Mises à jour Phase 3
- TRT-006 et TRT-011 : endpoints déjà existants (E-3, E-2 de `04-contrats-api.md`) → lots **débloqués côté front** (voir `03`).
- TRT-001 : R-013 **accepté** (D-3 = B) ; LOT-02 en tête de Phase 4, révision obligatoire.
- Nouveau constat hors inventaire initial : jeton personnel en query string (E-4, R-014).
