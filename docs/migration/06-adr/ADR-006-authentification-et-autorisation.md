# ADR-006 — Authentification, autorisation et jeton personnel public
- **Date** : 2026-10-07
- **Statut** : Proposée (complète ADR-001, qui traite le front)

## Contexte
- R-011 : avec `getClaims()` côté front (ADR-001), une session révoquée reste acceptée jusqu'à l'expiration du JWT ; le back doit donc **revalider** (`04` §B.11). Durée de vie JWT et type de clés (Q-008) **non vérifiés**.
- Les rôles sont par club (`club.roles`, `club-context.ts:43-67`) ; un `platform_admin` existe (`/v1/platform/*`).
- Espace public sans compte : identité = **jeton personnel** dans `?token=` (E-4) ; annuaire public à restreindre (R-013).
- Le back choisit d'appliquer l'autorisation en code (ADR-003 : rôle Postgres sans RLS).

## Options étudiées
**Vérification du JWT Supabase côté back**
| Option | Avantages | Inconvénients |
|---|---|---|
| A. Signature locale via **JWKS** (clés asymétriques) + contrôle `exp`/`aud`/`iss` | Pas d'appel réseau par requête ; rapide | Révocation non vue avant expiration ; exige des clés asymétriques (Q-008) |
| B. Introspection `GET {supabase}/auth/v1/user` à chaque requête | Révocation immédiate | +1 appel réseau par requête (le coût que ADR-001 vient de supprimer côté front) ; dépendance de disponibilité |
| C. **A par défaut + B pour les opérations sensibles** et en cache court | Compromis ; révocation vue sous quelques secondes pour l'essentiel | Deux chemins à tester |
| D. Secret symétrique HS256 partagé | Simple | Secret partagé = pas de séparation ; si les clés sont symétriques, c'est le seul mode local (Q-008) |

**Rôles** : lus en base **à chaque requête** (clé `(userId, clubId)`), cache mémoire ≤ 30 s (estimé) invalidé à l'écriture — jamais lus depuis le JWT (un rôle retiré s'applique immédiatement).

**Jeton personnel public**
| Option | Avantages | Inconvénients |
|---|---|---|
| A. Statu quo `?token=` | Zéro changement | Fuite dans journaux/Referer/historique (E-4, R-014) |
| B. En-tête (`Authorization: Bearer` / `X-Personal-Link-Token`), `?token=` toléré puis supprimé | Supprime la fuite côté journaux ; compatible en transition | Le **lien envoyé par e-mail** contient forcément le jeton (le lien « porte » l'identité) → le jeton doit être échangé côté front puis retiré de l'URL (`history.replaceState`) et stocké ailleurs |
| C. Cookie `HttpOnly` posé par le back après échange du lien | Insensible au vol XSS de `localStorage` (R-008) | Change l'architecture du lien perso, CSRF à traiter, domaines à aligner front/back |

## Décision (proposée)
1. **Option C (A + B sensible)** pour le JWT : JWKS en mémoire (rafraîchi), `exp` strict, `aud=authenticated`, `iss` du projet ; introspection `/auth/v1/user` (cache ≤ 10 s) pour : tout `POST/PUT/PATCH/DELETE`, `platform/*`, jobs d'écriture FBI, génération/réinitialisation de liens personnels. **Si Q-008 = clés symétriques** → introspection sur toutes les requêtes avec cache 10 s (ou secret partagé, option D, à éviter).
2. **Jeton personnel** : stocké **haché** (SHA-256 + sel/HMAC serveur) ; comparaison à temps constant ; durée de vie et révocation explicites (`DELETE …/me/token`) ; transport par en-tête (option B) en première étape, option C en évolution (LOT-14).
3. **Contrôles transverses** : middleware d'auth **par défaut** sur toute route (liste blanche des routes publiques) + test qui énumère les routes ; limitation de débit sur toutes les routes publiques et sur `request-link` (e-mail) ; CORS en liste blanche (domaine du front uniquement) ; validation Zod de toute entrée ; réponses 404 identiques pour « club inconnu » et « non membre » (comportement actuel, `club-context.ts:29-33`).
4. **Aucun secret dans le navigateur** (inchangé) ; le back ne reçoit jamais le mot de passe Supabase.

## Conséquences
- (+) R-011 refermé sur les actions sensibles ; R-014 refermé par le transport en en-tête ; énumération publique impossible par conception (B.1).
- (−) Dépend de Q-008 ; une incertitude (clés symétriques) change le coût (introspection partout).
- (−) Cache de rôles = fenêtre de ≤ 30 s où un rôle retiré s'applique encore ; acceptable pour des rôles de club, **à valider** par le propriétaire.
- À surveiller : latence de `/auth/v1/user` depuis Railway (non mesurée) ; rotation des clés JWKS ; journaux sans jeton ni donnée personnelle.

## Addendum 2026-10-07 — cible du transport du jeton personnel (R-014, Q-023)
Cible **retenue** : (1) lien d'e-mail avec le jeton en **fragment** (`…#token=<jeton>`), jamais transmis au serveur ni journalisé par Vercel ; (2) appels API avec l'en-tête **`X-Personal-Link-Token`** (et non `Authorization`, réservé au JWT Supabase). `?token=` reste accepté pendant la transition, puis est refusé (`400 TOKEN_IN_QUERY`). Côté front : le fragment est prioritaire sur la query ; l'URL est nettoyée (`history.replaceState`) dès la lecture ; le transport est isolé dans `src/lib/api/publicTokenTransport.ts` derrière `NEXT_PUBLIC_PUBLIC_TOKEN_HEADER` (défaut off). **Conséquence** : un en-tête personnalisé déclenche un préflight CORS ; `ball-manager-back` doit l'autoriser (`Access-Control-Allow-Headers`) **avant** l'activation du drapeau. Actions du propriétaire : voir `00-suivi-progression.md`.

## Addendum 2026-10-07 (2) — décisions validées
Validées par le propriétaire (Q-025) : (1) en-tête **`X-Personal-Link-Token`** (jamais `Authorization`) ; (2) **nettoyage de l'URL dès la lecture** du jeton, avant toute validation réseau, y compris en cas d'échec ; (3) revendication de fiche (R-018) : validateur `club_admin` seul, expiration 14 jours, **tout rôle à droits d'écriture exclu** du parcours public (Q-024).
