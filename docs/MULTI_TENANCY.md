# Multi-tenancy — modèle, isolation, règles de développement

> **Note post-migration** (voir `docs/MIGRATION_TO_API.md`) : le modèle
> décrit ci-dessous (schéma `clubs`/`club_memberships`/`membership_roles`,
> RLS, fonctions `is_club_member()`/`has_club_role()`) reste exact — il n'a
> pas changé. Ce qui a changé : **ball-manager-back est désormais
> l'unique propriétaire de `supabase/migrations/`** et l'unique service qui
> écrit sur ces tables (hors authentification). ball-manager-web ne lit plus ce modèle
> qu'à travers `GET /v1/clubs` (voir `src/lib/tenancy/club-context.ts`),
> jamais par une requête Supabase directe. Ce document reste la référence
> conceptuelle du modèle de données.

Ce document fait autorité sur tout ce qui concerne le multi-tenant SaaS.
`ARCHITECTURE.md` décrit les modules métier (matchs, e-Marque, FFBB, FBI...)
qui s'appliquent identiquement à chaque club ; ce document décrit comment
plusieurs clubs cohabitent dans la même base, la même application, le même
déploiement, sans jamais se mélanger.

## 1. Modèle tenant

Un **tenant** = un **club**, représenté par une ligne dans `clubs` :

```
clubs
- id uuid (PK, utilisé dans toutes les FK internes)
- name, short_name, logo_url, accent_color   -- branding léger
- slug                                        -- identifiant d'URL, UNIQUE
- ffbb_club_id                                -- code FFBB de CE club
- timezone
- status ('active' | 'suspended')
- ffbb_enabled, ffbb_next_sync_at             -- ordonnancement du cron FFBB
```

SC Sète Basket est une ligne comme une autre (`slug = 'sc-sete-basket'`,
`ffbb_club_id = 'OCC0034008'`) — jamais une hypothèse dans le code
applicatif. Une recherche du code ne doit plus jamais faire remonter
`OCC0034008` ou "SC Sète" en dehors des données de migration (voir §8).

## 2. Isolation structurelle des données

Chaque table qui appartient à un club porte une colonne `club_id`
**explicite** (pas seulement déductible par une jointure) :

`ffbb_team_engagements`, `matches`, `match_change_history`, `sync_runs`,
`fbi_credentials`, `fbi_integration_status`, `emarque_imports`,
`match_participants`, `match_coaches`, `match_officials`,
`match_table_officials`, `player_match_stats`, `shot_events`, `licencies`,
`teams`, `club_memberships`.

**Exception documentée** : `competitions`, `pools`, `venues` restent des
référentiels **globaux partagés**. Ce sont de vraies entités FFBB : si
deux clubs tenants jouent dans la même poule, c'est la même ligne `pools`,
pas une copie par club. Leur clé d'upsert (`ffbb_*_id`, l'identifiant
Directus) est traitée comme mondialement unique — ce n'est PAS le
fondement de l'isolation SaaS, seulement une déduplication de référentiel.

### Décision : pas de partage de ligne `matches` entre deux clubs tenants

Si deux clubs de la plateforme s'affrontent, chacun a sa **propre** ligne
`matches` pour cette rencontre FFBB (son propre historique de changements,
son propre import e-Marque, son propre `emarque_status`). Plus simple et
plus sûr qu'un partage de ligne (qui poserait la question : quel club
"gagne" en cas d'import e-Marque concurrent ?). Conséquence directe :
`matches.ffbb_match_id` n'est **pas** globalement unique, seulement
`UNIQUE(club_id, ffbb_match_id)`.

### Audit des contraintes UNIQUE (§46 du brief SaaS)

| Table | Avant | Après |
|---|---|---|
| `matches` | `UNIQUE(ffbb_match_id)` | `UNIQUE(club_id, ffbb_match_id)` |
| `ffbb_team_engagements` | `UNIQUE(ffbb_engagement_id)` | `UNIQUE(club_id, ffbb_engagement_id)` |
| `emarque_imports` | `UNIQUE(file_hash)` | `UNIQUE(club_id, file_hash)` |
| `licencies` | aucune | `UNIQUE(club_id, license_number)` (index partiel, `license_number` nullable) |
| `fbi_credentials` | `UNIQUE(club_id)` | inchangé (déjà correct) |
| `competitions`/`pools`/`venues` | `UNIQUE(ffbb_*_id)` | inchangé (référentiel global, voir plus haut) |

