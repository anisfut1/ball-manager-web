# ADR-001 — Une seule résolution d'authentification par requête, `getClaims()`
- **Date** : 2026-10-07
- **Statut** : Acceptée (Q-008 non vérifiable, voir Contexte) — implémentée au LOT-01

## Contexte
- TRT-002 : chaque `api.*` côté serveur appelait `getUser()` (aller-retour réseau Supabase Auth) + `getSession()` (`auth.server.ts`, ancienne version l.16-22), le proxy appelait `getUser()` (`proxy.ts:39`) et `requireUser()` aussi. Mesure par test de caractérisation (`src/lib/api/auth-calls.test.ts`) : **8 `getUser()` pour le rendu** d'un tableau de bord admin + 1 dans le proxy = **9 allers-retours**.
- Q-008 (clés JWT asymétriques ?) : la consigne était d'interroger `https://<projet>.supabase.co/auth/v1/.well-known/jwks.json`. **Impossible ici** : l'URL du projet n'est ni dans le dépôt (`.env.example` ne contient qu'un placeholder, aucun `.env.local`) ni dans les docs. Aucune requête n'a été faite. → on retient l'option valable dans les deux cas (point suivant) ; la vérification reste à faire par le propriétaire (voir « À surveiller »).
- Fait vérifié dans le code installé (`@supabase/auth-js` 2.116.0, `GoTrueClient.js:5510-5579`) : `getClaims(jwt)` (1) rejette un JWT expiré, (2) vérifie la signature avec la clé JWKS (mise en cache) **si** l'algorithme est asymétrique et que WebCrypto existe, (3) **sinon appelle `getUser(token)`** — donc jamais moins strict que l'ancien comportement.

## Options étudiées
| Option | Appels réseau Auth / navigation | Sécurité | Verdict |
|---|---|---|---|
| A. Statu quo (`getUser()` à chaque appel) | 9 | Révocation vue immédiatement | ❌ coût inutile |
| B. `cache()` autour de la résolution, en gardant `getUser()` | 2 (proxy + rendu) | Identique à A | ✅ sûr, gain ×4,5 |
| C. B + `getClaims()` (vérif. locale si asymétrique, sinon repli `getUser()`) | 2 si symétrique ; **0** (hors 1ʳᵉ récupération JWKS) si asymétrique | Identique à A si symétrique ; sinon révocation vue à l'expiration du JWT (≤ durée de vie du token) | ✅ **retenue** |
| D. `getSession()` seul (sans vérification) | 0 | Cookie non vérifié côté serveur | ❌ refusé |

## Décision
Option C : `getServerAuth()` (`src/lib/api/auth.server.ts`) enveloppé dans `cache()` React (portée = une requête) ; `getServerAccessToken()`, `getCurrentUser()` et `requireUser()` s'appuient dessus ; le proxy utilise `getClaims()`. Aucun `getUser()` direct ne subsiste dans `src/` hors Server Actions de connexion (`createServerSupabaseClient` dans `server/actions/auth.ts`).
`getCurrentUser()` renvoie désormais `SessionUser { id, email }` (claims) au lieu du `User` Supabase complet ; aucun appelant n'utilisait d'autre champ (`login/page.tsx`, `shell/session.ts`, `platform.ts`).

## Conséquences
- **Positives** : 9 → au plus 2 appels « réseau possibles » (proxy + rendu), un seul par runtime ; 0 appel réseau dans le cas asymétrique. Mesuré par test : rendu = 1 `getClaims`, 0 `getUser`.
- **Négatives / sécurité** :
  - Cas asymétrique : un utilisateur dont la session a été **révoquée** (déconnexion globale, compte supprimé/banni) reste accepté par le proxy et les gardes serveur **jusqu'à l'expiration de son JWT** (durée par défaut Supabase : 1 h, à confirmer). Risque R-011. Atténuation : `ball-manager-back` revalide le JWT et porte l'autorisation ; **à confirmer** qu'il ne se contente pas non plus d'une vérification locale (Q-001).
  - Les routes `/public/*` ne sont pas concernées (pas de session).
- **À surveiller** : (1) Q-008 — lancer `curl https://<projet>.supabase.co/auth/v1/.well-known/jwks.json` : une liste de clés non vide = asymétrique ; (2) durée de vie du JWT dans les réglages Auth du projet ; (3) si le back expose un endpoint de révocation immédiate, recourir à `getUser()` pour les actions sensibles.
- **Rollback** : `git revert` du commit LOT-01 (tests de caractérisation inclus).
