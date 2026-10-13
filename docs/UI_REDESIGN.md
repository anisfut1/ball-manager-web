# Refonte UI/UX — inventaire et suivi

Source de vérité visuelle : [`design-system/scsb/MASTER.md`](../design-system/scsb/MASTER.md).
Périmètre : frontend uniquement. Aucune route, aucun contrat API, aucune logique métier modifiés
(seul ajout côté client API : `api.me()` pour lire `GET /v1/me`, déjà exposé par ball-manager-back,
afin d'afficher le `displayName` réel au lieu de l'email).

Inventaire établi à partir de `src/app/**` (page/layout/error/not-found/loading) et des composants
réellement importés par chaque route — pas depuis une liste supposée.

## Routes

Légende : **R** = redesign effectué · **M** = largeurs réellement vérifiées en capture (Playwright/Chromium, données de démonstration servies par un faux backend local — jamais dans le repo)

### Racine et authentification

| Route | Fichiers | Composants | R | M |
|---|---|---|---|---|
| `/login` | `app/login/page.tsx` | `features/auth/LoginForm` | [x] | 390 · 1440 |
| `/` (sélection de club) | `app/page.tsx` | — | [x] | 390 · 1440 |
| erreur globale | `app/error.tsx` | — | [x] | — (non déclenchée) |
| 404 globale | `app/not-found.tsx` | — | [x] | 390 |
| chargement | `app/loading.tsx` *(nouveau)* | `Skeleton` | [x] | — (transitoire) |

### Espace club — `/c/[clubSlug]/*`

| Route | Fichiers | Composants | R | M |
|---|---|---|---|---|
| layout club | `c/[clubSlug]/layout.tsx` | AppShell, Sidebar, MobileNav, WorkspaceSwitcher | [x] | 390 · 768 · 1440 |
| chargement club | `c/[clubSlug]/loading.tsx` *(nouveau)* | `Skeleton` | [x] | — (transitoire) |
| Accueil | `c/[clubSlug]/dashboard/page.tsx` | KPI réels (week-end, à venir, anomalies, dérogations), prochains matchs, derniers résultats | [x] | 390 · 768 · 1440 |
| Matchs | `c/[clubSlug]/matchs/page.tsx` | FilterBar, MatchCard, `HomeMatchesAgenda` | [x] | 390 · 768 · 1440 |
| Détail match | `c/[clubSlug]/matchs/[id]/page.tsx` | Scoreboard, Tabs, `DerogationCard`, `CreateDerogationAction`, `RespondToDerogationAction` | [x] | 390 · 768 · 1440 |
| Joueurs | `c/[clubSlug]/joueurs/page.tsx` | `RosterBoard`, `ImportLicenciesPanel` | [x] | 390 · 1440 |
| Fiche joueur | `c/[clubSlug]/joueurs/[licencieId]/page.tsx` | `LicencieProfileEditForm` | [x] | 390 · 1440 |
| Tables de marque | `c/[clubSlug]/tables/page.tsx` | `DaySummary`, `TablesBoard`, `TableMatchCard`, `TableAssignmentSlot`, `TableSuggestionsSheet` | [x] | 390 · 768 · 1440 |
| Accès publics tables | `c/[clubSlug]/tables/public-access/page.tsx` | `PublicLinkBanner`, `PublicAccessList` | [x] | 390 · 1440 |

### Administration club — `/c/[clubSlug]/admin/*`

| Route | Fichiers | Composants | R | M |
|---|---|---|---|---|
| layout admin | `admin/layout.tsx` | garde d'accès uniquement (nav déplacée dans la sidebar) | [x] | 390 · 768 · 1440 |
| Intégrations | `admin/integrations/page.tsx` | IntegrationCard FFBB/FBI/e-Marque, `TriggerFfbbSyncButton` | [x] | 390 · 1440 |
| FBI | `admin/integrations/fbi/page.tsx` | `FbiCredentialsForm`, `TestFbiConnectionButton`, `ProcessFbiJobsButton`, `ParseFbiDocumentsButton`, `ReconcileFbiScheduleButton`, `CheckAllDerogationsButton` | [x] | 390 · 1440 |
| Synchronisation | `admin/sync/page.tsx` | monitoring par source, statuts e-Marque | [x] | 390 · 1440 |
| Anomalies | `admin/issues/page.tsx` | `ResolveIssueButton` | [x] | 390 · 1440 |
| Dérogations | `admin/derogations/page.tsx` | `DerogationsList`, `RespondToDerogationAction` | [x] | 768 · 1440 |
| Équipes | `admin/teams/page.tsx` | `TeamsManager` | [x] | 390 · 1440 |
| Paramètres | `admin/settings/page.tsx` | `ClubSettingsForm` | [x] | 390 · 1440 |

