# Ball Manager — Référentiel des fonctionnalités

**Dernière mise à jour : 2026-10-08.** État constaté dans le code (`ball-manager-web` branche `claude/sete-basket-app-architecture-c3hlxx`, `ball-manager-back` branche `main`) et dans la base Supabase de production.

Ce document est la **référence fonctionnelle** : ce que fait l'application, pour qui, avec quels écrans, quels appels API, quelles données et quelles tâches automatiques. Il complète, sans les remplacer :

| Document | Rôle |
|---|---|
| [`ball-manager-back/docs/API_ROUTES.md`](https://github.com/anisfut1/ball-manager-back/blob/main/docs/API_ROUTES.md) | Inventaire **généré** des 117 routes de l'API (`npm run docs:routes`), écarts code/contrat inclus |
| [`docs/migration/`](migration/README.md) | Chantier de migration front → back (lots, décisions, risques, architecture cible) |
| `ball-manager-back/docs/*.md` | Détail par domaine : FBI, FFBB, e-Marque, tables, dérogations, multi-clubs, auth |

Sommaire :
1. [Architecture](#1-architecture)
2. [Profils et espaces](#2-profils-et-espaces)
3. [Fonctionnalités par module](#3-fonctionnalités-par-module)
4. [Pages du site et appels API](#4-pages-du-site-et-appels-api)
5. [Tâches automatiques](#5-tâches-automatiques)
6. [Données](#6-données)
7. [Emails](#7-emails)
8. [Constats de l'audit](#8-constats-de-laudit)
9. [Feuille de route](#9-feuille-de-route)
10. [Journal des évolutions](#10-journal-des-évolutions)
11. [Tenir ce document à jour](#11-tenir-ce-document-à-jour)

---

## 1. Architecture

| Brique | Techno | Hébergement | Rôle |
|---|---|---|---|
| Site (`ball-manager-web`) | Next.js 16, React 19 | Vercel, région `dub1` (Dublin) | Affichage, formulaires. Aucune règle métier, aucune requête métier Supabase (seule l'authentification passe par Supabase Auth) |
| API (`ball-manager-back`) | Hono, TypeScript | Vercel, région `dub1` | Toute la logique métier, les droits, les intégrations |
| Base de données | Supabase Postgres 17 | `eu-west-1` (Irlande) | 46 tables, RLS activée partout ; photos dans le stockage `licencie-photos` |
| Worker FBI local | Node + Chromium (Playwright) | Mac du club (`ops/fbi-local-worker`) | Connexion FBI depuis une IP acceptée par la FFBB : feuilles e-Marque, dérogations, calendrier |
| Emails | Resend | Domaine `ball-manager.fr` (SPF, DKIM, DMARC) | Liens personnels, invitations, mot de passe oublié |
| Tâches planifiées | Vercel Cron + GitHub Actions | — | Synchronisation FFBB, file FBI, lecture e-Marque (voir §5) |

Domaine public : `https://www.ball-manager.fr` (`ball-manager.fr` redirige vers `www`).

Sources externes : **FFBB** (API publique : calendrier, résultats, classements, licenciés) ; **FBI** (extranet FFBB, avec identifiants du club : feuilles e-Marque, dérogations officielles, calendrier officiel).

---

## 2. Profils et espaces

**Espace club** (`/c/{club}/…`, compte avec email et mot de passe) :

| Rôle | Ce qu'il voit en plus |
|---|---|
| Tout membre | Accueil, Matchs, Résultats, Joueurs, Planning, classement des tables |
| `coach`, `club_admin` | Entraînements (créneaux, séances, réponses) |
| `responsable_tables` | Tables de marque |
| `coach`, `correspondant_club` (« Coordinateur ») | Dérogations internes (demandes, réponses) |
| `club_admin` | Administration : Intégrations, Équipes, Synchronisation, Suivi des stats, Anomalies, Gymnases, Dérogations FBI, Réglages, Accès publics |

**Espace plateforme** (`/platform/…`, `platform_admin`) : liste des clubs, création d'un club, administrateurs de chaque club, maintenance globale. Le `platform_admin` arrive ici après connexion.

**Espace public** (`/public/{club}/…`, sans compte) : matchs, résultats, fiches joueurs, classement des tables, en lecture libre. Avec un **lien personnel** reçu par email (jeton, pas de mot de passe) : accueil personnel, se positionner sur une table, demandes de dérogation. Ce que le lien permet dépend des drapeaux de la fiche licencié : coach, coordinateur, admin public.

---

## 3. Fonctionnalités par module

Chaque bloc : **ce que ça fait** → écrans → routes API principales (préfixe `/v1`).

### 3.1 Compte et connexion
- Connexion email + mot de passe (Supabase Auth, côté serveur Next).
- **Invitation** : un admin (club ou plateforme) saisit un email. Si le compte n'existe pas, l'API le crée avec `generateLink` (aucun email Supabase) et envoie l'email Ball Manager « Créer mon mot de passe ». Si le compte existe déjà, la personne reçoit « Nouvel accès ». Une invitation jamais utilisée est renvoyée comme une nouvelle invitation.
- **`/bienvenue`** : la personne choisit son mot de passe ; le lien n'est vérifié qu'à la validation du formulaire (`verifyOtp`), puis elle est connectée et redirigée vers son club.
- **Mot de passe oublié** : `/mot-de-passe-oublie`, même réponse que le compte existe ou non, une demande par minute et par adresse.
- Écrans : `/login`, `/bienvenue`, `/mot-de-passe-oublie`.
- API : `POST /account/password-reset`, `GET /me`.

### 3.2 Plateforme
- Liste des clubs avec état des intégrations (FFBB, FBI, e-Marque), création d'un club avec invitation de son premier admin.
- Page par club : administrateurs, autres membres, « Nommer administrateur » par email, « Retirer » (jamais le dernier admin).
- Maintenance : purge des documents e-Marque stockés, suppression des saisons passées d'un club (irréversible), relance des imports e-Marque en erreur.
- Écrans : `/platform/clubs`, `/platform/clubs/{id}`.
- API : `GET|POST /platform/clubs`, `GET /platform/clubs/{id}/members`, `POST|DELETE /platform/clubs/{id}/admins…`, `POST /platform/maintenance/*`.

### 3.3 Club : réglages, équipes, gymnases, membres
- Réglages : nom, nom court, fuseau horaire, logo, couleur d'accent (branding du club, des emails et de l'espace public).
- Équipes : créées par la synchro FFBB ou à la main, modifiables (nom, catégorie, sexe, numéro, active) ; le sexe désambiguïse les noms (« U15 (F) »).
- Gymnases : salles de la saison en cours (nom, active, ordre d'affichage), utilisées par le planning et les dérogations.
- Rôles du quotidien (coach, coordinateur, admin de l'espace public) : posés par l'admin directement dans la liste **Joueurs**. Comptes de connexion et rôles de l'espace club : API complète (lister, inviter, rôles avec portée par équipe), pilotée depuis la plateforme.
- Écrans : `/admin/settings`, `/admin/teams`, `/admin/gymnases`.
- API : `GET|PATCH /clubs/{id}`, `GET|POST /clubs/{id}/teams`, `PATCH …/teams/{teamId}`, `GET|PATCH …/venues…`, `GET|POST …/members`, `PUT …/members/{id}/roles`, `GET …/capabilities`.

### 3.4 Licenciés et fiches joueurs
- Liste des licenciés : **mise à jour automatique depuis FBI chaque jour** (licences validées, export Excel de « Gestion des licences ») avec un bouton « Mettre à jour depuis FBI », ou dépôt du fichier Excel FBI tel quel ; ajout manuel, suppression ; rattachement aux équipes (glisser-déposer + rattachement automatique par catégorie). Un import n'efface rien et ne modifie jamais nom, email, équipe ou rôles.
- Fiche joueur (club) : identité, contact (admin ou la personne elle-même), photo, tous ses matchs et ses statistiques, lien personnel (admin).
- **Photo** : choisie depuis un fichier (PNG, JPEG…), recadrée et compressée dans le navigateur (WebP 512 px, ~25 Ko), stockée par l'API (512 Ko maximum), l'ancienne photo est supprimée.
- **Fiche publique** : nom, prénom, photo, équipes, chiffres de la saison, meilleur match, prochain match, 10 derniers matchs, tables tenues. Jamais de date de naissance, de coordonnées ni de numéro de licence ; les matchs « à vérifier » sont exclus.
- Écrans : `/joueurs`, `/joueurs/{id}`, `/public/{club}/joueurs/{id}`.
- API : `GET|POST /clubs/{id}/licencies`, `GET|DELETE …/licencies/{lid}`, `PATCH …/profile`, `POST|DELETE …/photo`, `POST …/import`, `POST …/import/file`, `POST …/import/fbi`, `GET …/import/status`, `POST …/auto-assign-teams`, `GET /public/clubs/{slug}/players/{lid}`.

### 3.5 Matchs, compositions et statistiques
- Liste des matchs (filtres équipe, domicile/extérieur, période ; pagination), détail en onglets : Informations, Composition, Statistiques, Officiels, e-Marque.
- **Statistiques** : totaux de l'équipe, « Top 3 marqueurs » en cartes photo, liste des joueurs (points en grand, minutes, tirs, fautes), tableau détaillé repliable ; chaque joueur du club mène à sa fiche (club ou publique).
- Garde-fou de publication : une lecture e-Marque « à vérifier » ou en erreur n'est jamais montrée au public.
- Écrans : `/matchs`, `/matchs/{id}` (club et public).
- API : `GET /clubs/{id}/matches`, `GET …/matches/{mid}`, `GET …/documents`, équivalents `/public/clubs/{slug}/…`.

### 3.6 Résultats et classements
- Résultats groupés par équipe/journée, classements FFBB des poules du club (copiés à chaque synchro).
- Écrans : `/resultats` (club et public).
- API : `GET /clubs/{id}/standings`, `GET /public/clubs/{slug}/standings`.

### 3.7 Tables de marque
- Matchs à domicile par journée (week-end), 4 postes : marqueur, chronométreur, délégué de club, arbitre (« pas besoin d'arbitre » possible).
- **Suggestions expliquées** : priorité aux personnes dont l'équipe joue juste avant/après au même endroit, équité sur la saison ; indisponibles listés avec la raison (conflit de match, déjà affecté ailleurs).
- « **Me positionner quand même** » : un joueur dont l'équipe joue sur le créneau peut s'inscrire ; le conflit reste affiché.
- Espace public avec lien personnel : se positionner / se retirer ; coachs et admins désignent n'importe qui.
- Photo de la fiche dans le rond de chaque affectation et suggestion.
- **Classement** de la saison (tables tenues, ex æquo au même rang), podium du top 3 avec photos, visible de tous.
- Écrans : `/tables`, `/tables/classement`, `/tables/public-access` (club) ; `/public/{club}/tables`, `/public/{club}/tables/classement`.
- API : `GET /clubs/{id}/table-assignments`, `GET …/table-suggestions`, `PUT|DELETE …/table-assignments/{role}`, `PUT …/referee-status`, `…/public-access…`, équivalents publics, `GET /public/clubs/{slug}/table-leaderboard`.

### 3.8 Dérogations
Deux circuits distincts :

**a) Dérogations officielles FBI** (admin) : lecture de **toutes** les dérogations du club sur FBI, une carte par match avec l'horaire officiel actuel, une conclusion (« accepté, horaire retenu », « en attente »…), l'historique chronologique de ce que chaque demande change (date, horaire, salle, inversion), et les demandes remplacées par une plus récente. Filtres dont « Conflits », onglets « À venir » / « Archives ». Réponse à une dérogation adverse, création d'une dérogation officielle. Le détail d'une dérogation n'est relu que si elle est nouvelle ou modifiée.
- Écran : `/admin/derogations`, carte « Dérogation » du match.
- API : `GET /clubs/{id}/derogations`, `POST …/derogations/{did}/respond`, `POST …/matches/{mid}/derogation/check|create`, `POST …/integrations/fbi/check-all-derogations`.

**b) Demandes internes** (coach → coordinateur) : le coach propose un nouveau créneau (disponibilités des gymnases vérifiées), discussion par messages, propositions, statut ; le coordinateur peut déposer la dérogation officielle FBI depuis la demande. Archives repliées et suppression des demandes terminées.
- Écrans : `/derogations`, `/derogations/nouvelle`, `/derogations/{id}` (club et public avec lien personnel).
- API : `/clubs/{id}/derogation-requests…` (contexte, liste, création, détail, messages, actions, propositions, officielle, suppression), `GET …/matches/{mid}/derogation-availability|slot-check`, équivalents publics.

### 3.9 Intégrations FFBB, FBI, e-Marque
- **FFBB** : calendrier, scores, équipes, poules et classements ; synchro manuelle ou planifiée ; historique des passages.
- **FBI** : identifiants chiffrés en base (jamais réaffichés), test de connexion, file de jobs (`fbi_jobs`), rapprochement du calendrier officiel, interrupteur de pause global (`platform_settings.fbi_paused_until`).
- **e-Marque** : téléchargement de la feuille de match, lecture (texte + OCR), compositions, officiels, stats ; contrôle qualité (somme des points = score, maillots en double) ; document purgé après lecture ; suivi match par match et relance.
- **Anomalies** : liste des problèmes à traiter (import en erreur, à vérifier…), résolution manuelle.
- Écrans : `/admin/integrations`, `/admin/integrations/fbi`, `/admin/sync`, `/admin/stats`, `/admin/issues`.
- API : `/clubs/{id}/integrations…` (FBI, FFBB, sync-runs, process-jobs, parse-documents, reconcile-schedule), `GET …/emarque-tracking`, `POST …/emarque-tracking/{mid}/relaunch`, `GET|POST …/issues…`, `GET /jobs/{jobId}`.

### 3.11 Vie d'équipe — entraînements, planning, réponses (Lot 1)
- **Entraînements** : le coach (ou l'admin) indique les créneaux de la semaine en un écran (« Planifier les entraînements », un créneau par ligne, « + Ajouter un créneau ») ; les séances de toute la période sont créées à l'heure locale du club. Modifier un créneau **à partir d'une date** (le passé ne bouge jamais), l'arrêter, annuler ou modifier **une seule séance** (une séance annulée reste visible).
- **Réponses** : Présent·e / Absent·e / Incertain·e en un clic depuis l'accueil public, modifiable jusqu'au début de la séance. Le coach voit les compteurs et la liste nominative ; un parent ne voit jamais les réponses des autres.
- **Accueil « À faire »** (espace public) : en tête de l'accueil, les prochains entraînements à répondre pour chaque enfant / le joueur, le résumé des réponses pour les équipes coachées, « Tout est à jour » sinon. Réponse optimiste, retour en arrière + message si l'envoi échoue.
- **Plusieurs enfants** : un lien personnel par enfant, tous mémorisés sur le téléphone ; l'accueil et le planning les fusionnent. « Ajouter un enfant » n'apparaît que si un autre licencié du club porte le même nom de famille (ou si plusieurs enfants sont déjà sur le téléphone).
- **Mon agenda** (accueil public) : les matchs à coacher / à jouer ET les entraînements, dans une seule liste par jour (badges « Tu coaches » / « Ton équipe », prénom de l'enfant concerné).
- **Planning complet** (depuis « Mon agenda ») : matchs FFBB + entraînements, semaine par semaine, filtres Tout / Matchs / Entraînements (et équipe dans l'espace club).
- Écrans : `/c/{club}/planning`, `/c/{club}/entrainements`, `/public/{club}/planning`, `/public/{club}/entrainements` (coach / admin), bloc « À faire » de `/public/{club}/accueil`.
- API (préfixe `…/team-life`) : `GET|POST /teams/{teamId}/training-series`, `PATCH|DELETE /training-series/{id}`, `GET /trainings`, `GET|PATCH /trainings/{id}`, `POST /trainings/{id}/cancel|restore`, `GET /planning` ; public : mêmes routes `?token=`, `GET /teams/{teamId}/trainings`, `PUT /trainings/{id}/response`, `POST /action-center`, `POST /planning`. Détail : `ball-manager-back/docs/TEAM_LIFE.md`.

### 3.12 Vie d'équipe — disponibilités des matchs et convocations (Lot 2)
- Trois étapes distinctes : **disponible** (« je peux venir »), **convoqué** (« le coach m'a choisi »), **confirmé** (« je confirme »).
- **Demander les disponibilités** (coach de l'équipe / admin, depuis la fiche match) : les familles répondent Disponible / Indisponible / Incertain·e depuis leur accueil. Aucune convocation n'est créée.
- **Préparer la convocation** (3 écrans) : sélection (disponibles présélectionnés et en tête, statut visible, alerte si un indisponible est choisi), rendez-vous (heure avec raccourcis 45 min / 1h / 1h15 avant, lieu obligatoire à l'extérieur, gymnase du match par défaut à domicile, message du coach), **aperçu réel** du message parent / joueur majeur, puis « Envoyer la convocation ».
- **Message personnalisé** : « Convocation pour Lina avec les U15 (F) » pour un parent, « Bonjour Anis » pour un joueur majeur ; à l'extérieur, rendez-vous et lieu du match toujours séparés ; aucune tournure genrée.
- **Accueil des familles** : la convocation telle qu'envoyée, « Je confirme » / « Lina ne pourra pas venir » en un clic.
- **Suivi coach** : convoqués / confirmés / refus / en attente, qui a décliné ; étape suivante de chaque match sur l'accueil (demander, préparer, suivre).
- **Après envoi** : une modification n'est visible qu'après « Envoyer la mise à jour » (heure ou lieu changés → reconfirmation). Match modifié par la FFBB → alerte « Le match a été modifié depuis l'envoi », les familles gardent la version envoyée ; match annulé → plus de confirmation. Envoi dans l'application seulement (pas d'email / SMS en V1).
- Écrans : bloc « Disponibilités et convocation » des fiches match `/c/{club}/matchs/{id}` et `/public/{club}/matchs/{id}` (coach / admin) ; accueil public.
- API (préfixe `…/team-life`) : `GET /matches/{id}`, `POST …/availability/open`, `PUT …/convocation/draft`, `POST …/convocation/preview|send` (deux espaces) ; public : `PUT …/availability/response`, `PUT …/convocation/response`.

### 3.13 Vie d'équipe — lavage des maillots (Lot 3)
- Seule tâche gérée, matchs officiels uniquement. **Le logiciel suggère, le coach décide** (rien n'est attribué automatiquement).
- Fiche match (coach / admin) : bloc « 3. Maillots » → « Choisir » : SUGGÉRÉS (convocation confirmée, convoqués, ou disponibles), puis AUTRES (non convoqués, refus, indisponibles en dernier) ; à situation égale, moins de lavages cette saison d'abord, et on évite la personne du match précédent.
- Libellé : « Parent de Lina Martin » (mineur) ou « Anis Abed » (majeur), jamais de nom de famille inventé. Compteur « 1er lavage cette saison ».
- Famille désignée : carte « Maillots — Vous êtes en charge du lavage des maillots après le match » sur l'accueil, bouton « J'ai vu » ; ligne ajoutée à SA convocation si l'attribution est faite avant l'envoi.
- Coach : « Maillots à attribuer » dans « À faire » pour chaque match des 14 prochains jours (« Fait » une fois attribué).
- API (préfixe `…/team-life`) : `GET /matches/{id}/laundry/suggestions` (lecture seule), `PUT|DELETE /matches/{id}/laundry`, public `POST /matches/{id}/laundry/seen`.

### 3.14 Vie d'équipe — page Équipe (Lot 4)
- Espace club : menu « Équipes » (tout membre) → liste des équipes → page de l'équipe. Espace public : badges « Joue en … » / « Coach … » de l'accueil → page de l'équipe (joueurs de l'équipe et ceux qui la gèrent seulement).
- Onglets : **Vue d'ensemble** (prochain match — coach / admin : état de la convocation, « Gérer le match » ; prochain entraînement ; encadrement), **Planning** (celui de l'équipe), **Effectif** (badge Coach ; « Lien actif » / « Sans lien » pour coach / admin seulement). Pas un CRM.
- API : `GET …/team-life/teams/{id}/overview` (deux espaces) ; planning public filtrable par équipe.
- Rapport complet des Lots 1 à 4 : [`docs/VIE_EQUIPE_RAPPORT.md`](VIE_EQUIPE_RAPPORT.md).
- **Assiduité** (Effectif, coach / admin) : « 2 absences · 1 retard » sur les 8 dernières séances **relevées** (une séance sans relevé ne compte pas).
- **Relance des sans réponse** (fiche match, coach / admin) : « Relancer » marque la relance → « Le coach attend ta réponse » sur l'accueil des personnes concernées ; « Partager le message » (WhatsApp, SMS… depuis le téléphone) ou « Copier le message ». Aucun email / push automatique en V1. API `POST …/team-life/matches/{id}/remind`.
- **Onglet « Équipe »** dans la barre du bas de l'espace public (`/public/{club}/equipes`) : ouvre directement la page de l'équipe, ou la liste si l'appareil en a plusieurs.

### 3.10 Espace public et accueil personnel
- Sans compte : matchs, résultats, classements, fiches joueurs, classement des tables.
- Identification : la personne tape son **prénom et son nom** (ordre libre, fautes tolérées : « ansi abde meriuam » retrouve Anis) ; l'API propose au plus 5 fiches au format « Anis A. », jamais la liste du club. Puis **lien personnel** par email (adresse masquée affichée, rappel « regarde dans tes indésirables »).
- Introuvable : « **Prévenir le club** » (nom, email, message) envoie un email aux administrateurs du club, « Répondre » écrit directement à la personne.
- Accueil personnel : ses équipes (jouées et coachées), prochains matchs, résultats, ses tables à venir.
- API : `GET /public/clubs/{slug}`, `POST …/licencies/search`, `POST …/access-requests`, `POST …/licencies/{lid}/request-link`, `GET …/me`, `GET …/home`. L'ancien annuaire `GET …/licencies` répond `410` depuis le 2026-10-08.

---

## 4. Pages du site et appels API

Appels faits **au chargement** de la page (côté serveur). Les actions (boutons, formulaires) sont listées en dessous.

### Espace club (`/c/{club}`)
| Page | Accès | Appels au chargement |
|---|---|---|
| `/dashboard` | membre | `matches.list`, `derogations.list`, `derogationRequests.context/list`, `issues.list` |
| `/matchs` | membre | `clubs.teams`, `matches.list` |
| `/matchs/{id}` | membre | `matches.get`, `matches.documents`, `matches.derogation`, `derogationRequests.context/list` |
| `/resultats` | membre | `matches.list`, `standings.list` |
| `/joueurs` | membre | `licencies.list`, `clubs.teams` |
| `/joueurs/{id}` | membre | `licencies.get`, `clubs.teams`, `tables.listPublicAccess` (admin) |
| `/tables` | admin, resp. tables | `tables.list` |
| `/tables/classement` | membre | `GET /public/clubs/{slug}/table-leaderboard` |
| `/tables/public-access` | admin | `tables.listPublicAccess`, `tables.claimRequests`, `tables.decideClaimRequest` |
| `/derogations`, `/nouvelle`, `/{id}` | coach, coordinateur, admin | `derogationRequests.context`, `.list`, `.get` |
| `/planning` | membre | `clubs.teams` ; puis `teamLife.planning` (navigateur) |
| `/entrainements` | coach, admin | `clubs.teams` ; puis `teamLife.listSeries/listTrainings`, `derogationRequests.context` (gymnases) |
| `/equipes` | membre | `clubs.teams` |
| `/equipes/{id}` | membre | puis `teamLife.teamOverview`, `teamLife.planning` (navigateur) |
| `/admin/integrations` | admin | `integrations.get`, `clubs.capabilities` |
| `/admin/integrations/fbi` | admin | `integrations.get` |
| `/admin/sync` | admin | `integrations.syncRuns`, `matches.list` |
| `/admin/stats` | admin | `emarqueTracking.list` |
| `/admin/issues` | admin | `issues.list` |
| `/admin/teams` | admin | `clubs.teams` |
| `/admin/gymnases` | admin | `members.venues` (`GET …/venues`) |
| `/admin/derogations` | admin | `derogations.list` |
| `/admin/settings` | admin | (données du club déjà chargées) |

### Plateforme, compte, public
| Page | Appels au chargement |
|---|---|
| `/` (aiguillage) | `GET /clubs`, `GET /platform/clubs` (détecte le platform_admin) |
| `/platform/clubs` | `GET /platform/clubs` |
| `/platform/clubs/{id}` | `GET /platform/clubs/{id}/members` |
| `/login`, `/bienvenue`, `/mot-de-passe-oublie` | aucun (Supabase Auth / `POST /account/password-reset` à l'envoi) |
| `/public/{club}/matchs` | `GET /public/clubs/{slug}`, `…/matches` (paginé), `…/teams` |
| `/public/{club}/matchs/{id}` | `…/matches/{mid}`, `…/documents` |
| `/public/{club}/resultats` | `…/matches`, `…/standings` |
| `/public/{club}/joueurs/{id}` | `…/players/{lid}` |
| `/public/{club}/tables` | `…` puis, avec lien personnel, `…/table-assignments` |
| `/public/{club}/tables/classement` | `…/table-leaderboard` |
| `/public/{club}/accueil` | avec lien personnel : `…/me`, `…/home` |
| `/public/{club}/equipes` | avec lien personnel : `…/home` (chaque lien de l'appareil) |
| `/public/{club}/equipes/{id}` | avec lien personnel : `…/team-life/teams/{id}/overview`, `…/team-life/planning?teamId=` |
| `/public/{club}/derogations…` | avec lien personnel : `…/derogation-requests…`, `…/derogations` |

### Actions (côté navigateur)
| Domaine | Actions et routes |
|---|---|
| Réglages, équipes, gymnases | `clubs.update` (`PATCH /clubs/{id}`), `clubs.createTeam/updateTeam`, `members.updateVenue` |
| Licenciés | `licencies.create/importFile/requestFbiImport/importStatus/remove/autoAssignTeams/updateProfile/uploadPhoto/deletePhoto` |
| Tables | `tables.assign/unassign/suggestions/setRefereeStatus/personalLink/resetPublicAccess` |
| Dérogations FBI | `derogations.respond`, `matches.checkDerogation/createDerogation`, `integrations.checkAllDerogations` |
| Intégrations | `integrations.saveFbi/testFbi/processFbiJobs/parseFbiDocuments/triggerFbiScheduleReconciliation/triggerFfbbSync`, `jobs.pollUntilTerminal`, `emarqueTracking.relaunch`, `issues.resolve` |
| Plateforme | `platform.createClub/grantClubAdmin/revokeClubAdmin/purgeEmarqueDocuments/deleteOldSeasons/retryFailedEmarqueImports` |
| Public (lien personnel) | `request-link`, positionnement tables, demandes de dérogation, réponse aux dérogations, dérogation officielle |

---

## 5. Tâches automatiques

| Quoi | Où | Fréquence | Effet |
|---|---|---|---|
| `fbi-frequent-sync.yml` | GitHub Actions (API) | toutes les 15 min | Synchro FFBB, joignabilité FBI, empile les jobs FBI récurrents, traite la file et lit les e-Marque |
| `/internal/cron/ffbb` | Vercel Cron | 03:00 UTC | Synchro FFBB complète |
| `/internal/cron/fbi-enqueue` | Vercel Cron | 03:15 UTC | Empile les jobs FBI (e-Marque, dérogations, calendrier) |
| `/internal/cron/fbi-jobs` | Vercel Cron | 03:30 UTC | Traite la file FBI |
| `/internal/cron/emarque-parse` | Vercel Cron | 03:45 UTC | Lit les feuilles téléchargées |
| `/internal/cron/fbi-reachability` | appelée par le workflow GitHub | 15 min | Mesure si FBI répond depuis l'API |
| Worker FBI local | Mac du club (`npm run fbi:local-worker`) | en continu, passes espacées | Exécute les jobs FBI avec une seule session ; tient un verrou (`fbi_paused_until`) pour que Vercel ne se connecte pas en parallèle |

Types de jobs FBI (`src/jobs/`) : découverte/téléchargement e-Marque, vérification d'une dérogation, vérification de toutes les dérogations, rapprochement du calendrier, test de connexion.

---

## 6. Données

46 tables (schéma `public`, RLS partout), 78 migrations (`ball-manager-back/supabase/migrations`). Volumes approximatifs au 2026-10-08.

| Domaine | Tables |
|---|---|
| Clubs et accès | `clubs`, `club_memberships`, `membership_roles`, `platform_admins`, `profiles`, `platform_settings`, `licencie_public_tokens` |
| Licenciés, équipes | `licencies` (~183), `teams`, `ffbb_team_engagements`, `competitions`, `pools` |
| Matchs | `matches` (~153), `match_change_history` (~40 000), `venues`, `club_venues`, `club_scheduling_rules` |
| e-Marque et stats | `emarque_imports`, `match_documents`, `match_participants`, `player_match_stats`, `match_coaches`, `match_officials`, `match_table_officials`, `shot_events` |
| Tables de marque | `table_assignments`, `match_referee_overrides` |
| Dérogations | `fbi_derogation_checks` (85), `fbi_derogation_creations`, `fbi_derogation_responses`, `derogation_requests`, `derogation_proposals`, `derogation_messages` |
| FBI technique | `fbi_credentials` (chiffré), `fbi_integration_status`, `fbi_jobs`, `fbi_schedule_discrepancies` (~631), `fbi_reachability_checks`, `fbi_saved_sessions`, `fbi_session_traces`, `fbi_probe_events`, `fbi_probe_tokens` |
| Synchronisation | `sync_runs`, `sync_locks` |
| Diagnostic | `debug_image_captures`, `emarque_debug_cells` |

Stockage : `licencie-photos` (public, 512 Ko max, WebP/JPEG/PNG). Les feuilles e-Marque ne sont pas conservées après lecture.

---

## 7. Emails

Tous envoyés par l'API via Resend, depuis `ball-manager.fr`, avec version texte, sans emoji, raison de l'envoi indiquée.

| Email | Expéditeur affiché | Déclencheur | Lien |
|---|---|---|---|
| Lien personnel | nom du club | « Recevoir mon lien » (espace public) | `/public/{club}/…?token=` |
| Invitation | Ball Manager | admin nommé, membre ajouté, nouveau club | `/bienvenue?token_hash=…&type=invite` |
| Nouvel accès | Ball Manager | rôle ajouté à un compte existant | `/c/{club}/dashboard` |
| Nouveau mot de passe | Ball Manager | « Mot de passe oublié » | `/bienvenue?…&type=recovery` |

Variables : `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` (facultative), `PUBLIC_APP_URL` (`https://www.ball-manager.fr`).

---

## 8. Constats de l'audit

| # | Constat | Gravité | Proposition |
|---|---|---|---|
| A-1 | Contrat OpenAPI annonçait `GET /clubs/{id}/sync-runs` alors que la route est `/integrations/sync-runs` | Faible | **Corrigé** le 2026-10-08 ; l'inventaire généré signale désormais tout écart |
| A-2 | Gestion des membres et rôles côté club : API sans écran dédié | Info | **Couvert** : les rôles du quotidien se posent dans la liste Joueurs (décision du 2026-10-08) |
| A-3 | Routes sans appelant dans le site : `GET /clubs/{id}/emarque-imports`, `POST /clubs/{id}/matches/{mid}/derogation/respond` (doublon de `/derogations/{did}/respond`) | Faible | Garder (outil) ou retirer après vérification |
| A-4 | Nom d'expéditeur des emails de compte affiché « noreply@… » dans Gmail malgré `Ball Manager <…>` dans le code | Moyen | En cours : relire l'en-tête `From:` d'un email reçu |
| A-5 | Accès FBI dépendant du Mac du club (IP Vercel bloquée par FBI) | Élevé | Worker dédié toujours allumé (mini-PC / VPS dont l'IP est acceptée), supervision |
| A-6 | Anti-rafale « mot de passe oublié » en mémoire, par instance | Faible | Limiteur partagé (table ou Redis) si abus constaté |
| A-7 | Recherche d'un compte par email en parcourant les comptes (`listUsers`) | Faible | Fonction SQL dédiée quand le nombre de comptes grandira |
| A-8 | Photos visibles publiquement, joueurs souvent mineurs | Info | **Couvert** : le club fait signer une autorisation de droit à l'image (décision du 2026-10-08) |
| A-13 | Annuaire complet des licenciés lisible sans compte (`GET …/licencies`, risque R-013 de `docs/migration/`) | Élevé | **Corrigé** le 2026-10-08 : recherche prénom + nom (5 résultats max, initiale du nom), ancien endpoint fermé (`410`) |
| A-14 | Revendication d'une fiche sans adresse connue : le lien part à l'adresse saisie sans validation (risque R-018 de `docs/migration/11` §7.9) | Moyen | **Corrigé** le 2026-10-08 : aucun envoi automatique, la demande attend la décision d'un admin (« Demandes à valider » sur `/tables/public-access`, expiration 14 jours, 5 demandes/h par IP) |
| A-9 | Tables de diagnostic encore présentes (`debug_image_captures`, `emarque_debug_cells`, `fbi_probe_*`, `fbi_session_traces`) | Faible | Purge planifiée ou suppression |
| A-10 | `match_change_history` ~40 000 lignes et en croissance | Faible | Rétention (ex. saison en cours) |
| A-11 | Vérification de chaque appel API par aller-retour Supabase Auth (`getUser`) | Faible | Vérification locale du JWT (clés asymétriques) si la latence le justifie |
| A-12 | Membres d'un club : un `platform_admin` n'accède à `/c/{club}` que s'il en est membre | Info | Comportement voulu ; se nommer admin depuis la plateforme |

---

## 9. Feuille de route

Le chantier de migration front → back et ses lots (LOT-02 à LOT-13) sont suivis dans [`docs/migration/00-suivi-progression.md`](migration/00-suivi-progression.md) ; ils ne sont pas répétés ici.

**Maintenant**
- A-4 : nom d'expéditeur « Ball Manager » dans Gmail.
- Valider en réel le parcours invitation → `/bienvenue` → connexion.

**Ensuite**
- A-5 : supervision et redémarrage automatique du worker FBI, demande d'accès officiel à la FFBB.
- Classement des tables : filtres par équipe / période.
- Notifications (email ou push) : table à tenir, dérogation reçue.

**Plus tard**
- A-9, A-10 : nettoyage des données techniques.
- A-6, A-7, A-11 : passage à l'échelle (plusieurs clubs).
- Onboarding self-service d'un nouveau club (paiement, configuration FFBB/FBI guidée).

---

## 10. Journal des évolutions

Les plus récentes d'abord. Historique complet : `git log` des deux dépôts et [`docs/migration/CHANGELOG.md`](migration/CHANGELOG.md).

**2026-10-10**
- Vie d'équipe : assiduité simple dans l'Effectif, relance des sans réponse depuis la fiche match, onglet « Équipe » dans la barre du bas publique.
- Vie d'équipe, Lot 4 : page Équipe (vue d'ensemble, planning, effectif) dans les deux espaces ; menu « Équipes » ; badges de l'accueil cliquables. Rapport final : `docs/VIE_EQUIPE_RAPPORT.md`.
- Vie d'équipe, Lot 3 : lavage des maillots (suggestions équitables, le coach décide, « J'ai vu » côté famille, ligne dans la convocation).
- Vie d'équipe : le coach qui joue dans l'équipe qu'il coache n'est plus interrogé (ni entraînement, ni disponibilité / convocation de match) et ne compte plus dans les « sans réponse ».
- Entraînements : « Dernières séances » (les 2 dernières) pour noter les retards et les absents (présence réelle, distincte de la réponse prévue).
- Vie d'équipe, Lot 2 : disponibilités des matchs, convocations personnalisées (aperçu, envoi dans l'application, confirmations en un clic, mise à jour explicite, alerte si la FFBB modifie le match).

**2026-10-09**
- Vie d'équipe, Lot 1 : entraînements (créneaux de la semaine, séances, annuler / modifier), réponses Présent / Absent / Incertain, accueil public « À faire » (plusieurs enfants sur le même téléphone), planning matchs + entraînements dans les deux espaces.
- Dérogations : emails au coordinateur (lien vers l'espace public) quand un coach fait ou repropose une demande, quand un club adverse demande une dérogation sur FBI, et quand une dérogation reçoit une réponse (une seule fois par événement).

**2026-10-08**
- Joueurs : licenciés importés automatiquement depuis FBI chaque jour (licences validées) + bouton « Mettre à jour depuis FBI » + dépôt du fichier Excel ; fin du copier-coller.
- Espace public : une fiche sans email ne reçoit plus de lien automatiquement ; l'admin approuve ou refuse la demande (R-018, anti-troll).
- Espace public : « retrouve ton nom » par prénom + nom (fautes et ordre tolérés), « Prévenir le club » si introuvable ; annuaire public fermé (R-013).
- Comptes de A à Z : emails Ball Manager (invitation, nouvel accès, mot de passe oublié), pages `/bienvenue` et `/mot-de-passe-oublie`.
- Plateforme : arrivée sur Clubs, page par club pour nommer/retirer les administrateurs.
- Performance : fonctions Vercel à Dublin (à côté de la base), pages déjà vues gardées 30 s.
- Emails : délivrabilité (contenu, lien vers le domaine officiel, Reply-To), rappel « indésirables » dans l'espace public.
- Tables de marque : classement de la saison (podium), photo dans les affectations, « se positionner quand même ».
- Joueurs : photo depuis un fichier (compressée), fiche joueur publique, lien vers la fiche depuis les stats.
- Stats de match : vue mobile (totaux, top 3 marqueurs, liste).
- Dérogations : historique chronologique des changements (date, horaire, salle, inversion), archives, suppression, filtre Conflits.

**2026-10-07**
- Dérogations FBI : une carte par match, lecture complète et ménagée (détail seulement si nouveau ou modifié).
- Worker FBI local avec session persistante ; dérogations et calendrier planifiés chaque jour.
- e-Marque : joueurs adverses jamais rattachés à un licencié du club.
- Migration : sécurité (en-têtes, CSP en Report-Only, jeton en fragment), filtres de matchs côté serveur, réglages via l'API.

**2026-10-06 et avant**
- FBI : file de jobs, pause globale, proxy configurable, diagnostics de connexion.
- e-Marque : récupération déterministe, contrôle qualité, suivi et relance.
- Espace public : lien personnel par email, accueil personnel, demandes de dérogation, classements FFBB.

---

## 11. Tenir ce document à jour

- **Nouvelle route API** : `npm run docs:routes` dans `ball-manager-back` (régénère `docs/API_ROUTES.md` et liste les écarts code/contrat), puis régénérer les types du site (`scripts/generate-api-types.ts`).
- **Nouvelle page ou fonctionnalité** : ajouter une ligne en §3 et §4, une entrée datée en §10.
- **Décision ou dette** : §8 (constat) puis §9 (feuille de route) ; pour la migration front → back, `docs/migration/`.
- Ne jamais écrire de secret, d'adresse email ou de donnée de licencié dans ces documents : le dépôt de l'API est public.
