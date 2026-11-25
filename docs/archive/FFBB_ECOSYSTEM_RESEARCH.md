# Spike technique — Écosystème FFBB (API publique / FBI / e-Marque)

> Statut : recherche technique (spike), historique — conservé tel quel.
> L'intégration FFBB réelle vit désormais dans
> [ball-manager-back](https://github.com/anisfut1/ball-manager-back)
> (`integrations/ffbb/`, voir son `docs/FFBB.md`), pas dans ce repository —
> voir `docs/MIGRATION_TO_API.md`.
> Club : SC Sète Basket — identifiant FFBB `OCC0034008`.

## Méthodologie et limite importante de cet environnement

Cette recherche a été menée avec deux types de sources :

1. **Recherche documentaire officielle** (via un outil de recherche web) sur `ffbb.com`, `ancien.ffbb.com`, les PDF officiels FFBB (manuels e-Marque, guides OTM, présentations FBI...).
2. **Lecture du code source de 3 bibliothèques clientes open source indépendantes** (auteurs différents, écosystèmes différents — Python ×2, TypeScript ×1) qui consomment l'API publique FFBB en production, avec du **monitoring automatisé** de cette API par l'une d'elles. Utilisées comme **source secondaire**, jamais comme source de vérité : chaque affirmation issue de ces sources est marquée comme telle ci-dessous.

**Limite technique rencontrée et à signaler clairement :** l'environnement d'exécution de ce spike **bloque au niveau réseau** tous les domaines `*.ffbb.com` et `*.ffbb.app` (politique d'egress de l'environnement — confirmé via le proxy : `connect_rejected`, `gateway answered 403 to CONNECT (policy denial)`). Il n'a donc **pas été possible d'exécuter le moindre appel réel** vers l'API publique, `competitions.ffbb.com` ou `extranet.ffbb.com` depuis cet environnement, ni de récupérer un exemple réel de réponse pour `OCC0034008`.

Conséquence assumée : plutôt que d'inventer un exemple de réponse (explicitement interdit par la demande), **ce document documente la forme exacte des requêtes et des champs** (confirmée par le code source de 3 clients indépendants qui, eux, fonctionnent réellement en production), et indique précisément quelle commande exécuter pour obtenir un vrai exemple **dès que ce spike sera repris depuis un environnement avec accès réseau normal** (poste de développeur, CI, Vercel...). Un script prêt à l'emploi est fourni dans `spikes/ffbb-ecosystem/`.

Toute affirmation ci-dessous est étiquetée :
- **[OFFICIEL]** — trouvé sur une page/un PDF FFBB officiel
- **[CODE SOURCE — 3 sources indépendantes]** — confirmé par recoupement dans le code de 3 clients open source non liés entre eux
- **[CODE SOURCE — 1 source]** — vu dans un seul client, non recoupé
- **[SUPPOSÉ]** — hypothèse raisonnable, non vérifiée

---

## 1. Résumé exécutif

- **Meilleure source pour calendrier / résultats / salles / classements : l'API publique FFBB**, aujourd'hui hébergée sur `https://api.ffbb.app/` (et non `api.ffbb.com`, voir §3). C'est une API [Directus](https://directus.io/) (backend générique de gestion de données) accompagnée d'un moteur de recherche [Meilisearch](https://www.meilisearch.com/). Elle expose déjà, avec des noms de champs stables, tout ce dont le Module 1 (Matchs) a besoin : compétitions, poules, engagements, rencontres, salles, classements. C'est la source recommandée pour la Phase 1, sans réserve majeure sur les données elles-mêmes (des réserves existent sur le statut "non documenté" de cette API, voir §10).
- **Meilleure source potentielle pour les licenciés : FBI**, mais uniquement via son module "Licences" utilisé par un humain authentifié (recherche, export Excel). **Aucune API programmatique documentée** n'a été trouvée pour FBI. L'API publique n'expose **aucune** collection de licenciés/joueurs individuels (seulement des entraîneurs et, semble-t-il, des arbitres — voir §6).
- **Meilleure source potentielle pour les statistiques : très limitée**, voire inexistante pour le niveau de compétition probable du SC Sète. Le champ public `competitions.liveStat` (booléen) suggère que le suivi statistique avancé n'est activé que pour certaines compétitions (élite/pro), pas pour les championnats régionaux/départementaux. e-Marque produit un score et des fautes par équipe pour toutes les rencontres, mais rien n'indique que ce détail soit republié de façon structurée et accessible.
- **Rôle de FBI** : c'est le back-office historique (application Java, extranet), pas une source de données pour une appli tierce — c'est là que vivent les licenciés, les emails/téléphones, les exports Excel, et le PDF de la feuille de marque après un match.
- **Rôle d'e-Marque** : logiciel de saisie de la feuille de marque électronique, qui **parle à FBI**, pas directement à l'API publique ni à notre application. Il n'y a pas de canal identifié pour qu'une application tierce interroge e-Marque directement.

## 2. Architecture FFBB observée

```text
e-Marque (poste de saisie, au bord du terrain)
   │  "fichier d'import" préparé par FBI avant match
   │  "export.zip" envoyé par e-Marque après clôture du match
   ▼
FBI (extranet.ffbb.com/fbi/ — appli Java historique, licenciés, résultats,
     feuille PDF générée après traitement de l'export, ~1h de délai [OFFICIEL])
   │  (mécanisme de publication non observable publiquement : FBI alimente
   │   quelque part le pipeline de données publiques — non confirmé si direct
   │   ou via une étape intermédiaire)
   ▼
Data Hub / API publique : api.ffbb.app  (Directus + Meilisearch)
[CODE SOURCE — 3 sources indépendantes]
   │  items/ffbbserver_competitions, _poules, _engagements, _rencontres,
   │  _organismes, _salles, _officiels, _entraineurs, _tournois...
   │  + moteur de recherche meilisearch-prod.ffbb.app
   ▼
Sites/applications FFBB : competitions.ffbb.com, ffbb.com, appli mobile
(clients de la même API publique)

Branche parallèle, non confirmée officiellement :
rencontres --gsId--> genius_sport_matches / genius_sports_live_logs
   → suggère une intégration avec Genius Sports (prestataire externe de
     données sportives live), probablement réservée aux compétitions à fort
     enjeu ("liveStat" = true). [SUPPOSÉ, basé sur le nommage des collections]
```

Différence par rapport au schéma envisagé dans `ARCHITECTURE.md` : le terme **"Data Hub"** n'est pas un produit nommé et documenté par la FFBB — c'est un terme générique. Ce qui existe réellement et joue ce rôle est **l'API Directus `api.ffbb.app`**. Le domaine `api.ffbb.com` mentionné dans le brief initial n'a pas pu être confirmé comme backend actif (voir §3) ; il est possible qu'il s'agisse d'un ancien alias ou d'un malentendu de nommage — **à re-tester en priorité** dès qu'un accès réseau normal sera disponible.

## 3. API publique FFBB

### 3.1 Base technique confirmée

| Élément | Valeur | Confiance |
|---|---|---|
| URL de base API | `https://api.ffbb.app/` | **[CODE SOURCE — 3 sources indépendantes]** (`Rinzler78/FFBBApiClientV2_Python`, `nickdesi/ffbb-data-client`, `Fimeo/ffbb-api-ts`) |
| URL de base recherche | `https://meilisearch-prod.ffbb.app/` | [CODE SOURCE — 1 source, cohérent avec les autres] |
| Technologie | [Directus](https://directus.io/) (API REST auto-générée à partir de collections) | [CODE SOURCE — 3 sources] |
| Spécification OpenAPI | `server/specs/oas` (endpoint standard Directus, généré automatiquement) | [CODE SOURCE — 1 source] — un outil tiers dit l'utiliser pour surveiller quotidiennement les changements de schéma |
| `api.ffbb.com` (domaine cité dans le brief) | Non confirmé comme backend actif dans cette session (bloqué réseau ; aucun des 3 clients ne l'utilise) | À re-tester |

### 3.2 Authentification

Il **n'y a pas de compte utilisateur requis**, mais il y a tout de même un jeton (bearer token) :

- Endpoint public, sans authentification préalable : `GET items/configuration`
- La réponse contient un `api_bearer_token` et un `meilisearch_token` **[CODE SOURCE — 3 sources indépendantes]**, à réutiliser en en-tête `Authorization: Bearer <token>` sur les appels suivants.
- **Point d'attention réel** : les 3 clients imposent un en-tête `User-Agent: okhttp/4.12.0` (le client HTTP par défaut d'Android) avec ce commentaire explicite trouvé dans le code source de `nickdesi/ffbb-data-client` :
  > "Must impersonate the official mobile client (okhttp) to avoid BunnyCDN / WAF 403 Forbidden"

  Autrement dit : un WAF (pare-feu applicatif, CDN BunnyCDN) **bloque délibérément les requêtes qui ne ressemblent pas à l'application mobile officielle**, et il faut usurper cet en-tête pour passer. Ce n'est **pas une API publique documentée et sanctionnée** par la FFBB pour un usage tiers — c'est le backend privé de l'application mobile, dont l'accès est actif­ment protégé contre les clients non officiels. Voir §10 pour l'analyse de risque.

### 3.3 Endpoints / collections identifiés

Convention Directus : `GET {base}/items/{collection}` (liste), `GET {base}/items/{collection}/{id}` (détail), avec `fields`, `filter` (JSON), `sort[]`, `search`, `limit`, `offset`, `deep[relation][...]` pour paginer/filtrer les relations imbriquées. **[CODE SOURCE — 3 sources indépendantes, y compris exemples d'appels réels dans le code]**

| Collection | Contenu | Pertinent pour |
|---|---|---|
| `ffbbserver_organismes` | Clubs/structures (id, nom, **code**, adresse, mail, téléphone, commune, géoloc, engagements, compétitions, **membres** dirigeants) | Club SC Sète, dirigeants (⚠️ PII, voir §9) |
| `ffbbserver_competitions` | Compétitions (nom, code, sexe, type, `liveStat`, `emarqueV2`, catégorie, phases/compétition parente, poules) | Compétitions, phases |
| `ffbbserver_poules` | Poules (nom, rencontres, engagements, **classements** imbriqués) | Poules, classements |
| `ffbbserver_engagements` | Équipes engagées (nom, numéro d'équipe, club, compétition, poule, entraîneur(s), **classement** imbriqué détaillé) | Équipes du club, classements |
| `ffbbserver_rencontres` | Matchs (voir détail §3.4) | Cœur du Module 1 |
| `ffbbserver_salles` / `ffbbserver_terrains` | Salles / terrains | Lieu des matchs |
| `ffbbserver_saisons` | Saisons | Filtrage saison active |
| `ffbbserver_communes` | Communes (géo) | Adresses |
| `ffbbserver_officiels` | nom, prénom, **numéroNational** — vraisemblablement des **arbitres**, pas des officiels de table (voir §8) | À confirmer |
| `ffbbserver_entraineurs` | **idLicence**, nom, prénom, email, téléphones, adresse, commune (⚠️ PII, voir §9) | Coachs |
| `ffbbserver_tournois` | Tournois | Hors périmètre immédiat |
| `ffbbserver_formations` | Non exploré en détail | Hors périmètre |
| `ffbbnational_pratiques` | Pratiques (loisir, 3x3...) | Hors périmètre |
| `genius_sport_matches`, `genius_sports_live_logs` | Intégration tierce (Genius Sports) | Probablement élite/pro uniquement |
| `json/lives.json` | Flux léger des matchs en direct | Complément live |
| `assets/{id}` | Téléchargement de fichiers (logos...) | Assets |

**Aucune collection de type `ffbbserver_joueurs` ou `ffbbserver_licencies` n'a été trouvée** dans les 3 clients étudiés — voir §6/§11.

### 3.4 Détail — `ffbbserver_rencontres` (le plus important pour nous)

Champs confirmés **[CODE SOURCE — recoupé sur 2 des 3 clients]** :

```text
id, uniqueKey, gsId, numero, numeroJournee,
date, date_rencontre, horaire,
nomEquipe1, nomEquipe2, resultatEquipe1, resultatEquipe2,
joue (bool), etat, status, validee (bool),
forfaitEquipe1/2, defautEquipe1/2, penaliteEquipe1/2, handicap1/2, remise,
competitionId, idPoule, saison, salle,
idEngagementEquipe1/2, idOrganismeEquipe1/2,
officiels (liste), pratique, url_competition, rematch_videos,
date_created, date_updated, dateSaisieResultat, creation, modification
```

Exemple de requête (forme confirmée par le code, **valeurs à vérifier en réel**, non exécuté ici) :

```text
GET https://api.ffbb.app/items/ffbbserver_rencontres
    ?filter={"idOrganismeEquipe1":{"_eq":<id_numérique_du_club>}}
    &fields=id,date_rencontre,horaire,nomEquipe1,nomEquipe2,resultatEquipe1,resultatEquipe2,joue,salle,idPoule
    &sort[]=date_rencontre
Authorization: Bearer <api_bearer_token>
User-Agent: okhttp/4.12.0
```

### 3.5 Pagination et limitations constatées

- Pagination standard Directus : `limit`/`offset` (et un mode "exhaustif" `list_all_*` implémenté côté client par pagination automatique — donc pas de curseur natif documenté, juste offset).
- Les requêtes avec des champs imbriqués profonds (`deep[...][...][...]`) sont, d'après un commentaire du code source, sensiblement plus lentes : un des clients configure volontairement un **timeout de lecture de 120 secondes** pour Directus contre 10s ailleurs, avec un commentaire explicite "Directus needs longer read timeout for deep wildcard field queries". À anticiper dans notre implémentation (pas de requête à profondeur illimitée).
- Pas de documentation officielle de rate-limit trouvée ; à traiter défensivement (retry/backoff, cache).

## 4. FBI

- **FBI = "France Basket Informations"** [OFFICIEL, corrige une hypothèse initiale de "France Basket Informatique"], l'outil de gestion fédéral central pour clubs/comités/ligues/FFBB.
- **Accès** : `https://extranet.ffbb.com/fbi/connexion.fbi`, formulaire classique identifiant/mot de passe **fourni par la FFBB au club** (pas un compte par joueur), avec un flux "mot de passe oublié" [OFFICIEL].
- **Indices techniques observables publiquement** (sans contourner l'authentification, juste en lisant les URLs de la page de connexion elle-même) : URLs en `.fbi` avec paramètre `jsessionid=...` → application **Java** classique (session de type servlet), pas de trace d'API REST/GraphQL/SOAP publique, pas de SSO/OAuth visible.
- **Modules** [OFFICIEL, recoupé sur plusieurs guides club] :
  - **Organismes** : coordonnées club, président, correspondant fédéral
  - **Licences** : création/recherche de licenciés, pré-inscriptions — **c'est ici que vivent les données individuelles de licenciés**
  - **Compétitions** : saisie de résultats, dérogations horaires, téléchargement d'e-Marque V2
  - **Administration** : gestion des comptes/profils d'accès à FBI lui-même (plusieurs niveaux : accès général, licences, sportif...)
  - **Édition** : **exports Excel** (licences, compétitions, organismes)
- **Aucun "web service FBI" documenté publiquement** n'a été trouvé (ancienne page marketing "FBI - Web Services" trouvée dans les résultats de recherche renvoie en réalité vers la page de présentation de l'extranet lui-même, pas vers une API).
- **Ce que FBI reçoit d'e-Marque** : le fichier `export.zip` après clôture du match ; traitement en environ 1h ; résultat = feuille de marque PDF disponible dans l'espace club de FBI [OFFICIEL].

**Conclusion FBI** : c'est un système d'administration humaine, pas une source de données machine. Toute utilisation pour notre app impliquerait soit (a) un export Excel périodique fait par un humain du club puis importé, soit (b) une automatisation par session authentifiée (scraping), qui n'est **pas couverte par ce spike** et soulèverait des questions de CGU/ToS à trancher avec le club avant toute tentative (voir §9 et §10).

## 5. e-Marque

### 5.1 Flux confirmé [OFFICIEL, recoupé sur plusieurs PDF/guides]

```text
Avant le match :
  FBI prépare un "fichier d'import" pour la rencontre (paramètres de la division)
  → chargé dans e-Marque sur le poste de saisie
  → connexion internet obligatoire au démarrage de la rencontre

Pendant le match :
  e-Marque tient le score, les fautes, les temps-morts, la flèche de
  possession alternée, les remplacements

Après le match ("Clôture de match") :
  export → fichier "export.zip" stocké dans "Mes Documents/e-Marque"
  → envoyé à FBI (connexion internet obligatoire)
  → traitement FBI (~1h) → PDF de la feuille de marque disponible côté FBI
  → si e-Marque n'a pas pu être utilisé : feuille papier scannée, PDF
    seulement, explicitement "pas de flux XML" dans ce cas de secours
    (ce qui suggère, sans le confirmer formellement dans un document que
    j'ai pu lire intégralement, qu'un flux structuré existe dans le cas
    nominal)
```

### 5.2 Contenu du fichier — ce qui est confirmé vs supposé

| Élément | Statut |
|---|---|
| Le fichier `export.zip` contient les données de la rencontre + la feuille | [OFFICIEL] |
| Format interne exact (XML, JSON, autre) du contenu structuré | **NON CONFIRMÉ dans cette session** — les PDF officiels décrivant précisément le format n'ont pas pu être ouverts (domaine bloqué). Fortement suggéré par le contexte (cahiers des charges historiques nommés autour d'e-Marque, absence de mention JSON) que c'est du XML, mais je ne l'affirme pas comme un fait vérifié. |
| Score, fautes par équipe, résultat final | [OFFICIEL] — collecté par e-Marque (fonction de base du logiciel), nécessaire à la feuille réglementaire |
| Détail par joueur (points, 2/3pts, LF, fautes personnelles) | **[SUPPOSÉ avec forte probabilité]** — la feuille de marque réglementaire (BVR) exige historiquement ce détail par joueur ; mais je n'ai pas trouvé de confirmation que ce détail est republié quelque part d'accessible en dehors du PDF |
| Identité des OTM (chrono/marqueur) | Voir §8 — non confirmé dans le fichier, probablement seulement sur le PDF imprimé |
| Statistiques avancées (rebonds, passes, contres, position de tir) | **NON TROUVÉ** — hors du périmètre standard de la feuille de marque réglementaire ; relèverait d'un système distinct (LiveStat/Genius Sports), actif seulement sur certaines compétitions (`liveStat=true`) |

### 5.3 Où va le résultat ensuite

Le score/résultat validé finit par apparaître dans l'API publique (`ffbbserver_rencontres.resultatEquipe1/2`, `joue=true`, `validee=true`) — le mécanisme exact de publication entre FBI et `api.ffbb.app` (batch, réplication, écriture directe dans la même base) **n'est pas documenté publiquement et n'a pas pu être observé** dans cette session.

## 6. Identifiants communs

| Objet | Champ(s) candidat(s) | Confiance | Note |
|---|---|---|---|
| **Club** | `organismes.id` (numérique interne) et `organismes.code` (texte) | [CODE SOURCE] pour l'existence du champ `code` ; format exact (ex: `OCC0034008`) **non vérifié en réel** | `code` est le candidat naturel pour retrouver le SC Sète, à tester en priorité |
| **Compétition** | `competitions.id`, `competitions.code`, `competition_origine` (compétition parente) | [CODE SOURCE] | Gère bien la notion de "compétition parente" demandée dans le brief |
| **Poule** | `poules.id` | [CODE SOURCE] | — |
| **Engagement (équipe engagée)** | `engagements.id` | [CODE SOURCE] | Fait le lien équipe interne ↔ club ↔ compétition ↔ poule |
| **Match** | `rencontres.id` **et/ou** `rencontres.uniqueKey` **et/ou** `rencontres.gsId` | [CODE SOURCE] pour l'existence des 3 champs ; **aucun n'est confirmé comme LE seul identifiant stable "officiel" reliant competitions.ffbb.com ↔ FBI ↔ e-Marque** | `id` est le plus probable pour un usage d'UPSERT côté API publique (c'est ce qu'utilisent les 3 clients) ; `gsId` semble lié à Genius Sports et n'est probablement renseigné que pour certaines compétitions |
| **Personne (licencié)** | `entraineurs.idLicence` | [CODE SOURCE — 1 champ observé] | **Seul champ "licence" observé publiquement**, et seulement pour les entraîneurs. Aucune preuve publique équivalente pour les joueurs. Confirme la plausibilité de l'hypothèse "numéro de licence = identifiant pivot", sans la démontrer pour tous les types de licenciés. |
| **Officiel/arbitre** | `officiels.numeroNational` | [CODE SOURCE] | Numérotation séparée, vraisemblablement propre aux arbitres |

**Conclusion §6/§11** : il n'existe pas aujourd'hui, dans ce qui est observable publiquement, une preuve d'un identifiant de rencontre unique et documenté comme stable "à vie" à travers tout l'écosystème. `rencontres.id` est le meilleur candidat pratique pour notre `ffbb_match_id` (c'est déjà ce que fait la couche publique elle-même en interne). Pour les personnes, le numéro de licence reste l'hypothèse la plus solide mais n'est confirmé que pour les entraîneurs dans les données publiques.

## 7. Statistiques disponibles

Voir le tableau obligatoire en §19 pour le détail. Synthèse :

- **Score et résultat par équipe** : collecté par e-Marque, disponible publiquement (`resultatEquipe1/2`).
- **Détail par joueur (points, 2/3pts, LF, fautes)** : collecté par e-Marque (quasi certain, exigé par la feuille réglementaire), **non trouvé** de collection publique qui l'expose ; probablement enfermé dans le PDF FBI.
- **Statistiques avancées (rebonds, passes, interceptions, pertes de balle, contres, temps de jeu, plus/minus, position de tir)** : **non trouvées** pour le niveau grassroots. Le champ `competitions.liveStat` suggère un dispositif séparé, actif seulement pour certaines compétitions (probablement pro/élite, via Genius Sports). Rien n'indique que les divisions régionales/départementales du SC Sète en bénéficient.

## 8. OTM / table de marque

- Réglementairement, siéger à la table de marque (marqueur, aide-marqueur, chronométreur de jeu, chronométreur des tirs) **engage la responsabilité d'un licencié** [OFFICIEL, règlement des officiels/guides OTM] — donc un lien OTM ↔ licence existe *en principe* au niveau réglementaire.
- **Mais** : la collection publique `ffbbserver_officiels` (nom, prénom, numéroNational) a une forme qui correspond structurellement à un **registre d'arbitres**, pas à une liste d'OTM par match. Rien dans les 3 clients étudiés ne montre de champ dédié aux OTM d'une rencontre.
- La feuille de marque papier/PDF réglementaire comporte une zone d'identification des officiels de table — mais ceci reste **dans le PDF produit par FBI**, pas dans une donnée structurée observée.

**Conclusion** : la confirmation automatique "Samy a été identifié comme OTM sur la feuille FFBB" n'est **pas réalisable aujourd'hui** via l'API publique (aucune donnée). Elle serait **hypothétiquement** envisageable via FBI authentifié + lecture du PDF de la feuille de marque (extraction de texte sur une mise en page fixe) — mais c'est fragile, non testé, et suppose un accès FBI authentifié qui n'a pas été exploré dans ce spike (voir §9). À classer : **PRÉSENT DANS E-MARQUE/FBI MAIS ACCÈS STRUCTURÉ INCONNU**, jamais confirmé accessible.

## 9. Authentification — ce qui nécessiterait un compte club

| Besoin | Nécessite FBI authentifié ? |
|---|---|
| Calendrier, scores, salles, classements | Non — API publique suffit |
| Licenciés (recherche, création, détail) | **Oui**, module "Licences" de FBI |
| Export Excel licences/compétitions/organismes | **Oui** |
| PDF de la feuille de marque après un match | **Oui** (espace club FBI) |
| Dérogations horaires (saisie/validation FFBB) | **Oui** (module Compétitions de FBI) |
| Détail statistique joueur, identité OTM | **Probablement oui**, et seulement via le PDF (pas confirmé structuré même authentifié) |

Aucun mécanisme d'authentification FBI (identifiants, cookie de session, éventuel token) n'a été testé ni mis en place dans ce spike, conformément à la consigne. **Si et seulement si** une future phase confirme le besoin réel de connecter FBI, il faudra fournir — via des variables d'environnement non commitées, jamais codées en dur :

```text
FBI_USERNAME
FBI_PASSWORD
```

(mécanisme déduit du formulaire de connexion observé — identifiant/mot de passe classique, pas de token/cookie à fournir séparément a priori). Ceci n'est **pas encore nécessaire** et n'a pas été créé dans le projet.

## 10. Contraintes / risques

- **`api.ffbb.app` n'est pas une API publique documentée et sanctionnée.** C'est le backend privé de l'application mobile officielle, protégé par un WAF qui bloque les clients non reconnus ; les bibliothèques open source doivent usurper l'en-tête `User-Agent` de l'application Android pour l'atteindre. **Notre application ferait la même chose.** C'est une zone grise : techniquement faisable, mais pas explicitement autorisée par des CGU publiques trouvées. Recommandation : en informer la direction du club de façon transparente avant intégration en Phase 1, et documenter clairement dans le code que cette dépendance n'est pas un contrat stable de la FFBB (déjà prévu par l'abstraction `FFBBProvider` d'ARCHITECTURE.md).
- **Aucune garantie de stabilité.** Le fait que 3 générations de clients existent (`ffbb-api-client` v1, `ffbb-api-client-v2`, `ffbb-data-client`/v3) suggère que le backend a déjà changé de forme. Confirme la nécessité de l'abstraction déjà prévue dans `ARCHITECTURE.md` §8.
- **Aucune documentation de rate-limit.** À traiter défensivement (cache, backoff, pas de sondage agressif).
- **Le champ `rencontres.officiels` / la collection `ffbbserver_officiels` semblent être des arbitres, pas des OTM** — à ne pas confondre dans une future implémentation.
- **`api.ffbb.com` (cité dans le brief) n'a pas pu être confirmé actif** dans cette session (bloqué réseau) — à vérifier en priorité en dehors du sandbox avant de considérer le sujet clos.
- **FBI est un système d'authentification humaine (formulaire + session Java), pas une API.** L'automatiser reviendrait à faire du scraping de session authentifiée, ce qui sort du périmètre validé pour ce spike et devrait faire l'objet d'une décision explicite séparée (voir §9).

## 11. Recommandation d'architecture

L'architecture proposée dans `ARCHITECTURE.md` (`FFBBProvider` comme interface unique, DTO normalisés) **reste valide et n'a pas besoin d'être réécrite**. Ce spike affine seulement quelles implémentations concrètes ont du sens et dans quel ordre :

```text
FFBBProvider (interface déjà prévue — inchangée)
  │
  ├── FFBBPublicProvider   → api.ffbb.app (Directus + Meilisearch)
  │                          Implémente TOUT le périmètre Phase 1 :
  │                          compétitions, poules, engagements, rencontres,
  │                          salles, classements.
  │                          À construire maintenant.
  │
  ├── FBIProvider          → PAS un client API : au mieux un import d'export
  │                          Excel produit manuellement par un humain du club
  │                          (licenciés, dérogations). Une automatisation par
  │                          session authentifiée est une décision à part,
  │                          hors périmètre de ce spike.
  │                          À construire seulement quand le besoin
  │                          "licenciés"/"dérogations FFBB" devient réel
  │                          (Phase 4+).
  │
  └── (pas de "EMarqueProvider" séparé)
                             e-Marque ne parle qu'à FBI, jamais à une appli
                             tierce. Toute donnée "post e-Marque" qui nous
                             intéresserait (feuille, OTM, stats détaillées)
                             passerait par FBIProvider (lecture du PDF), pas
                             par un accès direct à e-Marque. À ne pas
                             modéliser comme une source séparée.
```

Le découpage à 3 providers suggéré dans le brief est donc **partiellement confirmé, partiellement à corriger** : `FFBBPublicProvider` et `FBIProvider` ont un sens réel et distinct ; un `EMarqueProvider` autonome n'a pas de justification technique — e-Marque n'est joignable qu'indirectement, via FBI.

## 12. Plan d'implémentation recommandé

1. **Valider en dehors de ce sandbox** (poste de développeur ou CI avec accès réseau normal) : exécuter le script `spikes/ffbb-ecosystem/probe-public-api.sh` pour confirmer en réel le token public, le champ `organismes.code = OCC0034008`, et récupérer un vrai exemple de rencontre. C'est un prérequis avant d'écrire le moindre code de Phase 1.
2. **Phase 1** : construire uniquement `FFBBPublicProvider` (api.ffbb.app), suffisant pour tout le Module 1 (matchs, calendrier, salles, classements). Ne pas toucher à FBI.
3. **Informer la direction du club**, avant la mise en production de la Phase 1, du fait que la source de données repose sur une API non documentée officiellement (transparence, pas un blocage).
4. **Ne pas construire `FBIProvider` avant que le besoin licenciés/dérogations soit réellement engagé** (Phase 3/4) — et à ce moment-là, retraiter une décision séparée : import Excel humain (faible risque) vs automatisation authentifiée (risque ToS/fragilité à évaluer avec le club).
5. **Ne pas concevoir de schéma de données pour l'OTM automatique ni les statistiques avancées** tant que l'accès à une source structurée n'est pas prouvé — aujourd'hui, ce n'est pas le cas.

---

## Tableau de synthèse (obligatoire)

| Donnée | Public FFBB (api.ffbb.app) | FBI | e-Marque | Accessible aujourd'hui ? |
|---|---|---|---|---|
| Calendrier | Oui — non authentifié (token public) | Oui (saisie) | — | **Oui, public** |
| Score | Oui — non authentifié | Oui (saisie/validation) | Produit le score | **Oui, public** |
| Salle | Oui — non authentifié | — | — | **Oui, public** |
| Classement | Oui — non authentifié (imbriqué dans engagements/poules) | — | — | **Oui, public** |
| Licenciés (joueurs) | Non trouvé (aucune collection publique) | Oui, module Licences | — | **Non, authentifié club requis** |
| Coachs (identité + contact) | Oui — non authentifié (`ffbbserver_entraineurs`, avec PII) | Oui | — | **Oui public, mais PII sensible — à éviter/limiter (§9 RGPD ci-dessous)** |
| Composition match (feuille) | Non trouvé | Oui (PDF, post-traitement) | Produit la feuille | **Authentifié club uniquement, format PDF non structuré** |
| OTM | Non trouvé (le champ "officiels" ressemble aux arbitres) | Présent sur la feuille PDF, probablement | Saisi mais non republié | **À confirmer — probablement uniquement dans un PDF FBI** |
| Points joueur | Non trouvé | Probable dans la feuille PDF, non confirmé structuré | Collecté | **Présent dans e-Marque, accès API inconnu** |
| 2 pts | Non trouvé | Idem | Collecté (nécessaire au score) | **Présent dans e-Marque, accès API inconnu** |
| 3 pts | Non trouvé | Idem | Collecté (nécessaire au score) | **Présent dans e-Marque, accès API inconnu** |
| LF | Non trouvé | Idem | Collecté (nécessaire au score) | **Présent dans e-Marque, accès API inconnu** |
| Fautes | Non trouvé | Idem | Collecté (réglementaire) | **Présent dans e-Marque, accès API inconnu** |
| Temps de jeu | Non trouvé | Non trouvé | Non trouvé (hors périmètre réglementaire standard) | **Non trouvé** |
| Positions tirs | Non trouvé | Non trouvé | Non trouvé | **Non trouvé** |

## Décisions

**A. Calendrier + scores du SC Sète → quelle source ?**
L'API publique `api.ffbb.app` (Directus). C'est la seule source testable réellement, et elle couvre tout le besoin.

**B. Licenciés → quelle source ?**
Aucune source automatique satisfaisante identifiée. FBI (module Licences, export Excel humain) est la moins mauvaise option, mais reste manuelle et authentifiée — pas une intégration API.

**C. Feuilles de match → quelle source ?**
FBI, uniquement sous forme de PDF post-traitement (pas de structure exploitable identifiée), et seulement avec un compte club.

**D. Statistiques joueurs → quelle source ?**
Aucune source fiable identifiée pour le niveau probable des compétitions du SC Sète. Ce qui existe (`liveStat`) semble réservé à des compétitions à enjeu supérieur. À considérer indisponible pour l'instant.

**E. Connecter FBI dès la Phase 1, ou d'abord l'API publique ?**
**D'abord l'API publique seule.** Elle couvre 100% du périmètre Module 1 (matchs/calendrier/scores/salles/classements). FBI n'apporte rien à ce périmètre et ajoute du risque (authentification, fragilité, incertitude sur les CGU) sans bénéfice immédiat.

**F. Prévoir plusieurs providers dès maintenant dans l'architecture ?**
L'interface abstraite (`FFBBProvider`), déjà prévue dans `ARCHITECTURE.md`, doit rester en place — c'est elle qui permettra d'ajouter `FBIProvider` proprement plus tard. Mais **une seule implémentation concrète** (`FFBBPublicProvider`) doit être développée maintenant. Ne pas construire `FBIProvider` ni de provider e-Marque en avance de phase.