## 3. Utilisateurs, memberships, rôles

Un compte Supabase Auth (`auth.users`) est **global** — la même personne
peut appartenir à plusieurs clubs. `profiles` reste global (nom affiché).
Le lien vers une personne physique du club (licencié) est désormais
**par appartenance**, pas par compte :

```
club_memberships
- id, club_id, user_id, status ('active' | 'suspended')
- licencie_id  -- nullable, DOIT appartenir au même club_id (trigger)
- UNIQUE(club_id, user_id)

membership_roles
- id, membership_id, role (club_role), scope_team_id (nullable)
- scope_team_id, s'il est renseigné, DOIT appartenir au même club que le
  membership (trigger) — impossible d'avoir "membership Club A + scope Club B"
```

Un même utilisateur peut donc être `licencié X` dans le Club A et
`licencié Y` dans le Club B (ou aucun licencié dans l'un des deux) — ce
n'était pas possible avec l'ancien `profiles.licencie_id` (colonne unique
globale), qui a été supprimé.

### Rôles

`club_role` (enum) : `club_admin`, `correspondant_club`,
`responsable_tables`, `coach`, `joueur`, `parent`. Tous scopés à un
membership, donc à un club — plus jamais globaux.

`club_admin` remplace l'ex-`super_admin` de la Phase 0 : "tous les droits
SUR CE CLUB". Renommé maintenant (avant toute donnée réelle en
production) pour ne jamais le confondre avec `platform_admin` :

```
platform_admins
- user_id (PK, FK auth.users)
```

`platform_admin` = opérateur de la plateforme SaaS. Aucune policy RLS
d'écriture pour `authenticated` sur cette table : impossible de
s'auto-élever, la seule voie est un script serveur (`scripts/seed.ts`,
`SEED_PLATFORM_ADMIN=true`) exécuté avec la service role.

## 4. RLS — stratégie d'isolation

