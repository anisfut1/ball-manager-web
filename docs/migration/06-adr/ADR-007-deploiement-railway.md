# ADR-007 — Déploiement du nouveau back sur Railway
- **Date** : 2026-10-07 (révision du même jour : remplace la première version, fondée sur une hypothèse d'hébergement erronée)
- **Statut** : Proposée — hébergement **décidé** par le propriétaire (Q-012 : Railway) ; les choix de build/exploitation ci-dessous sont à valider au 🛑.
- **Historique** : la première version (Docker Compose + Caddy, Phase 3) reposait sur une réponse erronée (Q-007 : « VPS ») et est **remplacée**. **Le front est sur Vercel** (Q-017, confirmé le 2026-10-07) : aucun VPS dans le projet. Le front reste hors périmètre de cet ADR.

## Contexte
- Décisions : Q-011 = S3 (coexistence puis remplacement progressif), Q-012 = nouveau back sur **Railway**, repository créé par le propriétaire (`11-init-repo-back.md`).
- Le back = un service **API** (Hono) + un service **worker** (`pg-boss`, ADR-004) ; en coexistence il appelle `ball-manager-back` (Vercel) en serveur-à-serveur (jobs, ADR-005).
- R-014 : le jeton personnel public voyage aujourd'hui en query string (`04` E-4) ; la consigne est de **garantir que la query string n'est pas journalisée**.
- **Faits vérifiés dans la documentation Railway le 2026-10-07** (à revérifier avant gel, la plateforme évolue) :
  | Fait | Source |
  |---|---|
  | Builders valides : `RAILPACK` (défaut) et `DOCKERFILE` seulement ; **Nixpacks n'est plus sélectionnable** (déprécié, mode maintenance) ; un `Dockerfile` détecté est **toujours prioritaire** | docs.railway.com/config-as-code/reference ; discussions station.railway.com (« About Nixpacks builder ») |
  | Le « Config as Code » (`railway.json`/`railway.toml`) est **déprécié**, échéance **2026-12-01** pour les services existants ; remplaçant : Infrastructure as Code | docs.railway.com/config-as-code/reference |
  | Les healthchecks ne servent **qu'au déploiement** (avant bascule du trafic), **pas à la surveillance continue** ; défaut 300 s ; requêtes émises depuis `healthcheck.railway.app` | docs.railway.com/reference/healthchecks |
  | Journaux HTTP : chemin, méthode, statut, durée, IP source, user-agent… ; **les query strings ne sont ni documentées comme journalisées, ni configurables/excluables** ; rétention 3 j (Free) à 90 j (Enterprise) | docs.railway.com/reference/logging |
  | Requête HTTP : jusqu'à **15 min** si des données circulent, fermée après **5 min** sans données ; 32 Ko d'en-têtes ; ~11 000 req/s par domaine | docs.railway.com/networking/public-networking/specs-and-limits |
  | Déploiement auto depuis la branche GitHub liée ; **désactivable** ; option **« Wait for CI »** (attend les workflows GitHub Actions, abandon après 2 h) | docs.railway.com/deployments/github-autodeploys |
  | **Non documenté / non vérifié** : IPv6 sortant, domaine personnalisé + TLS automatique, variables « scellées », région et latence vers Supabase, IP sortantes fixes, tarification | — |

## Options étudiées
### Build
| Option | Avantages | Inconvénients |
|---|---|---|
| A. **Dockerfile** (multi-étapes, `node:24-slim` épinglé par digest, utilisateur non-root) | Reproductible hors Railway (portable, testable en local/CI) ; contrôle total (versions, utilisateur, `HEALTHCHECK`) ; indépendant de la dépréciation de `railway.json` (aucun fichier Railway requis) | À maintenir (mises à jour d'image de base) |
| B. **Railpack** (zéro configuration, défaut) | Aucun fichier ; images plus petites annoncées par Railway ; mises à jour de la chaîne par la plateforme | Moins de contrôle ; comportement dépendant de Railway ; Node 24 / commande worker à régler dans le tableau de bord ; moins reproductible en CI |
| ~~C. Nixpacks~~ | — | **Exclu : non sélectionnable** (déprécié) |
### Topologie
| Option | Avantages | Inconvénients |
|---|---|---|
| 1. **Deux services** (`api`, `worker`) depuis le même dépôt/image, commandes de démarrage différentes | Mise à l'échelle et redémarrage indépendants ; un worker bloqué n'affecte pas l'API | Deux services facturés ; variables dupliquées (ou partagées via variables de projet) |
| 2. Un service unique (API + worker dans le même processus) | Moins cher, plus simple | Couplage : une opération lourde dégrade l'API ; redémarrage commun |
### Déclenchement du déploiement
| Option | Avantages | Inconvénients |
|---|---|---|
| i. Déploiement auto sur `main` | Rapide | **Contraire à Q-007** (« aucun déploiement automatique sans validation ») |
| ii. **Branche de déploiement dédiée** (`release`) + « Wait for CI » ; promotion manuelle (fusion) | Validation humaine + CI obligatoire ; retour arrière = redéployer le commit précédent | Une étape manuelle |
| iii. Auto-deploy désactivé, déploiement manuel (palette de commandes) | Contrôle maximal | Facile d'oublier de déployer |

## Décision (proposée)
1. **Build : Dockerfile** (A), image `node:24-slim` épinglée par digest, multi-étapes, utilisateur non-root, un seul `Dockerfile` pour `api` et `worker`. **Aucun `railway.json`** (déprécié, échéance 2026-12-01) : la configuration (commande de démarrage, healthcheck, région) vit dans le tableau de bord, documentée dans `ops/railway.md` du nouveau dépôt ; basculer vers l'Infrastructure as Code Railway seulement si elle s'avère stable (à évaluer).
2. **Topologie : deux services** (1) `api` et `worker`, **deux environnements** Railway : `staging` et `production` — le staging fournit enfin un environnement pour les vérifications de type Q-014 sans toucher la production.
3. **Déclenchement : option ii** — branche `release` liée à `production`, **« Wait for CI » activé**, promotion par fusion manuelle ; `staging` suit `main`. Retour arrière : redéployer le commit précédent depuis Railway. Cohérent avec Q-007.
4. **Variables et secrets** : variables de service Railway uniquement (jamais dans le dépôt, l'image ou les logs) ; un jeu par environnement ; secrets minimaux : chaîne de connexion Postgres (rôle dédié, ADR-003), jeton de service vers `ball-manager-back`, clé du service d'e-mails, secret de hachage du jeton personnel (ADR-006). Rotation documentée ; **« variables scellées » : à vérifier** avant de s'y appuyer.
5. **Domaines** : domaine fourni par Railway pour `staging` ; domaine propre pour `production` (**TLS automatique et délégation DNS à vérifier**) ; **CORS en liste blanche** sur le domaine du front (obligatoire : en option (a) d'ADR-005 le navigateur appelle directement ce domaine).
6. **Healthchecks** : `GET /health` (liveness, sans secret) pour la bascule de déploiement. **Comme Railway ne surveille pas en continu**, ajouter une supervision externe de `GET /ready` (BDD + âge du plus vieux job `pg-boss`) et une alerte de « battement » du worker (job récurrent qui écrit un horodatage ; alerte si trop ancien).
7. **Journaux et R-014 (garantie de non-journalisation de la query string)** — *Railway ne permet ni de la garantir ni de l'exclure* (rien de documenté). La garantie est donc obtenue **par conception**, pas par configuration :
   - **le nouveau back n'accepte jamais de jeton en query string** : `?token=` → `400 TOKEN_IN_QUERY` (le jeton passe par `Authorization`/`X-Personal-Link-Token`, ADR-006, `04` B.9) ;
   - **aucun trafic portant `?token=` ne transite par Railway** : le trafic hérité (`ball-manager-back`) reste en direct sur Vercel — ce qui **exclut le routage (b) d'ADR-005** (proxy Railway) pour les routes à jeton ;
   - journaux applicatifs : JSON sur stdout, **chemin de route (`/v1/…/:id`) sans query**, jamais de jeton, d'e-mail ni de nom ;
   - **vérification à faire en staging** (voir `11-init-repo-back.md`) : envoyer `?probe=SENTINELLE-NON-SECRETE` et chercher la valeur dans l'onglet Observability/HTTP logs — résultat consigné ; tant qu'elle n'est pas faite, la garantie est **« non vérifiée »**.
8. **Durée des requêtes** : la limite plateforme (15 min / 5 min d'inactivité) n'est plus le facteur limitant ; les opérations longues restent **asynchrones** (ADR-004) pour ne pas retenir de connexion.

## Conséquences
- (+) Plus d'exploitation de serveur (pas de TLS/proxy/mises à jour système à gérer) ; staging + production ; déploiement validé et réversible ; image portable (le Dockerfile fonctionne ailleurs si Railway est quitté).
- (−) **Dépendance à une plateforme dont plusieurs comportements sont non vérifiés** (liste ci-dessus) : régions, latence vers Supabase, IPv6 sortant, TLS du domaine propre, tarifs.
- (−) Dépréciation de `railway.json` à 8 semaines : aucun fichier de ce type ne doit être introduit.
- (−) Healthchecks seulement au déploiement : sans supervision externe, un service planté après déploiement n'est signalé que par le redémarrage automatique.
- (−) Le routage S3 est contraint (R-014) : voir ADR-005.
- **À surveiller** : coût (services `api` + `worker` × 2 environnements), latence Railway↔Supabase (même région ?), politique de rétention des journaux (3 à 30 jours selon l'offre) vs besoin d'audit, évolution de l'Infrastructure as Code Railway.

## Conséquences de Q-017 (front sur Vercel) pour le déploiement et R-014
- **CORS** du nouveau back : origine du front de production sur Vercel ; prévisualisations Vercel à décider (liste explicite, pas de joker).
- **Rollback côté front** : promotion du déploiement Vercel précédent (ADR-005).
- **R-014 — deux plateformes à examiner** : Railway (non documenté, ci-dessus) **et Vercel (documenté : les « Search Params » figurent dans les journaux d'exécution**, vercel.com/docs/logs/runtime, rétention 1 h à 30 jours selon l'offre). Le jeton traverse déjà le front Vercel (ouverture du lien e-mail) et `ball-manager-back` (Vercel) ; **la migration du jeton vers un en-tête ne suffit pas** : le **lien de l'e-mail** lui-même contient `?token=`. Mitigation à planifier (LOT-14) : **placer le jeton dans le fragment `#token=`** du lien (jamais envoyé au serveur ni dans `Referer`), lu par le front en plus de `?token=` pendant la transition. Cela exige de modifier la génération du lien dans `ball-manager-back` (action du propriétaire).
