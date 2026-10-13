# ADR-004 — Jobs asynchrones et planification
- **Date** : 2026-10-07
- **Statut** : Proposée (révisée le 2026-10-07 pour Railway ; dépend de Q-015 pour la connexion de `pg-boss`)

## Contexte
TRT-004 : 11 endpoints retiennent une requête HTTP de 30 à 280 s depuis le navigateur (`integrations.ts:64,82,98,138`, `derogations.ts:44`, `matches.ts:107,127`, `publicTables.ts:134,143`, `licencies.ts:52,65`) ; incident de production documenté (`client.ts:13-17`). Le motif `202 + jobId` + `GET /v1/jobs/{jobId}` existe déjà (`jobs.ts:7-44`). Le travail réel (FFBB, FBI avec navigateur headless, e-Marque) est dans `ball-manager-back` ; en coexistence, le nouveau back **pilote** ces traitements sans les réimplémenter.
Besoins : retries, idempotence, visibilité du statut, planification récurrente, un seul service worker (pas de cluster), peu de services à exploiter.

## Options étudiées
| Option | Avantages | Inconvénients |
|---|---|---|
| A. **File dans PostgreSQL : `pg-boss`** (ou `graphile-worker`) | Aucune infra de plus (Postgres déjà là) ; enqueue transactionnel avec l'écriture métier ; retries, délais, cron intégrés ; statuts interrogeables en SQL | Charge supplémentaire sur la base Supabase (faible) ; connexion **directe** requise (pas le pooler transactionnel) ; débit limité (largement suffisant ici) |
| B. **Redis + BullMQ** | Très répandu, tableau de bord, débit élevé | Service supplémentaire à exploiter/sauvegarder sur Railway ; enqueue non transactionnel avec Postgres |
| C. Table `jobs` maison + cron (modèle actuel `fbi_jobs`/claim, `worker/src/jobs/claim.ts`) | Aucun paquet ; connu de l'équipe | On réimplémente retries/verrous/backoff ; plus de bugs potentiels |
| D. Rester en synchrone, augmenter les timeouts | Zéro travail | Cause du TRT-004 ; fragile ; inacceptable |

## Décision (proposée)
**Option A (`pg-boss`)**, processus **worker** distinct du processus API, **même image Docker**, commande différente — sur Railway : **service `worker` séparé** (ADR-007). Contrat HTTP : `Prefer: respond-async` → `202 {jobId}` ; `GET /v1/jobs/{jobId}` (statuts `pending|claimed|running|succeeded|failed`, déjà consommés par `pollJobUntilTerminal`). Idempotence : `Idempotency-Key` (clé = `singletonKey` du job). Chaque job porte `clubId` et `requestedBy` (autorisation du suivi). Les jobs de **coexistence** appellent `ball-manager-back` en serveur-à-serveur avec un jeton de service (secret côté VPS, jamais le JWT utilisateur). Limites : concurrence 2 par défaut (estimé), délai par job 300 s, 3 essais avec backoff exponentiel pour les erreurs réseau uniquement (jamais de rejeu automatique d'une **écriture FBI** non idempotente → `retryLimit: 0` pour `derogation/create|respond`).

## Conséquences
- (+) Le navigateur ne retient plus de connexion ; fermeture d'onglet sans perte ; statut consultable.
- (−) Nouveau mode de défaillance : worker arrêté → jobs `pending` ; il faut une alerte (profondeur de file, âge du plus ancien job) et `GET /ready` qui le reflète.
- (−) Pour les écritures FBI, un job en échec après envoi partiel exige une réconciliation (état `failed` + détail) — **à concevoir avec le propriétaire du pipeline FBI**.
- À surveiller : taille du schéma `pgboss` (purge d'archives), connexions consommées ; scale-out futur (plusieurs workers) supporté par `pg-boss`.

## Révision Railway (2026-10-07)
- **Version et prérequis** (docs pg-boss, vérifiées) : v12.37, **Node ≥ 22.12** (Node 24 convient), **PostgreSQL ≥ 13** ; cron et RRULE intégrés, retries avec backoff exponentiel. Le dépôt cible Supabase (PostgreSQL ≥ 13 : à confirmer par la version affichée).
- **Connexion de `pg-boss`** selon Q-015 (ADR-003) :
  | Cas | Verdict |
  |---|---|
  | (a) Supabase, **Supavisor session mode (5432)** | **Probablement compatible** (session conservée) mais **non documenté par pg-boss : à tester** (démarrage, migration de schéma `pgboss`, cron, reprise après redémarrage) |
  | (a) Supabase, **transaction mode (6543)** | **À proscrire** pour `pg-boss` (verrous/sessions) |
  | (a) Supabase, connexion directe | IPv6 : possible seulement si l'IPv6 sortant de Railway est confirmé (non documenté) ou add-on IPv4 |
  | (b) Postgres Railway, réseau privé | Nominal |
  | (c) petit Postgres Railway **dédié à la file** | Nominal ; enqueue non transactionnel avec les données métier (acceptable, ADR-003) |
- **Repli** : si le test échoue en (a) → option (c). Le choix est réversible : seule la chaîne de connexion de la file change.
- **Worker sur Railway** : service dédié, redémarrage automatique ; **les healthchecks Railway ne surveillent pas en continu** (ADR-007 §6) → job « battement » + alerte sur l'âge du plus vieux job et sur le battement manquant. Arrêt propre sur `SIGTERM` (terminer le job en cours avant sortie : à tester).
- **Planification** : `pg-boss` (cron) suffit ; les « Cron jobs » Railway ne sont pas nécessaires. Les crons Vercel existants restent chez `ball-manager-back` (ADR-005).
- **Requêtes longues** : le motif `202 + jobId` reste obligatoire (limite plateforme 5 min d'inactivité/15 min, ADR-007) ; l'adaptateur vers `ball-manager-back` utilise un délai de 300 s côté worker (non dépendant du navigateur).
