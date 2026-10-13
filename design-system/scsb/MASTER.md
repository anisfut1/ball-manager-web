# Club Manager — Design System (MASTER)

> Source de vérité visuelle de ball-manager-web. Toute page, tout composant s'y conforme.
> Les surcharges par page, s'il en faut un jour, vont dans `design-system/scsb/pages/<page>.md`
> (convention UI UX Pro Max : le fichier de page prime sur ce MASTER pour cette page uniquement).
>
> Implémentation : tokens CSS dans `src/app/globals.css`, primitives dans `src/components/ui/*`,
> shell dans `src/components/layout/*`, accent club calculé par `src/lib/ui/accent.ts`.

---

## 1. Méthode (UI UX Pro Max)

Généré avec le skill **UI UX Pro Max** (`search.py`, données locales du skill) puis arbitré à la main.
Seuls les résultats vérifiés ont été retenus :

| Requête | Résultat | Décision |
|---|---|---|
| `--design-system "sports club management SaaS…"` | Vibrant & Block-based, rouge, Bebas Neue (profil *fan engagement*) | **Rejeté** — hors sujet (landing grand public, pas une console d'opérations) |
| `--design-system "B2B SaaS operations dashboard premium minimal"` (dials variance 5 / motion 3 / density 7) | Fond clair `#F8FAFC`, pas de dark par défaut, profondeur multi-couches | **Retenu** comme cadre ; glassmorphism limité aux calques de navigation (risque de lisibilité signalé par le skill) |
| `--domain style "layered depth soft shadow card"` | **Dimensional Layering** : élévation 4 niveaux, calques, cartes flottantes | **Retenu** — c'est la base des « cartes 4D » |
| `--domain color "warm neutral ivory premium"` | *Luxury/Premium* : stone `#FAFAF9`, graphite `#1C1917`, bordures `#D6D3D1` | **Retenu** comme base neutre, accent remplacé par l'accent club |
| `--domain typography "editorial premium grotesk"` | Playfair+Inter (éditorial), DM Sans (premium), Space Grotesk (*sports platforms, performance dashboards*) | **Synthèse** : serif éditoriale pour les titres + sans de précision pour l'UI + Space Grotesk pour les chiffres |
| `--domain ux "bottom navigation mobile"`, `"data table responsive mobile"` | back prévisible, nav fixe compensée, tableaux → cartes sur mobile | **Appliqué** au shell et aux tableaux |

Règles prioritaires du skill appliquées partout (Quick Reference §1–§9) : contraste 4.5:1, focus visible,
cibles tactiles ≥ 44px, icônes SVG uniquement, bottom nav ≤ 5 entrées avec libellés, `prefers-reduced-motion`,
tokens sémantiques (jamais de hex brut dans un composant), une seule action primaire par écran.

---

## 2. Philosophie visuelle

**Sport-tech éditorial.** Trois influences, dosées :

- **Chaleur éditoriale** (Claude) : fond pierre chaud, titres en serif, beaucoup d'air, texte graphite.
- **Précision opérationnelle** (Linear / Vercel) : grille stricte, densité maîtrisée, états nets, navigation latérale.
- **Profondeur nouvelle génération** (Fable / Raycast) : surfaces en couches, filets lumineux, halo d'accent contrôlé.

Le **basket** est présent sans cliché : chiffres (scores, heures) en grotesk à fort impact, géométrie
de terrain (arc, raquette, trajectoire) en motif abstrait très discret, jamais de photo, jamais de ballon illustré.

Ce qu'on refuse : template admin, sidebar grise, tout-blanc, gros boutons noirs, néon, cyberpunk,
dégradés arc-en-ciel, glassmorphism illisible, emoji dans l'interface.

---

## 3. Couleurs

### 3.1 Neutres (light mode — prioritaire)

| Token | Valeur | Usage |
|---|---|---|
| `--background` | `#F4F3EF` | fond d'application (ivoire froid / pierre) |
| `--surface` | `#FBFAF8` | panneaux, sidebar, zones secondaires |
| `--surface-raised` | `#FFFFFF` | cartes, champs, popovers |
| `--surface-overlay` | `rgba(255,255,255,0.78)` + blur | topbar, bottom nav, sheets (calques de navigation uniquement) |
| `--surface-muted` | `#ECEAE4` | pistes de segmented control, puits, lignes de tableau survolées |
| `--foreground` | `#17171A` | texte principal — 16:1 sur fond |
| `--muted-foreground` | `#5E5D57` | texte secondaire — 5.9:1 sur fond, ≥ 5.4:1 sur toutes surfaces |
| `--subtle-foreground` | `#807E76` | **non-texte uniquement** (icônes décoratives, séparateurs) — 3.7:1 |
| `--border` | `rgba(23,23,26,0.08)` | filet hairline par défaut |
| `--border-strong` | `rgba(23,23,26,0.14)` | champs, hover |

Jamais `#FFFFFF` comme fond de page : le blanc pur est réservé à la couche la plus haute (carte).

### 3.2 Sémantiques

Toutes ≥ 4.5:1 sur `--surface-raised` et `--background`. Jamais utilisées seules : toujours une icône ou un libellé.

| Token | Texte | Fond doux |
|---|---|---|
| `--success` | `#0F7A4F` | `--success-soft` |
| `--warning` | `#A15C07` | `--warning-soft` |
| `--danger` | `#C2331F` | `--danger-soft` |
| `--info` | `#2563A8` | `--info-soft` |

### 3.3 Accent multi-club

L'accent vient de `club.accentColor` (API). Repli plateforme : **cobalt électrique `#2F5BFF`** (5.2:1 avec texte blanc).

`src/lib/ui/accent.ts` dérive, côté serveur, à partir de n'importe quelle couleur club :

| Variable | Dérivation | Usage |
|---|---|---|
| `--club-accent` | couleur club (ou repli) | fond du bouton primaire, puces actives |
| `--club-accent-ink` | blanc ou `#17171A` selon le contraste | texte posé sur l'accent |
| `--club-accent-text` | accent assombri jusqu'à ≥ 4.5:1 sur le fond | liens, icône active, texte accentué |
| `--club-accent-soft` | `color-mix` 10 % | fond d'élément actif |
| `--club-accent-border` | `color-mix` 28 % | filet d'élément actif / focus |
| `--club-accent-glow` | `color-mix` 22 % | halos (voir §7) |

**Portée** : le shell pose `--club-accent`, `--club-accent-ink`, `--club-accent-text` en style inline
**et** la classe `.accent-scope`. Les dérivés (`soft`, `border`, `glow`, `glow-*`) sont déclarés sous
`:root, .accent-scope` : une variable définie via `var()` est résolue là où elle est déclarée puis
héritée figée — sans ce second sélecteur, les dérivés garderaient la couleur de repli.

**Règle de dosage** : l'accent touche au maximum ~5 % de la surface d'un écran (état actif de la nav,
action primaire, sélection, focus, un détail de hero). Un club rouge n'a jamais une interface rouge.
Un club jaune voit son texte accentué automatiquement assombri.

---

## 4. Typographie

| Rôle | Famille | Pourquoi |
|---|---|---|
| **Display** (titres de page, hero, scoreboard labels) | **Instrument Serif** | chaleur éditoriale, signature « produit premium » |
| **UI / corps** | **Geist** | précision, lisibilité en petite taille, déjà la base du produit |
| **Data** (scores, heures, KPI, eyebrows) | **Space Grotesk**, chiffres tabulaires | énergie sport-tech, chiffres qui ne « dansent » pas |

Échelle (mobile → desktop) :

| Style | Classe | Taille / interligne | Graisse |
|---|---|---|---|
| Display | `.type-display` | 36 → 52 / 1.05, tracking −0.02em | serif 400 |
| Page title | `.type-title` | 28 → 36 / 1.1 | serif 400 |
| Section title | `.type-section` | 15 / 1.4 | sans 600 |
| Card title | `.type-card` | 15 / 1.35 | sans 550 |
| Body | défaut | 15 (16 dans les champs mobile) / 1.55 | sans 400 |
| Metadata | `.type-meta` | 13 / 1.45 | sans 450, `--muted-foreground` |
| Label / eyebrow | `.type-eyebrow` | 11 / 1, tracking 0.08em, capitales | grotesk 500 |
| Badge | `.type-badge` | 12 / 1 | sans 500 |
| Numérique | `.type-numeric` | selon contexte | grotesk 500–600, `tabular-nums` |

Règles : pas de `font-semibold` généralisé ; la hiérarchie vient d'abord de la taille, de l'espace et
du contraste. Les titres courts utilisent `text-wrap: balance`. Les contenus longs (noms de clubs,
adresses, emails) reflowent (`overflow-wrap: anywhere` sur un enfant flex `min-w-0`) plutôt que de casser la mise en page.

---

## 5. Espacement, rayons, tailles

- Rythme 4 / 8 px. Échelle utilisée : 4, 8, 12, 16, 20, 24, 32, 40, 56, 72.
- Gouttières de page : 16 px (mobile) · 24 px (tablette) · 40 px (desktop).
- Rayons : `--radius-sm 8px` (badges, petits contrôles) · `--radius-md 12px` (boutons, champs) ·
  `--radius-lg 16px` (cartes) · `--radius-xl 22px` (hero, sheets) · `full` (pastilles, avatars).
- Contrôles : hauteur 36 px desktop / **44 px minimum** pour toute action tactile importante.
- Icônes : 16 (dense, badges) · 18 (UI courante) · 20 (navigation) — Lucide, trait 1.75.

### Largeurs de contenu

| Type de page | Largeur max |
|---|---|
| Accueil, données (matchs, joueurs, tables, anomalies, plateforme) | `--content-wide` 1320 px |
| Détail (match, joueur) | `--content-default` 1120 px |
| Réglages, formulaires, FBI | `--content-narrow` 880 px |

À 1440/1728 px le contenu reste centré dans la zone principale mais les grilles gagnent des colonnes,
jamais une colonne étroite perdue au milieu.

---

## 6. Élévation (Dimensional Layering)

Quatre niveaux, jamais d'ombre arbitraire :

| Token | Rôle |
|---|---|
| `--shadow-1` | cartes au repos (quasi invisible, diffuse) |
| `--shadow-2` | cartes au survol, contrôles flottants |
| `--shadow-3` | popovers, dropdowns |
| `--shadow-4` | sheets, modales |

### Carte signature (« 4D »)

Empilement, du fond vers l'avant — obtenu uniquement en CSS (`.surface-card`) :

```
fond de page
 └ ombre diffuse ultra légère        (--shadow-1)
   └ filet hairline                  (border --border)
     └ highlight interne 1px blanc   (inset box-shadow, haut de carte)
       └ surface                     (--surface-raised + léger dégradé vertical)
         └ contenu
           └ overlay contextuel      (::before — lueur d'angle accent, opacité 0 au repos)
             └ micro-glow accent     (::after — filet accent, visible au survol / état actif)
```

Survol (pointeur fin uniquement) : filet plus présent, halo accent très léger, translation −1 px,
ombre niveau 2. Rien de spectaculaire. Mobile : état *pressed* (`scale(0.99)`), pas de dépendance au survol.

---

## 7. Glow

Langage unique — trois intensités, toutes dérivées de `--club-accent-glow` :

- `--glow-xs` : anneau 1 px + halo 8 px — focus, sélection discrète
- `--glow-sm` : halo 18 px — hover premium d'une carte interactive
- `--glow-active` : anneau + halo 24 px — élément actif (nav, onglet, segment)

Réservé à : état actif, hover premium, sélection, statut important, focus. Jamais décoratif en masse.

---

## 8. Iconographie

**Lucide** (`lucide-react`, déjà installé) — une seule famille, trait 1.75, jamais d'emoji.
Décoratives → `aria-hidden`. Boutons icône seuls → `aria-label`.

| Concept | Icône |
|---|---|
| Accueil | `House` |
| Matchs | `CalendarDays` |
| Joueurs | `Users` |
| Tables de marque | `ClipboardList` |
| Domicile | `House` |
| Extérieur | `Route` |
| Salle | `MapPin` |
| Heure | `Clock` |
| Score / compétition | `Trophy` |
| Stats | `ChartNoAxesColumnIncreasing` |
| e-Marque | `FileText` |
| FBI | `Database` |
| FFBB / Sync | `RefreshCw` |
| Anomalies | `TriangleAlert` |
| Dérogations | `CalendarClock` |
| Équipes (admin) | `Shield` |
| Intégrations | `Plug` |
| Paramètres | `Settings` |
| Retour | `ArrowLeft` |
| Déconnexion | `LogOut` |
| Profil | `UserRound` |
| Plateforme | `Building2` |

---

## 9. Composants

| Composant | Fichier | Notes |
|---|---|---|
| Button (primary / secondary / outline / ghost / danger, tailles sm/md/lg, `icon`) | `ui/Button.tsx` | primaire = accent club + ink calculé ; jamais noir par défaut |
| IconButton | `ui/Button.tsx` | 36 px desktop, 44 px tactile, `aria-label` obligatoire |
| Card, CardHeader | `ui/Card.tsx` | variantes `default`, `interactive`, `glow`, `muted` |
| StatusBadge | `ui/Badge.tsx` | success/warning/danger/info/neutral/accent + point ou icône |
| Input, Textarea, Select, Field (label + hint + erreur) | `ui/Field.tsx` | focus = anneau accent + glow-xs ; erreurs liées par `aria-describedby` |
| Switch | `ui/Switch.tsx` | `role=switch`, cible 44 px |
| Checkbox | `ui/Field.tsx` | case native teintée `accent-color`, cible 44 px |
| Tabs (liens) | `ui/Tabs.tsx` | soulignement accent + glow ; `aria-current="page"` |
| SegmentedControl (liens) | `ui/SegmentedControl.tsx` | piste `--surface-muted`, pastille active flottante |
| PageHeader, SectionHeader, BackButton | `ui/PageHeader.tsx` | titre serif, eyebrow, actions |
| EmptyState, ErrorState | `ui/States.tsx` | icône en médaillon, titre, texte, action |
| Skeleton | `ui/Skeleton.tsx` | shimmer désactivé en reduced-motion |
| Table | `ui/Table.tsx` | en-tête léger, lignes aérées, pas de quadrillage ; cartes sur mobile quand pertinent |
| Sheet | `ui/Sheet.tsx` | bottom sheet mobile, panneau latéral desktop, piège de focus, Échap |
| ConfirmDialog / `useConfirm` | `ui/Dialog.tsx` | `alertdialog` remplaçant `window.confirm` (même contrat bloquant) |
| Portal | `ui/Portal.tsx` | calques rendus dans `#overlay-root` (hors des contextes d'empilement des cartes) |
| Toast | `ui/Toast.tsx` | confirmation flottante `role=status`, au-dessus de la barre du bas |
| ActionStatus, FormMessage | `ui/ActionStatus.tsx`, `ui/Field.tsx` | retour d'action icône + texte, jamais `alert()` |
| DataList | `ui/DataList.tsx` | métadonnées libellé/valeur, « — » explicite si absent |
| PersonAvatar | `ui/Avatar.tsx` | photo `object-cover` ou initiales |
| Popover | `ui/Popover.tsx` | menus (workspace, compte, filtres), Échap + clic extérieur |
| ClubLogo / TeamLogo | `ui/Logo.tsx` | image `object-contain` sur médaillon, repli monogramme — jamais de faux logo |
| StatCard | `ui/StatCard.tsx` | chiffre grotesk dominant, variations de composition |
| Notice | `ui/Notice.tsx` | bandeau info/warning/danger/success avec icône |
| MatchCard | `features/matches/MatchCard.tsx` | pièce signature — futur (heure dominante) / terminé (score dominant), variantes `row` / `tile` |
| MatchFilters | `features/matches/MatchFilters.tsx` | période segmentée + Lieu (menu) + Équipe (combobox) ; feuille « Filtres » en mobile |
| Scoreboard | `features/matches/detail/Scoreboard.tsx` | fiche match, carte `glow` + motif terrain |
| IntegrationCard | `features/admin/IntegrationCard.tsx` | FFBB / FBI / e-Marque, statut icône + libellé |

---

## 10. Navigation

- **Desktop (≥ 1024 px)** : sidebar fixe 264 px — marque produit, workspace switcher (logo + nom + nom court),
  navigation principale, section Administration (club_admin), carte utilisateur + déconnexion en bas.
  Topbar légère : retour / fil d'Ariane / actions.
- **Mobile / tablette (< 1024 px)** : topbar compacte (logo club + titre) + **bottom navigation** 4 entrées
  (Accueil, Matchs, Joueurs, Menu) avec libellés, `safe-area-inset-bottom` respecté, contenu compensé.
  « Menu » ouvre une bottom sheet (tables, administration, changement de club, profil, déconnexion).
- État actif : surface légèrement éclairée + filet accent + icône accent + texte fort + glow-xs. Jamais un bloc noir.
- `aria-current="page"` sur l'entrée active ; lien d'évitement « Aller au contenu ».
- Plateforme : même shell, marque « Plateforme » et badge distinct — même famille visuelle, identifiable.

---

## 11. Motion

- Durées : 120 ms (feedback), 180 ms (états), 240 ms (entrées de sheet). Sortie ≈ 70 % de l'entrée.
- Propriétés animées : `opacity`, `transform`, `box-shadow`, `border-color` uniquement.
- Courbe : `cubic-bezier(0.2, 0.8, 0.2, 1)` (décélération).
- `prefers-reduced-motion: reduce` → transitions quasi nulles, shimmer et translations désactivés.

---

## 12. Accessibilité (checklist appliquée)

- [ ] Texte ≥ 4.5:1 (vérifié par calcul pour chaque token texte)
- [ ] Focus visible sur tout élément interactif (`:focus-visible` — anneau accent 2 px + glow-xs)
- [ ] Cibles tactiles ≥ 44 px sur mobile, espacement ≥ 8 px
- [ ] Icônes décoratives `aria-hidden`, boutons icône nommés
- [ ] La couleur ne porte jamais seule une information (sévérité, statut, domicile/extérieur → icône + texte)
- [ ] Hiérarchie de titres h1 → h2 sans saut
- [ ] Liens et boutons sémantiques, jamais de `div` cliquable
- [ ] Toasts/retours d'action en `role="status"` / `aria-live`, erreurs en `role="alert"`
- [ ] `prefers-reduced-motion` respecté
- [ ] Pas de scroll horizontal involontaire à 375 px

---

## 13. Anti-patterns (refus explicites)

Template admin générique · shadcn non personnalisé · 50 cartes identiques · gros boutons noirs ·
néon / RGB / fond spatial · glassmorphism sur le contenu · `alert()` navigateur pour un retour
d'action · emoji comme icône · `rounded-[17px]`, `shadow-[…]`, `text-[#…]` dispersés dans les pages ·
fausses fonctionnalités · données inventées.
