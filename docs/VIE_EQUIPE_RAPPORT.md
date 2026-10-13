# Vie d'équipe — rapport final (Lots 1 à 4)

Bloc demandé par le club le 2026-10-09. Il couvre le planning, les présences prévues, les convocations, le lavage des maillots et la page Équipe. Rien d'autre : pas de covoiturage, de chat, de sondages, de cotisations ni de SMS.

La référence technique détaillée est dans `ball-manager-back/docs/TEAM_LIFE.md`. Les écrans sont décrits dans `docs/FONCTIONNALITES.md` (§3.11 à §3.14).

Tous les prénoms cités ici sont des exemples fictifs.

## Audit existant

**Ce qui existait déjà**
- Licenciés (`licencies`) avec `team_id`, `birth_date`, `public_coach` et `coached_team_ids`.
- Lien personnel par licencié (`licencie_public_tokens`).
- Comptes club avec rôles (`club_admin`, `coach`…).
- Matchs FFBB synchronisés dans `matches`.
- Gymnases du club (`club_venues`).
- Tables de marque, avec le principe « le logiciel suggère, le coach décide ».

**Ce qui manquait**
- Les entraînements.
- Les réponses de présence.
- Les disponibilités et les convocations de match.
- Le lavage des maillots.
- Une page par équipe.

**Règle d'architecture**
- Aucune donnée métier n'est lue ou écrite directement depuis ball-manager-web vers Supabase : tout passe par `ball-manager-back`.
- Toutes les migrations sont dans l'API.

## User ↔ licencie model

Il n'y a pas de compte parent ou joueur. L'identité est le **lien personnel** d'un licencié, et non un `user`. Ce choix a été fait par le club le 2026-10-09.

- **Comptes club** (Supabase Auth, `user_roles`) : le club_admin voit toutes les équipes ; un coach voit ses équipes.
- **Lien d'un admin désigné** (`public_admin`) : toutes les équipes.
- **Lien d'un coach** (`public_coach`) : uniquement les équipes listées dans `coached_team_ids`.
- **Tout autre lien** : agit seulement pour **son** licencié et **son** équipe, même si l'identifiant d'un autre licencié est connu.

## Parent / Player handling

- Pour un mineur, c'est le parent qui détient le lien de l'enfant.
- **Mineur ou âge inconnu** : textes adressés au parent (« Convocation pour Lina », « Merci de confirmer la présence de Lina »).
- **Majeur** : tutoiement (« Bonjour Hugo, … Merci de confirmer ta présence »).
- Le genre n'est jamais déduit du prénom.
- **Plusieurs enfants sur un téléphone** : l'appareil garde plusieurs liens. La Home les envoie tous en une seule fois, dans le corps de la requête et jamais dans l'URL. Chaque action indique l'enfant concerné.
- « Ajouter un enfant » n'apparaît que si un homonyme de nom de famille existe dans le club, ou si plusieurs personnes sont déjà enregistrées sur l'appareil.

## Trainings model

