# 10 — Risques
| ID | Risque | Proba | Impact | Mitigation |
|----|--------|-------|--------|------------|
| R-001 | Back réel hors de ma portée : impossible d'implémenter les endpoints | Moyenne | Élevé | Lever Q-001 avant Phase 3 |
| R-002 | Chevauchement avec la migration déjà faite (MIGRATION_TO_API.md) | Moyenne | Moyen | S'appuyer dessus en Phase 1 |
| R-003 | Dépendances vulnérables (npm audit) | Haute | Moyen | Analyser en Phase 1 |
| R-004 | Next 16.3.5 : RCE `next/og` (critique) — non exploitable en l'état (aucun usage) mais plage vulnérable | Faible | Élevé | LOT-00 : montée vers 16.3.6+/16.4.0 |
| R-005 | `npm audit fix --force` rétrograderait Next en 14.2.35 (faux « correctif » dev) | Moyenne | Élevé | Ne jamais lancer `--force` ; montée ciblée |
| R-006 | Pas de CI ni test de composants : régression UI non détectée lors des migrations | Moyenne | Moyen | Tests de caractérisation par lot (règle 4) |
| R-007 | Autorisation relue côté Next (`club-context.ts:43-67`) : à confirmer qu'elle est aussi imposée par l'API | Moyenne | Élevé | Vérifier avec le code du back (Q-001) |

