# Session persistante + PWA (espace public `/public/{club}`)

## Audit — pourquoi il fallait « retrouver son lien »

Le lien personnel (`?token=` / `#token=`) était la seule identité. Il était mémorisé :
- dans `localStorage` (`scsb:public-token:{slug}`, `scsb:public-tokens:{slug}`) ;
- dans un cookie **écrit en JavaScript** (`scsb-public-known`, simple marqueur).

Problèmes :
1. **Safari (ITP) efface le stockage et plafonne à 7 jours les cookies écrits en JS** pour un site non consulté pendant 7 jours → retour « inconnu ».
2. **Une PWA iOS a son propre `localStorage`** : rien n'est copié depuis Safari. Seuls les *cookies* le sont (iOS ≥ 17.2, à l'ajout à l'écran d'accueil).
3. Un jeton longue durée lisible par n'importe quel script (XSS) dans `localStorage`.
4. Navigateurs intégrés (WhatsApp, Instagram…) : stockage isolé de Safari.

## Ce qui a été fait

`/public/{slug}/session` (`src/app/public/[clubSlug]/session/route.ts`) :
- `POST {tokens, active?}` : chaque **nouveau** jeton est revalidé côté serveur (`GET …/me` de ball-manager-back), puis rangé dans le cookie `bm_session` : **chiffré AES-256-GCM, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/public/{slug}`** (un cookie par club → isolation), 90 jours glissants (renouvelé au plus 1×/jour), plafond absolu 365 jours.
- `GET` : restitue les jetons de la session de CE club (le front les garde **en mémoire**, jamais dans un stockage).
- `DELETE {tokens?}` : retire des jetons (révoqués, « oublier ») ou toute la session (déconnexion).
- Le marqueur `scsb-public-known` est désormais posé **par le serveur** (échappe au plafond de 7 jours).
- Anti-CSRF : en-tête obligatoire `x-bm-csrf: 1`, `Origin` identique, `Sec-Fetch-Site` ≠ `cross-site` ; `SameSite=Lax`.
- Révocation : le jeton est revalidé par l'API à chaque ouverture (jeton révoqué côté club → retiré de la session) ; **globale** via `SESSION_EPOCH`.
- **Magic links déjà distribués : inchangés** (`?token=` et `#token=`), consommés puis retirés de l'URL comme avant.
- **Migration automatique** : un jeton présent dans l'ancien `localStorage` est transféré dans la session puis supprimé du `localStorage`.
- **Sans `SESSION_SECRET`** (≥ 32 car.) la route répond 503 et le front retombe sur l'ancien comportement : rien ne casse si la variable n'est pas encore posée.

### À configurer (Vercel)
`SESSION_SECRET` (secret, `openssl rand -base64 48`), `SESSION_EPOCH` (optionnel, défaut `1`).