### Plateforme — `/platform/*`

| Route | Fichiers | Composants | R | M |
|---|---|---|---|---|
| layout plateforme | `platform/layout.tsx` | AppShell variante plateforme | [x] | 768 · 1440 |
| Clubs | `platform/clubs/page.tsx` | table premium / cartes mobile, `CreateClubForm`, `MaintenanceActions` | [x] | 768 · 1440 |

### Vue publique sans compte — `/public/[clubSlug]/*`

| Route | Fichiers | Composants | R | M |
|---|---|---|---|---|
| Shell public | `public/[clubSlug]/layout.tsx` | `PublicShell` (onglets ≥ lg, barre du bas < lg), `PublicIdentityProvider`, `PublicAccountChip` | [x] | 390 · 1440 |
| Résultats publics | `public/[clubSlug]/resultats/page.tsx` | `ResultsView` (par équipe, `?equipe=`), `StandingsTable` (classement FFBB), MatchCard | [x] | 360 · 390 · 1440 |
| Matchs publics | `public/[clubSlug]/matchs/page.tsx` | MatchesView, MatchCard | [x] | 390 · 1440 |
| Détail match public | `public/[clubSlug]/matchs/[id]/page.tsx` | Scoreboard, Tabs | [x] | 390 |
| Tables publiques | `public/[clubSlug]/tables/page.tsx` | `PublicTablesApp`, `IdentifyView`, `BoardView`, `PublicMatchCard` | [x] | 390 |
| Dérogations publiques | `public/[clubSlug]/derogations/page.tsx` | `PublicDerogationsApp`, `IdentifyView`, `DerogationsList` (lecture seule) — licenciés admins du club uniquement | [x] | 390 · 1440 |

## Composants partagés

| Ancien | Nouveau |
|---|---|
| `components/nav/AppHeader.tsx` | remplacé par `components/shell/*` (AppShell, Sidebar, Topbar, MobileChrome, WorkspaceSwitcher, UserMenu) |
| `components/nav/ClubSwitcher.tsx` (`<select>` natif) | remplacé par `components/shell/WorkspaceSwitcher.tsx` |
| `components/ui/Card.tsx` (carte unique sans variante) | réécrit : `Card`, `CardHeader`, variantes `default` / `interactive` / `glow` / `muted` |
| `components/ui/Sheet.tsx` | réécrit sur les tokens, bottom sheet mobile + panneau desktop, rendu via `Portal` (#overlay-root) |

## Fonctionnalités non concernées

Aucune route supprimée ni ajoutée côté produit. Les modules futurs (disponibilités, etc.) n'apparaissent
nulle part dans la navigation tant qu'ils n'existent pas.


## Revue visuelle — corrections de la 2e passe

| Constat (capture) | Correction |
|---|---|
| Sheet/modale ouverte depuis une carte recouverte par les cartes suivantes et la barre du bas (contexte d'empilement de `.surface-card`) | `ui/Portal.tsx` : rendu dans `#overlay-root` (posé par l'AppShell, hérite de l'accent) |
| `soft` / `border` / `glow` restaient bleus pour un club à accent orange (variables dérivées résolues sur `:root`) | dérivés recalculés sous `:root, .accent-scope` ; `accent-scope` posé par le shell |
| Libellés de bouton longs débordant de la carte en 390 px | boutons md/lg en hauteur minimale, libellé autorisé sur 2 lignes |
| Noms d'équipe tronqués trop tôt dans la MatchCard mobile | 2 lignes autorisées, rail de date et heure resserrés en mobile |
| Monogramme côté club tiré du nom d'équipe (« U1 ») | monogramme du club (identité), nom d'équipe conservé en texte |
| Bords gauches différents selon la largeur de page | conteneurs alignés à gauche dans le shell (≥ lg) |
| Tuile horaire « 16:00 » à l'étroit (tables) | tuile élargie |
| Focus clavier pouvant passer sous la topbar / la barre du bas (WCAG 2.4.11) | `scroll-padding` sur `html` |
| Clavier mobile ouvert d'office dans la feuille Filtres | autofocus de la recherche d'équipe désactivé dans la feuille |
