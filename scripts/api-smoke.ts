/**
 * Vérification live minimale, SÉPARÉE de `npm test` (§52 de la demande) :
 * confirme que le backend configuré (NEXT_PUBLIC_CLUB_MANAGER_API_URL)
 * répond, sans aucun credential ni dépendance à un compte réel. N'est
 * jamais exécuté par `npm test` — uniquement `npm run api:smoke`, à la main
 * ou en CI optionnelle.
 */
import { publicEnv } from "../src/config/env.public";

async function main(): Promise<void> {
  const url = new URL("/health", publicEnv.NEXT_PUBLIC_CLUB_MANAGER_API_URL);
  console.log(`[api:smoke] GET ${url.toString()}`);

  const response = await fetch(url);

  if (!response.ok) {
    console.error(`[api:smoke] Échec : HTTP ${response.status}`);
    process.exit(1);
  }

  const body: unknown = await response.json();
  console.log(`[api:smoke] OK — ${JSON.stringify(body)}`);
}

main().catch((error: unknown) => {
  console.error("[api:smoke] ball-manager-back est injoignable :", error);
  process.exit(1);
});