Deux fonctions `SECURITY DEFINER` (search_path fixé, pas d'escalade)
portent toute la logique d'appartenance :

```sql
is_club_member(target_club_id uuid) returns boolean
has_club_role(target_club_id uuid, target_role club_role) returns boolean
is_platform_admin() returns boolean
```

Chaque table tenant-scoped a exactement deux policies :

- `..._select_member` : `is_club_member(club_id) or is_platform_admin()`
- `..._all_club_admin` : `has_club_role(club_id, 'club_admin') or is_platform_admin()`

`fbi_credentials` reste une exception volontaire : **aucune** policy pour
`authenticated`, même le `club_admin` de ce club ne peut pas lire les
identifiants FBI en clair via un client RLS-bound — seule la service role
(jamais exposée au navigateur) y accède. Le mot de passe est de toute
façon chiffré (AES-256-GCM, AAD = `club_id`, voir §6) : un déplacement
accidentel de ciphertext entre clubs échouerait de toute façon au
déchiffrement.

`competitions`/`pools`/`venues` (référentiel global) : lecture ouverte à
tout `authenticated`, écriture réservée au `platform_admin` (le service de
synchronisation utilise la service role, qui bypass la RLS).

### Vérification réelle (pas seulement écrite)

`supabase/tests/isolation_test.sql` exécute ces scénarios contre un vrai
moteur PostgreSQL (voir `supabase/tests/README.md`) : deux clubs, un
utilisateur par club, un utilisateur des deux, un `platform_admin`, un
visiteur anonyme — lecture, écriture, lecture par UUID connu, coexistence
de mêmes identifiants externes entre clubs. **26/26 assertions passées**
lors de l'exécution locale effectuée pendant le développement de cette
migration (voir le README de ce dossier pour le détail et pour la rejouer).

## 5. Routing

```
/                          résolution du club courant (0/1/plusieurs clubs)
/login
/c/{slug}/dashboard
/c/{slug}/matchs
/c/{slug}/matchs/{id}
/c/{slug}/admin/integrations
/c/{slug}/admin/integrations/fbi
/c/{slug}/admin/sync
/c/{slug}/admin/issues
/c/{slug}/admin/settings
/platform/clubs            réservé platform_admin — jamais un club_admin
```

Le slug est destiné à la navigation uniquement ; toutes les relations
internes utilisent `clubs.id` (UUID), jamais le slug comme clé étrangère.
Le hostname n'intervient dans aucune résolution de tenant aujourd'hui — un
futur domaine personnalisé (`app.club-b.fr`) pourrait être ajouté plus
tard en résolvant le slug depuis le host plutôt que depuis l'URL, sans
changer le modèle de données.

### `getClubContext` — le point d'entrée unique

`src/lib/tenancy/club-context.ts` expose :

- `getClubContext(slug, user)` → `ClubContext | null` (null si le club
  n'existe pas OU si l'utilisateur n'en est pas membre — jamais de
  distinction observable entre les deux cas)
- `requireClubContext(slug)` → 404 si `getClubContext` renvoie null
- `requireClubAdminContext(slug)` → redirige si le rôle `club_admin` manque
- `listUserClubs(userId)` → clubs + rôles, pour le sélecteur de club et la
  résolution post-connexion (0/1/plusieurs clubs)

**Règle de développement (§58 du brief SaaS)** : toute page ou service qui
a besoin du club courant DOIT passer par ce module. Ne jamais réimplémenter
une vérification d'appartenance ad hoc — c'est ce qui rend difficile
d'oublier un `club_id` par erreur.

## 6. FFBB — synchronisation multi-club

`syncFfbb(supabase, provider, { id, ffbbClubId })` prend le club en
paramètre explicite (plus de singleton `SC_SETE_CLUB_CODE`). Le cron
(`/api/internal/sync-ffbb`) délègue à `syncAllDueClubs` :

1. Sélectionne les clubs `status = 'active' AND ffbb_enabled = true` dont
   `ffbb_next_sync_at` est dû (`NULL` ou passé), par petits lots
   (`FFBB_SYNC_BATCH_SIZE = 20`).
2. Acquiert un verrou `(club_id, 'ffbb')` via `try_acquire_sync_lock` —
   voir §8.
3. Synchronise, décale `ffbb_next_sync_at` de `FFBB_SYNC_INTERVAL_MINUTES`
   (15 min), libère le verrou.
4. Un club en échec n'empêche jamais les autres d'être traités (boucle
   séquentielle avec `try/catch` par club).

Simple aujourd'hui (séquentiel), compatible avec une évolution : le point
de montée en charge futur est de remplacer la boucle séquentielle par un
worker/queue qui consommerait la même requête "clubs dus" — pas besoin de
Redis/Kafka pour 2 ou 20 clubs.

## 7. FBI — identifiants, session, jobs multi-club

`fbi_credentials` est déjà `UNIQUE(club_id)` depuis la Phase B — chaque
club a son propre couple identifiant/mot de passe chiffré. Le chiffrement
AES-256-GCM utilise désormais `club_id` comme **AAD** (Additional
Authenticated Data, voir `src/lib/security/crypto.ts`) : un ciphertext
déplacé par erreur vers un autre club échoue au déchiffrement plutôt que
de rendre silencieusement le secret d'un autre tenant. La clé maître
`FBI_CREDENTIALS_ENCRYPTION_KEY` reste globale au déploiement (un seul
secret d'infrastructure, comme documenté dès la Phase B).

> **Mise à jour** : l'automatisation FBI réelle (login, découverte et
> téléchargement e-Marque) tourne désormais dans un worker séparé
> (`worker/`, Playwright) plutôt qu'en ligne dans une route Vercel — voir
> **`docs/FBI_WORKER.md`** pour l'architecture complète. Le paragraphe
> ci-dessous résume uniquement les garanties d'isolation multi-tenant, qui
> restent inchangées dans le nouveau design.

`fbi_jobs` (la file de travail, `FOR UPDATE SKIP LOCKED` via
`claim_next_fbi_job`) et `match_documents` (le manifeste des fichiers
téléchargés) suivent exactement les mêmes règles que le reste du schéma :
`club_id` obligatoire, RLS scopée au club pour la lecture, aucune policy
d'écriture pour un rôle `authenticated` (le worker écrit en service role).
`claim_next_fbi_job` exclut déjà les clubs ayant un job `claimed`/`running`
— au plus une session FBI active par club, quel que soit le nombre de
workers. `BrowserFbiClient` (`worker/src/fbi/browser-client.ts`) crée un
`BrowserContext` Playwright ISOLÉ à chaque connexion : jamais de cookie
partagé entre deux clubs, même traités par le même processus worker à la
suite. Le déchiffrement des identifiants utilise toujours `club_id` comme
AAD (§ ci-dessus), y compris côté worker (`worker/src/crypto.ts`, copie
volontairement indépendante — voir `worker/README.md`).

## 8. Verrouillage (`sync_locks`)

```sql
sync_locks (club_id, integration) PRIMARY KEY (club_id, integration)
try_acquire_sync_lock(p_club_id, p_integration, p_stale_after default 10min) returns boolean
release_sync_lock(p_club_id, p_integration)
```

Une ligne en base plutôt qu'un `pg_advisory_lock` classique : les
fonctions serverless (Vercel) n'ont pas de session PostgreSQL persistante
entre l'acquisition et la libération d'un verrou de session, ce qui
rendrait `pg_advisory_lock` peu fiable dans ce contexte. `try_acquire_sync_lock`
nettoie automatiquement tout verrou plus vieux que `p_stale_after` (job
mort sans avoir nettoyé). Scope `(club_id, integration)` : un verrou FFBB
du Club A n'a aucun effet sur le Club B, ni sur l'intégration FBI du Club A.

## 9. Storage — e-Marque tenant-scopé

```
private/emarque/{club_id}/{season}/{match_id}/original.zip
```

`club_id` en premier segment (avant même la saison) rend une éventuelle
fuite cross-tenant immédiatement visible dans un audit de bucket. Bucket
privé, aucune policy Storage pour `authenticated`/`anon` : seul le backend
(service role) lit/écrit ces fichiers — jamais d'URL publique, jamais
d'accès direct navigateur (voir la migration de création du bucket, Phase D).

## 10. Onboarding d'un nouveau club (sans toucher au code)

`/platform/clubs` (réservé `platform_admin`) :

1. Formulaire : nom, slug (auto-généré si vide), code FFBB, fuseau
   horaire, email du premier admin (optionnel).
2. `createClubAction` (server action) crée la ligne `clubs`, puis, si un
   email est fourni :
   - réutilise le compte Supabase Auth existant s'il y en a un pour cet
     email, sinon envoie une invitation Supabase
     (`auth.admin.inviteUserByEmail`, qui crée le compte en attente
     d'activation) ;
   - crée le `club_membership` puis le rôle `club_admin` associé.
3. Le nouvel admin, une fois son compte activé, va sur
   `/c/{slug}/admin/integrations` et configure FFBB (déjà pré-rempli avec
   le code saisi à l'étape 1, modifiable dans `/c/{slug}/admin/settings`)
   et FBI (identifiant/mot de passe, test de connexion) — **tout depuis
   la web app**, aucune opération SQL manuelle.

## 11. Ce qui n'est PAS fait (volontairement)

- **Billing** : aucun Stripe, abonnement, essai gratuit. `clubs.status`
  (`active`/`suspended`) existe déjà comme point d'ancrage futur (un club
  suspendu ne synchronise plus FFBB/FBI), mais rien ne l'active
  automatiquement aujourd'hui.
- **Domaines personnalisés** : le tenant est résolu depuis l'URL
  (`/c/{slug}`), jamais depuis le hostname — l'architecture n'empêche pas
  d'ajouter cette résolution plus tard sans changer le modèle de données.
- **Déploiement séparé par club** : une seule base, une seule application,
  isolation strictement logique (RLS + `club_id`).
- **White-label complet** : le branding est limité à
  nom/nom-court/logo/couleur d'accent/fuseau horaire.
- **pgTAP / stack Supabase CLI locale** : `supabase/tests/isolation_test.sql`
  a été exécuté avec succès via un Postgres local "nu" (shim documenté dans
  `supabase/tests/README.md`), pas encore rejoué via `supabase test db`
  (Docker non disponible dans l'environnement de développement de cette
  migration).

## 12. Règle pour toute nouvelle fonctionnalité métier

Tables de marque, disponibilités, affectation intelligente, dérogations,
stats joueurs, notifications, convocations, planning — tout futur module
doit être **tenant-scoped dès sa première migration** : `club_id` explicite
sur ses tables, policies RLS `is_club_member`/`has_club_role`, services
paramétrés par `clubId` (jamais un club implicite), pages sous
`/c/{slug}/...`. Ne pas réintroduire un mécanisme global "pour aller vite" :
c'est exactement la dette que cette migration a corrigée.
