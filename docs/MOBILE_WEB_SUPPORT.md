# Support web de l'app mobile Ball Manager

L'**unique** application mobile de Ball Manager est **`ball-manager-app`** (Expo / React Native). Ce dépôt ne contient **aucune** application mobile : il fournit seulement ce dont l'app a besoin côté web.

| Élément | Où | Rôle |
|---|---|---|
| AASA (`/.well-known/apple-app-site-association`) | `src/app/api/aasa/route.ts`, réécriture dans `next.config.ts`, contenu dans `src/config/ios-app.ts` | Universal Links : servi en `application/json`, **sans redirection**, avec Team ID `YFZ72KY47V` et Bundle ID `fr.ballmanager.app` |
| Connexion de l'app depuis Safari | `/public/{slug}/auth/app` (`src/features/mobile-auth/AppSignInApp.tsx`, `sso-request.ts`) | Page ouverte par l'app (`ASWebAuthenticationSession`, PKCE S256) ; renvoie un code court vers `fr.ballmanager.app://auth/callback`, jamais ailleurs |
| Lien de connexion ouvert dans le navigateur | `/public/{slug}/connexion/code/{code}` (`LoginCodeApp.tsx`) | Si l'app est installée, le Universal Link l'ouvre directement ; sinon, connexion web |
| Destinations des liens | pages `/public/{slug}/…` | Repli web des Universal Links et des notifications (mêmes chemins que l'app) |
| Pages légales | `/confidentialite`, `/support` | URL de confidentialité et d'assistance de la fiche App Store |
| Smart App Banner | `src/app/public/[clubSlug]/layout.tsx` | Actif quand `NEXT_PUBLIC_APP_STORE_ID` est défini ; masque alors le bouton « Installer » (PWA) sur iPhone |
| Client de l'auth mobile côté web | `src/lib/api/deviceAuth.ts` | Les deux seuls appels faits par le web : `createSsoCode`, `exchangeForWeb` |

Contrats serveur (sessions d'appareil, codes PKCE, échange, jetons push, APNs) : `ball-manager-back/docs/MOBILE_AUTH.md` et `docs/IOS_PUSH.md`. Sécurité : `docs/IOS_SECURITY.md`. Fiche App Store, étapes Apple/EAS et tests sur iPhone : `ball-manager-app/docs/APP_STORE.md`, `ball-manager-app/MANUAL_STEPS.md`, `ball-manager-app/docs/IOS_TEST_MATRIX.md`.

## Réglages côté web

- **`NEXT_PUBLIC_SUPPORT_EMAIL`** (Vercel) : boîte réellement lue, affichée sur `/confidentialite` et `/support`.
- **`NEXT_PUBLIC_APP_STORE_ID`** (Vercel), après publication de l'app : active le Smart App Banner.
- **`APPLE_TEAM_ID`** / **`IOS_BUNDLE_ID`** : facultatifs (défauts `YFZ72KY47V` / `fr.ballmanager.app`).
- **Domaine nu** `ball-manager.fr` : il redirige en général vers `www`, et Apple ne suit pas les redirections. L'app ne déclare donc que `applinks:www.ball-manager.fr`.

## Liens dans les emails (Resend)

Le **suivi des clics** de Resend réécrit chaque lien vers un domaine de redirection : iOS n'ouvre alors **pas** l'app. Il doit être **désactivé** pour le domaine d'envoi (Resend → Domains → Configuration → Click tracking : off). Le code n'active aucun suivi. Réglage non vérifiable depuis le code.

## Vérification de l'AASA

```sh
curl -sSI https://www.ball-manager.fr/.well-known/apple-app-site-association   # 200, application/json, pas de Location
curl -sS  https://www.ball-manager.fr/.well-known/apple-app-site-association
```

Un AASA correct en production **ne valide pas** les Universal Links : seul un test sur iPhone avec l'app installée le fait.
