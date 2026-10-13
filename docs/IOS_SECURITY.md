# Sécurité de l'app mobile Ball Manager

L'app mobile est **`ball-manager-app`** (Expo / React Native), l'unique application mobile de Ball Manager. Son architecture est décrite dans `ball-manager-app/docs/MOBILE_ARCHITECTURE.md` et `ball-manager-app/docs/AUTH.md`, les routes dans `ball-manager-back/docs/MOBILE_AUTH.md`, les notifications dans `docs/IOS_PUSH.md`. Ce dépôt (`ball-manager-web`) ne fournit que le support web : AASA, pages de connexion ouvertes dans Safari, pages légales.

## Une seule identité, aucun compte

- L'identité reste le **licencié du lien personnel**, émis par le club. L'app ne crée aucun compte : ni mot de passe, ni Sign in with Apple, ni inscription.
- Elle reçoit une **session d'appareil**, dérivée de ce lien et révocable. Le jeton permanent du lien n'est **jamais** stocké sur l'iPhone : il est échangé une seule fois (`POST …/auth/device-sessions`), puis oublié.
- Il n'y a pas de suppression de compte dans l'app, puisqu'aucun compte n'y est créé. « Se déconnecter » révoque la session et le jeton push. La suppression des données passe par le club (voir `/confidentialite`).

## Stockage sur l'iPhone

| Donnée | Où | Protection |
|---|---|---|
| Secret de session (`bmd_…`, 32 octets aléatoires) | Keychain via `expo-secure-store` | `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` : pas de sauvegarde iCloud, pas de transfert vers un autre iPhone |
| Personnes, club actif, préférences | Keychain via `expo-secure-store` | idem |
| Destination en attente (lien ouvert avant connexion) | mémoire uniquement | effacée après usage |

Aucun secret ni donnée personnelle hors du Keychain. Côté serveur, seul le **SHA-256** du secret est conservé.

## Transport et requêtes

- HTTPS uniquement, vers l'API (`EXPO_PUBLIC_API_URL`, fixée au build par profil EAS). Aucune exception ATS.
- En-têtes : `Authorization: Bearer <secret>` et `X-BM-As: <licencieId>`. Chaque requête est vérifiée par `licencieFromRequest` : session de **ce** club, non révoquée, non expirée, et personne présente dans la session avec un lien encore valide. Sinon 401 ou 403.
- CORS ne concerne que le web : l'app native n'envoie pas d'en-tête `Origin`. Il n'y a aucun cookie côté API, donc aucun risque CSRF.

## Pas de WebView

- Les écrans sont **natifs** (React Native) : aucun site distant n'est chargé dans l'app.
- Les liens hors de l'espace public (espace club par compte, pages légales) s'ouvrent dans **Safari** (`expo-web-browser`).

## Connexion depuis Safari (SSO)

`ASWebAuthenticationSession` partage les cookies de Safari (`prefersEphemeral = false`) :

1. L'app génère `code_verifier` (`expo-crypto`), `code_challenge` (S256) et `state` (aléatoire).
2. La page `/public/{slug}/auth/app`, déjà identifiée par le cookie `bm_session`, demande un code à l'API.
3. Ce code est **lié au challenge**, valable **5 min** et à **usage unique** (mise à jour conditionnelle `used_at is null`).
4. Le rappel `fr.ballmanager.app://auth/callback` est intercepté **uniquement** par la session d'authentification. Le `state` est comparé et rejeté s'il diffère.
5. `POST …/auth/token` exige le `code_verifier`. Un code intercepté est donc inutilisable sans lui.

Garanties côté serveur : PKCE S256 seul, jamais `plain`, et comparaison en temps constant. La destination n'accepte qu'un chemin `/public/…` (sans `//`, sans `..`, sans URL externe).

## Liens entrants (Universal Links, liens collés, push)

Un résolveur unique et pur (`ball-manager-app/src/linking/`, `+native-intent` → `resolveDestination`), couvert par des tests unitaires.
- Seuls `https://www.ball-manager.fr`, `ball-manager.fr` et `open.ball-manager.fr` sont acceptés. Tout autre domaine, et le `http`, sont rejetés.
- Le chemin est normalisé, et toute tentative `..` est refusée. Une route inconnue mène à l'accueil.
- `?token=` et `#token=` : le jeton est échangé puis **retiré** du chemin. Il n'est jamais conservé ni affiché.
- Une URL ne prouve **jamais** un droit. L'écran demande ensuite la session, et l'API vérifie.
- Les routes techniques (`/auth/*`, `/session`, manifest) sont exclues de l'AASA et ne sont jamais ouvertes comme un écran.
- Anti-doublon : la même URL livrée deux fois au démarrage n'est traitée qu'une fois.

## Préchargement des liens par les messageries

Aucune requête GET ne consomme un code ni ne crée de session. Un scanner d'email qui « clique » sur un lien n'a aucun effet.

## Limites de débit

Elles s'appliquent par IP sur toutes les routes d'émission (sessions, codes, échanges, personnes, jeton push) : 429 `RATE_LIMITED`.

## Mineurs

- Accès limité aux personnes prouvées par leur lien : la sienne et celles de ses enfants.
- Les autres familles ne voient ni email, ni téléphone, ni date de naissance.
- Notifications sans nom. Aucune publicité, aucun suivi, aucun SDK tiers d'analyse.

## Révocation : récapitulatif

| Événement | Effet dans l'app |
|---|---|
| Se déconnecter | session révoquée, jeton push révoqué |
| Retirer une personne | droit supprimé |
| Admin réinitialise le lien | perte d'accès à cette personne dès la requête suivante, plus de notifications pour elle |
| « Lien perdu ? » vers la même adresse | la session continue (droits transférés au nouveau lien) |
| 180 jours sans usage | session expirée, nouvelle connexion demandée |
| App supprimée | APNs répond `Unregistered`, le jeton est révoqué |

## Journaux

Aucune donnée personnelle ni secret dans les journaux, côté API comme côté app : erreurs génériques seulement. Le dépôt `ball-manager-back` est public.
