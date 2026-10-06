# Ball Manager — film produit (Remotion)

Film de 67 s (1920×1080, 30 i/s) pour le site, LinkedIn, les présentations aux clubs et les démos commerciales.

**Le film n'a pas de fausse interface.** Tout ce qui apparaît « dans l'app » est rendu par les
composants de `../src`, importés tels quels :

| Ce qu'on voit | Composant réel |
|---|---|
| Shell, Sidebar, Topbar, navigation par rôle | `AppShell`, `Sidebar`, `Topbar`, `buildClubNav` |
| Logo | `src/app/icon.png` (le même visuel que `BrandMark` / favicon) |
| Dashboard | `StatCard`, `MatchCard`, `DashboardRequestsCard`, `QuickLink`, `PageContainer`, `SectionHeader` |
| Matchs | `PageHeader`, `MatchFilters`, `JourneePicker`, `HomeMatchesAgenda` (colonnes Clavel / Lido), `MatchCard` |
| Tables de marque | `DaySummary`, `TableMatchCard`, `TableAssignmentSlot`, `Sheet`, `CandidateRow`, `UnavailableRow`, `SectionTitle`, `Toast`, `Skeleton` |
| Dérogations — coach sur mobile | `AppShell` en viewport mobile (`MobileChrome` : topbar + barre du bas), `Stepper`, `MatchHeadline`, `VenuePlanning`, `SummaryItem`, `Footer`, `Field`/`Textarea`, `Notice`, `RequestThread` |
| Dérogations — coordinateur sur desktop | `RequestSections` / `RequestCard`, `RequestThread` (« Je m'en occupe », demande officielle FBI), `Toast` |
| Fiche joueur | `BackButton`, `PersonAvatar`, `StatusBadge`, `Table` / `Th` / `Td`, `formatSecondsPlayed` |
| Tout est connecté | `IconMedallion`, icônes de `NAV_ICONS`, classe `.surface-card`, `.court-pattern` |

Les tokens (couleurs, ombres, rayons, typo) viennent de `src/app/globals.css`, synchronisé
automatiquement (`scripts/sync-globals.mjs`) : changer le design system de l'app change le film.
Les données de démo (`src/data/demo.ts`) sont typées avec les vrais DTO de l'API : si le contrat
change, `npm run typecheck` casse.

## Commandes

```bash
cd video
npm install
npm run studio     # prévisualisation interactive
npm run render     # → out/ball-manager.mp4 (H.264, CRF 16)
npm run typecheck
```

Remotion a besoin de Chromium : `remotion.config.ts` pointe vers le headless shell Playwright
(`/opt/pw-browsers/...`). Ailleurs, supprimez `setBrowserExecutable` (Remotion télécharge le sien).

## Structure

```
video/
  remotion.config.ts       alias @/ → ../src, shims Next.js, Tailwind v4
  scripts/                 sync-globals (tokens de l'app), make-sfx (sons synthétisés)
  public/sfx/              kit sonore généré
  src/
    compositions/          BallManagerFilm (orchestration), timeline, piste caméra, Probe
    scenes/                S01Chaos … S08End (une scène = un temps du storyboard)
    components/            Camera, ProductShell (le vrai AppShell), Caption, Cursor, Soundtrack…
    transitions/           (les transitions sont portées par l'UI : voir ci-dessous)
    shims/                 next/link, next/image, next/navigation, Server Actions → inertes
    data/demo.ts           club SC Sète Basket, week-end du 10–11 octobre 2026
    theme.ts               easings, ressorts, polices (aucune easing linéaire)
```

### Le mobile, pour de vrai

`components/MobileViewport.tsx` rend les composants réels dans une iframe de 390 px : la largeur du
viewport y est celle d'un téléphone, donc les breakpoints Tailwind de l'app s'appliquent réellement
(barre de navigation du bas, topbar mobile, planning des gymnases empilé). Le document de l'iframe
défile pour de vrai (les éléments `sticky` de l'app — pied du wizard, compositeur — se comportent
comme sur l'appareil). Le boîtier (`PhoneFrame`) n'est qu'un habillage neutre.

### Transitions par les composants

- **02 → 03** : la tuile du logo s'envole et atterrit au pixel près sur la marque de la Sidebar réelle.
- **03 → 04** : le curseur clique « Matchs » dans la vraie Sidebar (l'état actif change pour de vrai).
- **04 → 05** : plongée dans la tuile U15 M – Agde → raccord flou sur sa carte Tables de marque.
- **05 → 05b** : l'app desktop s'efface, le téléphone du coach monte dans le cadre.
- **05b** : la demande quitte le téléphone et arrive dans la boîte du coordinateur ; quand il clique
  « Je m'en occupe », le téléphone du coach se met à jour au même instant.
- **05b → 06** : raccord flou vers la fiche joueur.
- **06 → 07** : l'app recule et devient un objet ; les modules s'y branchent puis y rentrent.

## Caler la caméra

Les repères (`ANCHORS` dans `compositions/camera-track.ts`) sont mesurés sur l'app réelle :

```bash
npx remotion still src/index.ts Probe out/probe.png --props='{"page":"tables"}'
```

L'image montre chaque élément ciblé encadré, avec ses coordonnées. Pages : `dashboard`,
`matches`, `tables`, `sheet`, `player`. Les « taps » du téléphone (`S05bDerogations.tsx`) sont en
coordonnées du viewport mobile.

## Ce qui n'est volontairement PAS montré

Le film ne montre que ce que le produit fait réellement :
- pas de « compétence e-Marque » dans les suggestions de tables : le moteur actuel n'utilise pas ce
  critère (raisons réelles : match suivant/précédent à domicile, même salle, nombre de tables) ;
- pas d'écran de présences ni de graphique dans la fiche joueur : le graphique « points par match »
  et les compteurs de la scène 06 sont un habillage du film, posé hors de l'app, calculé sur les
  lignes du tableau réel.
