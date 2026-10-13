/**
 * App mobile Ball Manager (ball-manager-app, docs/MOBILE_WEB_SUPPORT.md). Valeurs PUBLIQUES
 * (publiées par Apple dans le fichier AASA et dans l'App Store) : jamais un
 * secret ici. Surchargeables par variable d'environnement.
 */
export const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || "fr.ballmanager.app";

/** Team ID Apple Developer du compte Ball Manager (fourni le 2026-10-11). */
export const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || "YFZ72KY47V";

/** Identifiant App Store (numérique), connu seulement après la création de l'app dans App Store Connect. */
export function appStoreId(): string | null {
  const id = process.env.NEXT_PUBLIC_APP_STORE_ID;
  return id && /^\d{6,12}$/.test(id) ? id : null;
}

/** Schéma de rappel de la connexion depuis Safari (ASWebAuthenticationSession) — jamais une autre destination. */
export const IOS_AUTH_CALLBACK = `${IOS_BUNDLE_ID}://auth/callback`;

/**
 * Familles de chemins capturées par l'app (Universal Links). Exclues : espace
 * club `/c/*`, plateforme, connexion par compte, routes techniques, la page
 * de connexion de l'app elle-même (ouverte DANS Safari) et la session web.
 */
export const UNIVERSAL_LINK_COMPONENTS = [
  { "/": "/public/*/session", exclude: true, comment: "Session web (technique)" },
  { "/": "/public/*/auth/*", exclude: true, comment: "Connexion de l'app : reste dans Safari" },
  { "/": "/public/*/manifest.webmanifest", exclude: true, comment: "PWA" },
  { "/": "/public/*", comment: "Espace club par lien personnel : accueil, matchs, convocations, planning, équipes, dérogations, tables" },
  { "/": "/open/*", comment: "Réservé aux liens courts (open.ball-manager.fr, à valider)" },
];

export function appleAppSiteAssociation(teamId: string = APPLE_TEAM_ID, bundleId: string = IOS_BUNDLE_ID) {
  if (!/^[A-Z0-9]{10}$/.test(teamId)) return null;
  return {
    applinks: {
      details: [{ appIDs: [`${teamId}.${bundleId}`], components: UNIVERSAL_LINK_COMPONENTS }],
    },
  };
}