Tables, avec RLS activée et sans policy (accès uniquement par l'API) :

| Table | Contenu |
|---|---|
| `training_series` | Créneau récurrent : jour, heures, gymnase du club ou lieu libre, période. |
| `training_occurrences` | Séances : `scheduled` / `cancelled`, `is_modified`. |
| `training_responses` | Réponses prévues de la famille. |
| `training_attendance` | Présence réelle relevée par le coach : PRESENT / LATE / ABSENT. |

## Recurrence

- Une séance par semaine, à l'heure locale du club. 19:00 reste 19:00 au changement d'heure.
- Fonction pure et testée : `recurrence.ts`.
- **Modifier « à partir du »** : la série est coupée en deux et le passé ne bouge pas.
- Une séance modifiée à la main n'est jamais écrasée.
- **Supprimer un créneau** : les séances futures sans réponse sont supprimées. Celles qui ont déjà des réponses sont **annulées** (visibles comme telles) et non supprimées.

## Training responses

- Présent / Absent / Incertain, en un clic depuis la Home, jusqu'à la fin de la séance.
- Changer d'avis remplace la réponse.
- Le coach de l'équipe n'est jamais interrogé et n'est pas compté.
- Les 2 dernières séances passées permettent au coach de noter les retards et les absents.

## Match availability

- Le coach demande les disponibilités (`match_availability_requests`). Cela ne convoque personne.
- Les familles répondent Disponible / Indisponible / Incertaine (`match_availability_responses`).
- **Disponible, convoqué et confirmé sont trois notions distinctes.**

## Convocation model

`match_convocations` porte deux versions et un numéro de révision :
- un brouillon (`draft_*`), jamais visible des familles ;
- une version envoyée (`sent_*` + `match_snapshot`).

Tables liées :
- `match_convocation_recipients` : statut de chaque convoqué ; un convoqué retiré garde son historique (`removed_at`).
- `match_convocation_dispatches` : le message rendu, gardé tel qu'envoyé.

## Convocation statuses

- **PENDING → CONFIRMED / DECLINED.**
- Une mise à jour qui change l'heure, le rendez-vous ou le match remet les réponses en PENDING.
- **Match annulé, reporté ou commencé** : plus de confirmation possible (409 `MATCH_CLOSED`). La convocation reste en historique.

## Personalized message

Ces exemples sont produits par `renderConvocationMessage`, avec des données fictives.

**Parent / enfant (domicile, avec maillots)**
```
Bonjour,

Convocation pour Lina avec les U15 (F).

Match :
U15 (F) contre Agde BC
Samedi 17 octobre à 18:00

Rendez-vous :
17:15
Gymnase du club

Message du coach :
« Pensez aux gourdes. »

Maillots :
Vous êtes en charge du lavage des maillots après le match.

Merci de confirmer la présence de Lina.
```

**Joueur senior**
```
Bonjour Hugo,

Convocation pour le match :

Match :
Seniors (M) contre Agde BC
Dimanche 18 octobre à 20:30

Rendez-vous :
19:30
Gymnase du club

Merci de confirmer ta présence.
```

**Match à l'extérieur**
```
Bonjour,

Convocation pour Lina avec les U15 (F).

Match :
U15 (F) contre Montpellier
Samedi 24 octobre à 16:00
Match à l'extérieur

Rendez-vous :
14:45
Parking du gymnase du club

Lieu du match :
Salle adverse
2 avenue Exemple, Montpellier

Merci de confirmer la présence de Lina.
```

## Meeting time / place

- **Heure de rendez-vous** : `timestamptz`, dans le fuseau du club.
- **Lieu de rendez-vous** : texte libre, ou un gymnase du club.
- **À domicile** : par défaut, le gymnase du match.
- **À l'extérieur** : le lieu de rendez-vous est obligatoire (l'envoi est bloqué sans lui). Il est toujours distinct du lieu du match.

## Match change after dispatch

- `matchChanges` (DATE, VENUE, STATUS) compare la photo prise à l'envoi au match FFBB actuel.
- Le message déjà envoyé n'est **jamais** corrigé en silence. Le coach voit une alerte, puis « Envoyer la mise à jour ».
- Le coach voit aussi `matchChanged` dans « À faire ».

## Laundry

- Une affectation par match et par équipe (`match_laundry_assignments`), matchs officiels uniquement.
- **Le logiciel suggère, le coach décide.** Lire les suggestions n'écrit rien.
- **Personne désignée** : une carte « Maillots » sur sa Home avec le bouton « J'ai vu ». La ligne « Maillots » est ajoutée à **sa** convocation seulement, si l'affectation est faite avant l'envoi.

## Laundry suggestion fairness

Ordre des suggestions :
1. Les personnes concernées par le match : convocation confirmée, puis convoquées ; sans convocation, les disponibles.
2. Ensuite, les sans réponse.
3. Les non convoqués, les refus et les indisponibles n'apparaissent jamais en tête.
4. À situation égale : le moins de lavages **réels** cette saison d'abord (les suggestions ne comptent pas).
5. Puis on évite la personne du match précédent.

## Action Center

`POST /public/clubs/{slug}/team-life/action-center` reçoit tous les liens de l'appareil et renvoie :

| Action | Pour qui |
|---|---|
| `TRAINING_RESPONSE` | Joueur ou parent : réponse attendue à un entraînement. |
| `MATCH_AVAILABILITY` | Joueur ou parent : disponibilité à donner. |
| `CONVOCATION_RESPONSE` | Joueur ou parent : convocation à confirmer. |
| `LAUNDRY_DUTY` | Personne désignée pour les maillots. |
| `COACH_TRAINING_SUMMARY` | Coach : résumé de la prochaine séance. |
| `COACH_MATCH` | Coach : étape suivante du match, tables de marque X/Y, maillots. |

Tri : réponses attendues, puis convocations et maillots, puis tâches du coach. Les éléments faits restent visibles, en vert et grisés, avec la mention « Fait ».

## Coach Home

- « À faire » pour le coach :
  - présences de la prochaine séance ;
  - pour chaque match, l'étape suivante : demander les disponibilités, préparer la convocation, suivre les confirmations ;
  - les tables de marque des matchs à domicile, tant qu'elles ne sont pas complètes ;
  - les maillots à attribuer.
- Bouton « Voir mon planning ».
- Le coach n'est jamais interrogé sur sa propre équipe.

## Parent Home

