# Suivi de progression

**Dernière mise à jour** : 2026-10-07 — **Phase en cours** : 4 (LOT-04 ✅, LOT-06 ✅ flag, R-015 ✅, LOT-14 : CSP Report-Only ✅, anti-framing ✅, jeton en fragment côté front ✅ ; **LOT-02 spécifié (R-018 inclus), non démarré**) — **Avancement global** : 64 %

## Phases
| Phase | Intitulé                         | Statut        | Validée le |
|-------|----------------------------------|---------------|------------|
| 0     | Initialisation                   | ✅ Terminé    | 2026-10-07 |
| 1     | Cartographie                     | ✅ Terminé    | 2026-10-07 |
| 2     | Inventaire & priorisation        | 🔵 En revue   |            |
| 3     | Conception stack back            | 🔵 En revue (révisée Railway) |            |
| 4     | Migration par lots               | 🟡 En cours (LOT-04, LOT-06 livrés ; LOT-02 en tête dès que le repo existe) |            |
| 5     | Nettoyage front & optimisation   | ⬜ À faire    |            |
| 6     | Recette finale & bilan           | ⬜ À faire    |            |

## Lots de migration
| ID     | Traitement | Fichiers front concernés | Endpoint cible | Priorité | Statut | Test | PR/commit |
|--------|------------|--------------------------|----------------|----------|--------|------|-----------|
| LOT-00 | Vulnérabilités de prod (next critique, sharp, source-map-js) | package.json, package-lock.json | — | P1 | ✅ | ✅ (baseline) | `0121eed` |
| LOT-01 | TRT-002 Auth : jeton mémoïsé + getClaims | auth.server.ts, session.ts, proxy.ts | — (front seul) | P1 | ✅ | ✅ 5 tests (`auth-calls`) + 4 (`proxy`) | `a4c2580` |
| LOT-02 | TRT-001 Roster public → recherche serveur **+ R-018 (revendication soumise à validation admin)** | IdentifyView.tsx, publicTables.ts | `GET …/licencies/search?q=` (`04` B.1) ; `POST …/request-link` modifié + `…/claim-requests` (`04` B.1 bis) | P1 | 📝 spécifié, **règles validées (Q-020, Q-022)** (`11` §7, §7.9) — attend le repo du back | ⬜ (tests de contrat listés `11` §7.9.6) | |
| LOT-03 | TRT-003 Gymnases dynamiques | HomeMatchesAgenda.tsx | `GET /v1/clubs/:id/venues` (existant) (à confirmer) | P1 | ⛔ nouveau back | ⬜ | |
| LOT-04 | TRT-011 Réglages club via API | club-settings.ts | `PATCH /v1/clubs/{id}` **existant** (04 E-2) | P2 | ✅ | ✅ 9 tests | voir `git log` |
| LOT-05 | TRT-007, 008 Saison & journée serveur | season.ts, timezone.ts, match-filters.ts | `season=current`, `weekendKey` (à confirmer) | P2 | ⛔ nouveau back, D-2 | ⬜ | |
| LOT-06 | TRT-006 Matchs filtres serveur | match-filters.ts, MatchesView.tsx | `GET …/matches?period=&teamId=&homeAway=` **existant** (04 E-3) + `/matches/weekends` nouveau | P2 | ✅ derrière flag (défaut off) | ✅ 22 tests | voir `git log` |
| LOT-07 | TRT-005 Tableau de bord BFF | dashboard/page.tsx | `GET /v1/clubs/:id/dashboard` (à confirmer) | P1 | ⛔ LOT-01, 05 | ⬜ | |
| LOT-08 | TRT-009 Résultats serveur | result-groups.ts | `GET …/results` (à confirmer) | P2 | ⛔ LOT-05 | ⬜ | |
| LOT-09 | TRT-010 Import licenciés serveur | ImportLicenciesPanel.tsx | `POST …/licencies/import {text}` (à confirmer) | P2 | ⛔ nouveau back | ⬜ | |
| LOT-10 | TRT-004 Opérations longues → jobs | lib/api/integrations.ts, … | `202 + jobId` (à confirmer) | P1→P2 | ⛔ nouveau back | ⬜ | |
| LOT-11 | CI minimale | (nouveau workflow) | — | P2 | ✅ (workflow validé, 1ᵉʳ run réel après push) | ✅ actionlint + gitleaks local | voir `git log` |
| LOT-14 | En-têtes de sécurité : CSP **Report-Only** ✅ ; anti-framing appliqué ✅ ; **jeton en fragment + transport isolé (front) ✅** ; R-008 (localStorage) ⬜ ; mode bloquant ⬜ (plan `12` §6) | next.config.ts, security-headers.ts, publicToken.ts, api/publicTokenTransport.ts | — | P2 | 🟡 partiel | ✅ 14 tests CSP + 51 tests jeton | `78ed617`, `4570207`, `f2841a7` |
| R-015 | Pagination de la vue publique des matchs | publicMatches.ts | — (existant) | P2 | ✅ | ✅ 8 tests | `1595e53` |
| LOT-12 | TRT-012 à 015 petites listes | divers | divers | P3 | ⛔ | ⬜ | |
| LOT-13 | Nettoyage worker/ + config morte | worker/, next.config.ts | — | P3 | ⬜ Phase 5 | ⬜ | |