## Audit de l'historique git (Q-006) — 2026-10-07, lecture seule
- **Méthode** : aucun scanner installé (gitleaks / trufflehog absents). Balayage regex maison de `git log --all -p` (100 commits, toutes branches locales), sur les lignes ajoutées : JWT (rôle décodé sans afficher la valeur), `sb_secret_*`, clés privées PEM, `AKIA*`, jetons GitHub, affectations `*_SECRET|*_TOKEN|*_PASSWORD|SUPABASE_SERVICE_ROLE_KEY|FBI_CREDENTIALS_ENCRYPTION_KEY = <valeur longue>`.
- **Résultat** : **aucun secret trouvé**. 2 correspondances, toutes des faux positifs (code de lecture d'env, pas de valeur) : `src/config/env.server.ts` @ `5db6b6a` (2026-09-21) et @ `68c5c86` (2026-09-21).
- **Fichiers sensibles jamais ajoutés** : seuls des `.env*.example` apparaissent dans l'historique (`.env.example`, `spikes/fbi-auth/.env.fbi.example`, `worker/.env.example`) ; aucun `.env` réel.
- **Limites** : regex, pas d'analyse d'entropie ; branches distantes non récupérées ; ne couvre pas l'historique de `ball-manager-back`. Un passage gitleaks reste recommandé si un accès est possible (en CI : voir lot « CI minimale »).
- Historique non modifié.
| R-008 | (lot P2 : LOT-14 ; **CSP Report-Only livrée, R-008 lui-même non traité**) Jeton personnel public stocké en `localStorage` (`lib/publicToken.ts:19`) : volable par XSS ; le lien donne l'identité « tel licencié » (affectation de tables, demandes) | Faible | Moyen | Vérifier CSP côté Next (aucun en-tête de sécurité dans `next.config.ts`) ; durée de vie / révocation du jeton côté back (à confirmer) |
| R-009 | Annuaire public énumérable (TRT-001) : noms de mineurs exposés sans auth | Moyenne | Élevé | LOT-02 (P1) ; en attendant, rate-limit côté back si possible |
| R-010 | `timezone` de club non validée (`club-settings.ts:36`) → `RangeError` Intl sur les pages Tables/Dérogations du club | Faible | Moyen | LOT-04 ; vérifier une contrainte en base |
| R-011 | `getClaims()` : un compte révoqué reste accepté jusqu'à expiration du JWT dans le proxy | Faible | Moyen | **Front** : ADR-001 (inchangé). **Nouveau back** : revalidation JWKS + introspection des écritures sensibles (ADR-006, *conception, non implémentée*) ; durée de vie JWT et type de clés à vérifier (Q-008) |
| R-012 | Lots « back requis » (9/13) bloqués tant que Q-001 n'est pas levée | Haute | Élevé | Démarrer par LOT-01 et LOT-11 (front seul) ; lever Q-001 |
| R-013 | **TRT-001 / R-009 — annuaire public nominatif (mineurs inclus) sans authentification** | Moyenne | Élevé | **RISQUE ACCEPTÉ** — voir « Acceptation de risque R-013 » ci-dessous. Correction de fond : LOT-02 |

## Audit gitleaks (2026-10-07) — complète l'audit par regex
- Outil : gitleaks **v8.30.1** (image `ghcr.io/gitleaks/gitleaks:v8.30.1`), `git --log-opts="--all" --redact=100`, dépôt monté en lecture seule.
- Résultat : **103 commits scannés, 3,17 Mo — « no leaks found »**. Cohérent avec l'audit regex (100 commits). Aucune valeur affichée.
- Couverture : toutes les refs présentes **localement** (dont `origin/claude/fervent-brahmagupta-pu78c4`). Les branches distantes non récupérées ne sont pas vues ; le job CI (`fetch-depth: 0`) les couvrira.
- Hors périmètre : historique de `ball-manager-back`, secrets non commités (`.env.local`).

## Acceptation de risque R-013 (TRT-001)
- **Énoncé** : « Risque accepté par Rida le 2026-10-07 : l'annuaire public reste ouvert jusqu'à la livraison du LOT-02, sans mesure conservatoire. »
- **Périmètre** : `GET /v1/public/clubs/:slug/licencies` (liste `id`, prénom, nom, `claimed`), consommé par `src/features/public/IdentifyView.tsx:66-87` et `src/lib/api/publicTables.ts:51`.
- **Date de révision obligatoire** : **au plus tard à la livraison du LOT-02, et en tout cas au prochain point 🛑 de Phase 4**, selon l'événement qui survient en premier. À cette échéance l'acceptation expire ; elle doit être renouvelée explicitement ou le risque traité.
- **Conséquence au plan** : LOT-02 passe **en tête** des lots de Phase 4 (`03-plan-migration.md`).
- **Ce que l'acceptation ne couvre pas** : tout nouvel endpoint public créé par le nouveau back doit être conçu sans énumération (recherche serveur, longueur minimale, limitation de débit) — exigence reprise dans `05-architecture-cible.md`.
- Mention RGPD : données nominatives de mineurs ; l'acceptation est une décision du propriétaire, pas une conformité.
| R-014 | **(Vercel : journalisation CONFIRMÉE par la doc, 2026-10-07)** **Jeton personnel public transmis en query string** (`?token=`, 14+ appels : `publicTables.ts:72-131`, `publicDerogationRequests.ts:25-29`, `publicHome.ts:9`) → présent dans journaux d'accès du proxy, historique, `Referer` ; il donne l'identité d'un licencié (affectations, demandes, écritures FBI pour un coordinateur) | Moyenne | Moyen à élevé | Nouveau back : transport par en-tête (`04` B.9, ADR-006) ; **Railway ne permet ni de garantir ni d'exclure la journalisation des query strings** (non documenté, ADR-007 §7) : le nouveau back refuse `?token=` (`400 TOKEN_IN_QUERY`) et **aucun trafic à jeton ne doit transiter par Railway** (d'où le routage par module, ADR-005 (a)) ; vérification en staging avec valeur sentinelle (`11-init-repo-back.md`) ; durée de vie/révocation à confirmer. **Risque non traité, non accepté** |

## Premier run CI réel (2026-10-07)
- Run `37612678201` (https://github.com/anisfut1/ball-manager-web/actions/runs/37612678201), branche `refactor/migration-back`, commit `2f35699` : **✅ success**.
- Job `Typecheck, lint, tests, build` : ✅ (npm ci, typecheck, lint, tests, build, `npm audit --omit=dev --audit-level=high`).
- Job `Secrets (gitleaks, historique complet)` : ✅ (étape « Scanner l'historique » en succès ; gitleaks échoue si une fuite est trouvée). Le job utilise `fetch-depth: 0` : toutes les branches distantes sont récupérées (`refs/remotes/origin/*`) et parcourues par `--all`.
- **Limite** : le journal détaillé d'un run n'est pas lisible sans authentification GitHub ; le nombre de commits scannés n'a donc pas pu être relevé. Le statut « success » est celui retourné par l'API publique GitHub.
| R-015 | **CORRIGÉ côté front le 2026-10-07 (voir `03`, commit R-015) — reste à vérifier la sémantique de l'API (Q-014 T6).** Vue publique des matchs tronquée à 200 résultats : `listPublicMatches` fait UN appel `limit=200` sans boucle de pagination (`src/lib/api/publicMatches.ts:36-39`), alors que la vue club pagine (`matches.ts:56-75`). Si l'API trie par date croissante (comportement documenté `matches.ts:40-52`), les matchs **les plus récents** seraient absents pour une saison > 200 matchs (ex. 15 équipes × 26 = 390, estimé). **Non vérifié** (aucun appel réel) | Moyenne | Moyen (affichage public incomplet, aucune fuite) | Test Q-014 n°6 ; correctif = boucle de pagination comme `listMatches` (changement de comportement, hors LOT-06, à décider) |
| R-016 | **Dépendance à une plateforme (Railway) dont plusieurs comportements ne sont pas vérifiés** : journalisation des query strings (garantie **non établie**), IPv6 sortant, TLS du domaine propre, latence vers Supabase, tarifs ; `railway.json` déprécié, échéance **2026-12-01** (ne pas l'utiliser) | Moyenne | Moyen | ADR-007 : garantie R-014 **par conception** (refus de `?token=`, aucun trafic à jeton sur Railway) ; checklist V1–V6 ; Dockerfile portable ; supervision externe (healthchecks Railway = au déploiement seulement) |
| R-017 | **Base Supabase exposée sur Internet** depuis Railway (pas de réseau privé), restriction d'IP impossible sans IP sortante fixe (non documentée) | Faible-Moyenne | Élevé | Rôle Postgres dédié à privilèges minimaux, `sslmode=verify-full`, rotation ; option (b)/(c) d'ADR-003 |
| R-014 (précision Q-017) | Chemin réel du jeton : (1) **ouverture du lien e-mail = requête de page vers le front Vercel** (`?token=`), (2) **appels API navigateur → `ball-manager-back` (Vercel) en query** (`publicTables.ts:72-131`). Les journaux d'exécution Vercel enregistrent les « Search Params » (rétention 1 h à 30 jours selon l'offre). Mitigations : en-tête pour les appels API (nouveau back) **et** fragment `#token=` dans le lien e-mail (action `ball-manager-back`) ; `Referrer-Policy` posé par LOT-14 (limite la fuite via `Referer`) | — | — | Voir ADR-005, ADR-007, `04` B.9 |
| R-018 | **Revendication de fiche sans adresse connue** : tout visiteur connaissant un nom peut saisir sa propre adresse et recevoir le lien personnel d'un autre licencié (coach/admin inclus) — `IdentifyView.tsx:106-111`, `publicTables.ts:57-62` ; **côté back non vérifié** (code non lu). La spécification du LOT-02 retire `claimed` pour ne plus désigner les fiches revendicables | Moyenne | **Élevé** (écritures FBI possibles avec un lien admin/coordinateur) | Hors LOT-02 : validation de la première revendication par un admin, ou adresses pré-chargées, ou confirmation à l'adresse connue ; limitation de `request-link` (`11` §7.2) ; **décision du propriétaire requise** |
| R-019 | **Épuisement volontaire du budget par club** (`11` §7.2) bloque l'auto-identification pendant la fenêtre (déni de service ciblé) | Faible-Moyenne | Faible-Moyen | Repli « contacte ton club », alerte à 50 % du budget, budgets calibrés sur l'usage réel |

## Mise à jour 2026-10-07 (fin de séquence Q-015 à Q-018)
| Risque | Statut |
|---|---|
| R-013 annuaire public | **Accepté jusqu'à la livraison du LOT-02** ; spécification prête (`11` §7). **Reste ouvert après livraison tant que l'ancien endpoint répond 200** (critère vérifiable `11` §7.7, action du propriétaire) |
| R-014 jeton en query string | **Ouvert, non accepté.** Confirmé côté **Vercel** (« Search Params » dans les journaux d'exécution) ; Railway non documenté. `Referrer-Policy` explicite posé (LOT-14) ; en-tête pour les appels API et fragment `#token=` pour le lien e-mail à faire |
| R-011 révocation de session | Front : ADR-001 inchangé. Nouveau back : revalidation conçue (ADR-006), non implémentée. Q-008 (JWKS, durée de vie JWT) à fournir |
| R-015 troncature publique | **Corrigé côté front** (`1595e53`) ; sémantique API à vérifier (Q-014 T6/T7) |
| R-016 comportements Railway non vérifiés | Ouvert (V1–V6 en staging) |
| R-017 base Supabase exposée depuis Railway | Ouvert ; **région Railway à rapprocher de la région Supabase (exigence Q-015)** ; rôle dédié, TLS strict |
| R-018 revendication de fiche sans adresse | **Nouveau, ouvert**, hors LOT-02 ; décision du propriétaire |
| R-019 épuisement du budget par club | **Nouveau**, accepté dans la spécification (repli « contacte ton club ») |

## Mise à jour 2026-10-07 (décisions Q-020 à Q-023)
| Risque | Statut |
|---|---|
| R-014 jeton en query string | **Cible retenue** : fragment `#token=` (lien d'e-mail) + en-tête `X-Personal-Link-Token` (appels API). **Front prêt** (lecture du fragment, nettoyage immédiat de l'URL, transport isolé derrière drapeau, défaut off). **Reste ouvert** tant que `ball-manager-back` n'a pas (1) généré le lien en fragment et (2) accepté l'en-tête — actions du propriétaire. Les liens déjà envoyés restent en `?token=` (rétrocompatibilité conservée) |
| R-018 revendication de fiche sans adresse | **Traité en P1 dans le LOT-02** (Q-022) : validation admin, aucun envoi automatique, rôles coach/admin non revendicables. **Ouvert jusqu'à la livraison**, et **non vérifié sur l'existant** : procédure d'essai `11` §7.9.7 (action du propriétaire) |
| R-019 | Inchangé (accepté) ; la file de validation ajoute une surface (spam de demandes) bornée par des limites de débit dédiées (`11` §7.9.5) |

## Alertes 2026-10-07 (fin de séquence Q-020 à Q-023)
| Risque | Statut |
|---|---|
| R-013 | Inchangé : accepté jusqu'à la livraison du LOT-02 ; reste ouvert tant que l'ancien endpoint répond 200 |
| R-014 | Front prêt, **ouvert** (actions `ball-manager-back`) ; limite résiduelle : les liens déjà envoyés restent en `?token=` jusqu'à leur ouverture (le jeton atteint alors une fois les journaux Vercel) |
| R-018 | Spécifié, **ouvert** ; vérification sur l'existant à faire |
| R-019 | Inchangé, accepté |
