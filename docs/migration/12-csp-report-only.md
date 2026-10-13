# 12 — LOT-14 (partie CSP) : en-têtes de sécurité et Content-Security-Policy en **Report-Only**
_2026-10-07. Implémenté : `src/config/security-headers.ts` (module pur), `next.config.ts` (`headers()`), `src/config/security-headers.test.ts` (13 tests). **La politique complète ne bloque rien** (seul `frame-ancestors 'none'` est appliqué depuis Q-021). Vérifié : build puis `next start` local, en-têtes présents sur `/login` et `/public/*` (`curl -I`). Non fait : R-008 (jeton public en `localStorage`), collecteur de rapports, passage en mode bloquant._

## 1. Ce qui est posé (toutes les routes)
| En-tête | Valeur | Mode |
|---|---|---|
| `Content-Security-Policy-Report-Only` | voir §2 | **observation seulement** (test : aucun en-tête `Content-Security-Policy` bloquant n'est posé) |
| `Content-Security-Policy` | `frame-ancestors 'none'` **uniquement** (en-tête séparé : la directive n'est pas garantie dans un en-tête Report-Only) | **appliqué** (Q-021 d.2) |
| `X-Frame-Options` | `DENY` | **appliqué** (Q-021 d.2) |
| `X-Content-Type-Options` | `nosniff` | appliqué |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | appliqué ; **déjà le défaut des navigateurs récents** (explicite pour R-014 : limite l'URL envoyée en `Referer` entre origines) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | appliqué ; aucun `getUserMedia`/`geolocation` dans `src/` (grep) |
Surcoût : **508 octets** d'en-têtes par réponse (mesuré sur la valeur servie, avec des origines factices).
**Volontairement absents** : `Strict-Transport-Security` (décision 3 : laissé à Vercel), COOP/COEP, `report-uri`/`report-to` (décision 4).

## 2. La politique (Report-Only) et ses sources, preuves à l'appui
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
font-src 'self'; connect-src 'self' <origine Supabase> <origine API>; frame-src 'none'; object-src 'none';
base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```
| Directive | Sources et justification | Preuve |
|---|---|---|
| `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` en `next dev` seulement) | Next injecte des scripts inline d'hydratation ; aucun script tiers : aucun `<Script>`, `<script>` ni domaine externe dans `src/` (grep). Sans nonce (docs Next « Without Nonces ») | `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md:417-452` ; absence de `<Script` (grep) |
| `style-src 'self' 'unsafe-inline'` | attributs `style` React (positions du planning, couleur d'accent par club) et styles injectés | `VenuePlanning.tsx:91,98,109,152`, `app/page.tsx:68`, `DaySummary.tsx:57` |
| `font-src 'self'` | `next/font/google` **télécharge les polices au build et les sert depuis le site** : aucun appel à Google Fonts à l'exécution | `src/app/layout.tsx:3-26` (Geist, Geist Mono, Instrument Serif, Space Grotesk) |
| `img-src 'self' data: blob:` | `'self'` : icônes et `BrandMark` (`next/image`, image locale) ; `data:` : logo de club téléversé converti en data URL ; `blob:` : prévisualisation. **Logos distants volontairement non autorisés** (voir décision 1) | `BrandMark.tsx:1,11` ; `ClubAppearanceForm.tsx:19,50,105` ; `Logo.tsx:56-57` et `Avatar.tsx:11` (`<img src>` distants : « logos distants hétérogènes (FFBB/Storage) ») |
| `connect-src 'self' <Supabase> <API>` | origine de `NEXT_PUBLIC_SUPABASE_URL` (authentification navigateur) et de `NEXT_PUBLIC_CLUB_MANAGER_API_URL` (tous les appels API depuis le navigateur). Pas de `wss:` : aucun Realtime (`.channel(`/`WebSocket` absents) | `lib/supabase/browser.ts:11`, `lib/api/client.ts:47`, `lib/api/config.ts:8`, `config/env.public.ts:50-52` |
| `frame-src 'none'` | aucun iframe | grep `<iframe` négatif |
| `object-src 'none'`, `base-uri 'self'` | durcissement standard | — |
| `form-action 'self'` | les formulaires sont des Server Actions du même site | `src/server/actions/*.ts` |
| `frame-ancestors 'none'` | anti-clickjacking (**appliquée** via l'en-tête `Content-Security-Policy` séparé ; la copie dans la politique Report-Only est informative) | — |
**Navigations sortantes** (non régies par ces directives) : lien vers `extranet.ffbb.com` (`ImportLicenciesPanel.tsx:168`), téléchargements de documents e-Marque par URL signée.
**Non couvert** : le futur nouveau back — à ajouter en `connect-src` via `extraConnectOrigins` quand `NEXT_PUBLIC_NEW_API_URL` existera (LOT-02, ADR-005). Les **prévisualisations Vercel** généreront des violations liées à la barre d'outils Vercel : à ignorer.

## 3. Comment lire les résultats (sans collecteur)
Aucun `report-uri` n'est configuré : les violations n'apparaissent **que dans la console du navigateur**, préfixées `[Report Only]`. Procédure : DevTools → Console (niveau « Erreurs »), parcourir `/c/<club>/matchs`, `/c/<club>/resultats`, `/c/<club>/admin/settings` (logo), `/public/<club>/matchs`, `/login`, noter chaque `Refused to load the image 'https://<hôte>/…'`. **Résultat attendu** : des violations `img-src` pour les logos d'adversaires et de clubs (hôtes inconnus à ce jour) ; aucune pour scripts, polices, `connect-src` ni formulaires. Cette liste d'hôtes est la donnée dont la décision 1 a besoin.

## 4. Décisions (Q-021 : **toutes les recommandations acceptées le 2026-10-07**)
| # | Décision | Options | Recommandation |
|---|---|---|---|
| **1** | **Logos distants** (`Logo.tsx:57`, `Avatar.tsx:11`) : quels hôtes autoriser en `img-src` ? | (a) liste d'hôtes relevée via §3 ; (b) `https:` (large, peu protecteur : n'importe quel hôte) ; (c) proxy/stockage maison des logos (changement d'architecture) | **(a)** après relevé ; (b) seulement si la liste est instable. Aujourd'hui **aucune liste fiable dans le dépôt** (hôte du CDN des logos FFBB inconnu) |
| **2** | `X-Frame-Options: DENY` en mode **appliqué** ? (`frame-ancestors` en Report-Only n'est pas garanti d'être évalué) | oui / non | **Oui**, si vous confirmez que le front n'est intégré dans aucun iframe (non vérifiable depuis le dépôt) |
| **3** | `Strict-Transport-Security` | laisser à Vercel / le poser | **Laisser à Vercel** (vérifier avec `curl -I https://<domaine-du-front>` : l'en-tête doit être présent) |
| **4** | **Collecteur de rapports** ? | aucun (console seule) / Route Handler qui journalise des rapports **nettoyés** / service tiers | **Aucun pour l'instant.** Un rapport contient `document-uri`, donc la **query string**, donc un éventuel `?token=` (R-014). Si vous en voulez un : il doit **supprimer la query string avant toute écriture** |
| **5** | Passer en mode **bloquant** ? | nonce par requête dans `proxy.ts` (rendu dynamique, déjà le cas ; incompatible PPR) / `'unsafe-inline'` conservé (protection XSS faible) | Pas avant ≥ 7 jours de relevé sans violation inattendue (estimé) ; **viser le nonce**, pas `'unsafe-inline'` |
| 6 | `style-src 'unsafe-inline'` | conserver (attributs `style` omniprésents) / refondre | Conserver ; non bloquant pour la sécurité des scripts |

## 5. Restes de LOT-14 (non faits)
- **R-008** : jeton public en `localStorage` (`publicToken.ts:19-28`). Pistes : cookie `HttpOnly` posé par le back après échange (change l'architecture du lien), CSP bloquante avec nonce (réduit la surface XSS). Dépend du nouveau back (ADR-006).
- **R-014** : fragment `#token=` dans le lien d'e-mail (le serveur ne le reçoit pas) — modification de `ball-manager-back` (ADR-007 §Conséquences de Q-017).

## 6. Relevé des hôtes de logos et passage en mode bloquant avec nonce (plan, **rien n'est exécuté**)

### 6.1 Procédure de relevé des hôtes de logos (à faire par le propriétaire, via la console)
Objectif : la liste exacte des hôtes d'images distantes (`Logo.tsx:56-57`, `Avatar.tsx:11`) à mettre en `img-src`. **Prérequis** : build déployé avec les en-têtes (production ou prévisualisation Vercel) ; navigateur de bureau sans extension qui modifie les pages (mode navigation privée recommandé).
1. Ouvrir DevTools → Console, filtre « Erreurs » (les violations Report-Only sont préfixées `[Report Only]`), cocher « Conserver le journal ».
2. Parcourir, **connecté en admin de club**, puis **déconnecté** : `/login`, `/c/<club>/dashboard`, `/c/<club>/matchs` (toutes les pages de la liste), `/c/<club>/resultats` (tous les onglets/équipes), `/c/<club>/admin/settings`, `/c/<club>/joueurs`, `/public/<club>/matchs`, un match ouvert (`/public/<club>/matchs/<id>`), `/public/<club>/resultats`. Faire défiler pour déclencher le chargement des images.
3. Coller ce script dans la console **après** le parcours, pour lister les hôtes d'images effectivement affichées (il ne lit que des noms d'hôtes) :
```js
[...new Set([...document.images].map(i => { try { return new URL(i.currentSrc || i.src).origin } catch { return null } }).filter(Boolean))].sort()
```
Pour les violations déjà journalisées, copier uniquement la partie `https://<hôte>` des lignes `Refused to load the image` (**sans chemin ni paramètre**).
4. Répéter sur **2 clubs** différents et sur mobile (images responsives). Noter la date et le périmètre parcouru.
**Livrable** : la liste dédoublonnée d'origines (`https://hôte`), l'état connecté/déconnecté de chaque page, et les hôtes vus **une seule fois** (candidats à une source instable). **Ne jamais** joindre une URL complète, un jeton, un nom de personne ou une capture d'écran montrant des données de licenciés.
**Décision attendue ensuite** : si la liste est stable (≤ ~10 hôtes) → `img-src 'self' data: blob: <liste>` (décision 1 (a)) ; sinon `https:` (b), à acter explicitement.

### 6.2 Plan de passage en mode bloquant avec nonce
**Prérequis (tous requis)**
- Relevé §6.1 terminé et liste d'hôtes intégrée à `img-src` **en Report-Only d'abord**.
- **≥ 7 jours** (jours calendaires, dont un week-end de matchs) d'observation du Report-Only en production, par le propriétaire, **sans violation inattendue** (sont attendues : barre d'outils Vercel en prévisualisation, extensions du navigateur).
- Le jeton a quitté les URLs (R-014 : fragment + nettoyage immédiat livrés côté front ; lien d'e-mail en fragment côté `ball-manager-back`) — sinon la CSP bloquante n'apporte rien contre la fuite de jeton et le relevé reste pollué par `document-uri`.
- Lecture de `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` § « With Nonces » le jour J (AGENTS.md : l'API de ce Next peut avoir changé).
**Étapes**
1. **Branche dédiée** : générer un nonce par requête dans `src/proxy.ts` (fonction existante de proxy), le poser en `x-nonce` (requête) et dans l'en-tête de réponse ; construire `script-src 'self' 'nonce-<n>' 'strict-dynamic'` (+ `'unsafe-eval'` en `next dev` seulement). `style-src` reste `'self' 'unsafe-inline'` (décision 6).
2. Vérifier que **toutes** les routes sont rendues dynamiquement (sinon le nonce est figé dans du HTML mis en cache) et que le PPR n'est pas actif ; test automatisé : deux requêtes successives → deux nonces différents, et le nonce de l'en-tête apparaît dans les balises `<script>` du HTML.
3. Déployer en **prévisualisation** avec la politique à nonce **toujours en Report-Only** ; refaire le parcours §6.1 ; critère : **zéro** violation `script-src`.
4. Publier en production la politique à nonce **en Report-Only** ; observer ≥ 7 jours (critère de bascule ci-dessous).
5. **Bascule** : renommer l'en-tête en `Content-Security-Policy` (en conservant `frame-ancestors 'none'`), déployer, surveiller la console sur les parcours §6.1 et les retours des bénévoles pendant 48 h.
**Critère de bascule (après les 7 jours)** : (a) zéro violation `script-src`/`connect-src`/`form-action`/`frame-*` attribuable à l'application sur les parcours §6.1 refaits à J+7 ; (b) toutes les violations `img-src` restantes sont soit ajoutées à la liste, soit acceptées explicitement ; (c) aucune régression fonctionnelle signalée ; (d) le propriétaire valide par écrit. Sinon : prolonger de 7 jours.
**Rollback** : remettre l'en-tête en `Content-Security-Policy-Report-Only` (une ligne dans `security-headers.ts`) et redéployer, **ou promouvoir le déploiement Vercel précédent** (retour immédiat, aucun état à restaurer). Prévoir ce rollback testé en prévisualisation avant la bascule.
**Hors périmètre** : aucun collecteur de rapports (Q-021 d.4) ; si un jour il en existe un, il doit supprimer la query string **et le fragment** de `document-uri` avant toute écriture.

## 7. Décision validée (2026-10-07, Q-025)
L'en-tête `Content-Security-Policy` **séparé, limité à `frame-ancestors 'none'`**, posé en plus de `Content-Security-Policy-Report-Only` (politique complète) et de `X-Frame-Options: DENY`, est **validé** par le propriétaire. Le mode bloquant complet suit le plan du §6.