- « Lina — entraînement mardi 19h » avec Présente / Absente / Incertaine.
- Puis « Match samedi — Lina est-elle disponible ? ».
- Puis la convocation reçue (Je confirme / Je ne peux pas venir).
- Plusieurs enfants sur le même téléphone : une seule liste, avec le prénom sur chaque action.

## Player Home

- Les mêmes actions, au tutoiement.
- « Mon agenda » regroupe matchs et entraînements.
- Tables de marque : « X tables réalisées cette saison, clique pour te positionner ».
- Derniers résultats, avec « Voir le détail du match ».
- Les badges « Joue en … » et « Coach … » mènent à la page Équipe.

## Team pages

`/c/{club}/equipes` (liste), `/c/{club}/equipes/{id}` et `/public/{club}/equipes/{id}` ont trois onglets :

- **Vue d'ensemble**
  - Prochain match. Coach ou admin : état de la convocation et des disponibilités, et lien « Gérer le match ».
  - Prochain entraînement, avec les compteurs pour le coach.
  - Encadrement.
- **Planning** : celui de l'équipe, semaine par semaine.
- **Effectif** : membres, badge Coach. Coach ou admin uniquement : statut « Lien actif » / « Sans lien ».

Accès dans l'espace public : les joueurs de l'équipe et ceux qui la gèrent (sinon 403 `TEAM_MEMBER_REQUIRED`). La page n'est jamais un annuaire ouvert.

## RLS

- Toutes les nouvelles tables ont la RLS **activée sans policy** : aucun accès direct par la clé anon ou par une session utilisateur.
- L'API, côté serveur, applique les droits à chaque appel. Les identités sont déduites du contexte (compte ou lien), jamais du corps de la requête.

## Multi-tenancy

- Chaque table porte `club_id`, et chaque requête filtre sur le club du contexte.
- Les liens publics sont résolus par club (`slug`). Un lien d'un autre club est refusé.

## API routes

Les 18 routes « Vie d'équipe » sont listées dans `ball-manager-back/docs/TEAM_LIFE.md` (§ Routes) et dans `docs/API_ROUTES.md` (170 routes au total, 0 écart avec l'OpenAPI).

Elles existent dans les deux espaces :
- `/v1/clubs/{clubId}/team-life/…` (compte) ;
- `/v1/public/clubs/{slug}/team-life/…?token=` (lien personnel).

## OpenAPI

- Toutes les routes sont enregistrées dans `src/openapi.ts`.
- Les types ball-manager-web sont régénérés depuis ce schéma (`src/lib/api/generated/schema.ts`).

## Mobile

- Conçu mobile d'abord : une colonne, réponses en un clic, gros boutons.
- Vérifié visuellement en 390 px et 1440 px avec Playwright, sur des pages d'aperçu à données fictives.
- Application installable (PWA) livrée en parallèle.

## Tests backend

- Vitest : **876 tests, 87 fichiers, tous verts** au dernier lancement.
- Couverture « Vie d'équipe » : récurrence, entraînements, convocations, rendu du message, maillots, page Équipe.
- `src/integrations/fbi/browser-client.test.ts` (sans rapport avec ce bloc) bloque au lancement de Chromium dans cet environnement d'exécution. Il est exclu du lancement complet ; il passait plus tôt le même jour et son code n'a pas changé.

## PostgreSQL tests

- Pas de suite automatisée sur une vraie base PostgreSQL.
- Les tests passent par un faux client Supabase en mémoire (`fake-club-supabase.ts`), avec contraintes d'unicité.
- Les migrations ont été appliquées sur le projet Supabase.

## Tests frontend

- Vitest + Testing Library : Home « À faire » (plusieurs enfants, coach, tables, maillots, « Fait »), page Équipe et navigation.

## Build backend

`npm run build` (tsc) : OK.

## Build frontend

`npm run build` (Next.js) : OK. TypeScript, ESLint et Vitest : **308 tests, 37 fichiers, tous verts**.

## Git backend

`anisfut1/ball-manager-back`, branche principale :
- `9910741`, `5c0708b` : retours du club ;
- `e9cf079` : Lot 3 ;
- `9cb736f` : Lot 4.

## Git frontend

`anisfut1/ball-manager-web` :
- `0883812`, `3a00a19`, `22fe2c1`, `a4c6844` : retours du club ;
- `34c8291` : Lot 3 ;
- puis le commit du Lot 4.

## Limitations V1

- Aucune notification externe (email, push, SMS) pour les convocations : tout se passe dans l'application.
- Pas de statistique d'assiduité.
- Pas d'historique des changements de réponse.
- Maillots : pas de suivi « lavé / rendu », seulement « J'ai vu ».
- Pas de compte parent : la Home fusionne les liens enregistrés sur l'appareil.
- Il n'y a pas de test PostgreSQL de bout en bout.