## Mesures conservatoires
| Mesure | Statut | Commit |
|--------|--------|--------|
| D-1 validation serveur du fuseau (TRT-011) | ✅ | `cb085e1` |
| TRT-001 annuaire public | **R-013 accepté** (D-3 = B). **L'acceptation expire à la livraison du LOT-02** ; elle ne se referme que si l'ancien endpoint est fermé (critère vérifiable, `11` §7.7 — action du propriétaire) | `2f35699` |
| R-015 troncature de la vue publique | ✅ corrigé côté front (reste à vérifier la sémantique de l'API, Q-014 T6) | `1595e53` |
| R-014 jeton en query string | **Front prêt** (`4570207`) : lit `#token=` (prioritaire) et `?token=`, nettoie l'URL dès la lecture, transport isolé derrière `NEXT_PUBLIC_PUBLIC_TOKEN_HEADER` (défaut **off**). **Reste ouvert** : lien en fragment + en-tête côté `ball-manager-back` (propriétaire) | `4570207` |
| R-018 revendication de fiche | **Traité en P1 dans le LOT-02** (spec `11` §7.9) ; **ouvert sur l'existant**, non vérifié (procédure `11` §7.9.7, propriétaire) | `b0c7b45` |
| X-Frame-Options / frame-ancestors | ✅ appliqués (Q-021) | `f2841a7` |

## CI
Runs : `37612678201` ✅, `37618494863` ✅, `37681560073` ✅ (commit `f830e38`, 172 tests). `37681742496` + `37681736846` ✅ (commit `a038c9e`, docs) ; `37684885660` + `37684879305` ✅ (`e1d79ff`) ; `37685082654` + `37685088305` ✅ (`0515c6b`, 2 runs) ; **`37685831364` ✅ (`b857079`, 227 tests, 1 seul run)**.

## Décisions prises (2026-10-07)
Q-015 (Supabase conservé pendant S3, réévaluation obligatoire en fin de S3), Q-016 (routage client par module, ADR-005 Acceptée), Q-017 (**front sur Vercel**, VPS supprimé de la documentation), Q-018 (recherche anonyme bornée), **Q-020** (règles LOT-02 validées), **Q-021** (CSP : toutes recommandations), **Q-022** (R-018 en P1 dans le LOT-02), **Q-023** (R-014 : fragment + en-tête).

## Livré le 2026-10-07 (séquence Q-024/Q-025)
Décisions (`982ed7e`), jsdom + tests du jeton en vrai DOM, `window` factice retiré (commit `test: jsdom…`), CI dédoublonnée (`b857079`). Baseline : **227 tests, 27 fichiers**.

## Prochaines actions
- [ ] **Propriétaire, action 1 (urgente)** : vérifier R-018 sur l'existant (`11` §7.9.7)
- [ ] **Propriétaire** — liste ordonnée des actions en attente : voir la réponse de la session (priorité 1 à 8)
- [ ] Ensuite : LOT-02 dans le nouveau repo (tests de contrat d'abord, `11` §7.5 et §7.9.6)

## Bloquants
- Repo du back (propriétaire) pour démarrer le LOT-02.
- Aucun bloquant côté front pour les lots en cours.