### PWA
- Manifeste plateforme `/manifest.webmanifest` et manifeste par club `/public/{slug}/manifest.webmanifest` (`start_url` = `/public/{slug}/accueil?source=pwa`, `scope` = espace du club, `display: standalone`, icônes 192/512/maskable, `apple-touch-icon`). **Aucun jeton** dans le manifeste.
- `public/sw.js` : cache **uniquement** statique non personnel (`/_next/static/*`, icônes, `offline.html`). Jamais de HTML, d'API ni de cookie en cache → rien ne fuit entre utilisateurs sur un appareil partagé. Mise à jour : bannière « Nouvelle version disponible » (`skipWaiting` seulement sur clic), revérification à chaque retour au premier plan.
- `InstallAppButton` (en-tête public) : invite native Android, tutoriel iPhone (Partager → « Sur l'écran d'accueil » → « Ajouter »), détection des navigateurs intégrés (Instagram, Facebook, WebView…) avec consigne « Ouvrir dans Safari/Chrome » ; masqué en mode standalone.
- `PwaReconnectNotice` : si la PWA ne reconnaît personne → « Me reconnaître » (nom → e-mail → nouveau lien, une seule fois dans l'appli).
- Safe areas : `viewport-fit=cover` + `env(safe-area-inset-*)` déjà utilisés par la barre du bas.
- Web Push : voir `docs/PWA_PUSH.md` (préparé, inactif).

## Limitations connues (à ne pas promettre)
- **Safari ↔ PWA** : les cookies ne sont copiés qu'**au moment de l'ajout** à l'écran d'accueil (iOS ≥ 17.2) ; ensuite les deux sessions vivent séparément. Si le lien a été ouvert dans le navigateur intégré de WhatsApp, rien n'est transféré → parcours « Me reconnaître ».
- Le jeton reste lu en mémoire par le JavaScript de la page (le front appelle encore ball-manager-back directement avec le jeton, `publicFetch`). Aller plus loin (cookie jamais exposé au JS) exige que **ball-manager-back** accepte une session (cookie/jeton de session émis par l'API) ou qu'un proxy Next relaie chaque appel — non fait ici : le dépôt ball-manager-back n'est pas dans cet environnement.
- La révocation d'un lien côté club est effective dès la prochaine ouverture (revalidation), pas en temps réel.
- Un cookie `Secure` n'est pas posé en `http://localhost` sous Safari : tester en HTTPS (preview Vercel / tunnel).

## Tests automatisés (`npm test`)
`session.test.ts` (chiffrement, expiration 90 j / plafond 365 j, renouvellement, époque, CSRF), `route.test.ts` (première connexion, retour sans token, expiration, isolation entre clubs, changement de profil, déconnexion, révocation, 403 CSRF, 503 sans secret), `PublicIdentityProvider.test.tsx` (session, migration localStorage, repli), `platform.test.ts` (iPhone/Android/in-app), `manifest.test.ts` (manifeste, icônes, garde-fous du SW). Vérifié aussi sur un `next build` + `next start` réels avec une API simulée (cookies HttpOnly/Secure/SameSite, isolation de club, DELETE).

## Validation sur appareils réels (non automatisable)
Prérequis : preview HTTPS avec `SESSION_SECRET`. Lien personnel de test dans l'e-mail/WhatsApp.

**iPhone (iOS ≥ 17.2)**
1. WhatsApp → toucher le lien → « Ouvrir dans Safari » (l'ouvrir dans WhatsApp = cas dégradé, voir 6).
2. L'accueil s'affiche, **l'URL ne contient plus `token`**. Fermer Safari complètement, ouvrir `…/public/sc-sete-basket/accueil` : reconnu.
3. Bouton « Installer Ball Manager » → tutoriel ; Partager → « Sur l'écran d'accueil » → Ajouter.
4. Lancer l'icône : ouverture directe sur l'accueil du club, sans barre Safari, barre du bas non coupée par la barre d'accueil. Reconnu sans action = copie de cookies OK.
5. Réouvrir la PWA 2–3 jours plus tard (et Safari après > 7 jours) : toujours reconnu.
6. Cas dégradé (lien ouvert dans WhatsApp, ou iOS < 17.2) : la PWA affiche « Me reconnaître » → nom → e-mail → lien à ouvrir **dans la PWA**.
7. Mode avion dans la PWA : page « Vous êtes hors ligne », puis « Réessayer » au retour du réseau.
8. Menu compte → « Oublier ce navigateur » : retour à l'état inconnu, et la session serveur est effacée (réouvrir l'URL : non reconnu).
9. Appareil partagé : oublier, puis ouvrir le lien d'une autre personne : c'est ce profil qui s'affiche, pas le précédent.

**Android (Chrome)**
1. Ouvrir le lien, « Installer Ball Manager » → invite native ; installer ; lancer l'icône : reconnu (même profil Chrome).
2. Tester depuis le navigateur intégré d'une app (Instagram/WhatsApp) : consigne « Ouvrir dans Chrome ».
3. Même scénarios hors ligne / déconnexion / révocation (révoquer le lien côté club → à la prochaine ouverture, retour à « Me reconnaître »).

**Mise à jour de la PWA** : déployer une nouvelle version, rouvrir la PWA : bannière « Nouvelle version disponible » → « Mettre à jour » recharge l'appli.
