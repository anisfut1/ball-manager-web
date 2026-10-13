import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

/**
 * Régénère src/lib/api/generated/schema.ts depuis le contrat OpenAPI RÉEL
 * de ball-manager-back (§2/§3 de la demande) — jamais deviné à partir du
 * README. Voir docs/API_CLIENT.md pour le workflow complet.
 *
 * Source, dans l'ordre de priorité :
 *   1. CLUB_MANAGER_OPENAPI_URL (variable d'environnement dédiée à cette
 *      commande, jamais NEXT_PUBLIC_CLUB_MANAGER_API_URL directement : on
 *      ne veut pas qu'un simple `npm run dev` déclenche un appel réseau).
 *   2. http://localhost:3001/openapi.json (backend ball-manager-back lancé
 *      en local via `npm run dev` dans ce repository-là).
 */
const DEFAULT_URL = "http://localhost:3001/openapi.json";
const OUTPUT_PATH = "src/lib/api/generated/schema.ts";

const BANNER = `/**
 * AUTO-GENERATED — DO NOT EDIT.
 *
 * Généré depuis le contrat OpenAPI de ball-manager-back via
 * \`npm run api:generate\`. Toute modification manuelle sera perdue à la
 * prochaine génération. Voir docs/API_CLIENT.md.
 */
`;

async function main(): Promise<void> {
  const source = process.env.CLUB_MANAGER_OPENAPI_URL || DEFAULT_URL;
  console.log(`[api:generate] Lecture du contrat OpenAPI depuis ${source}…`);

  const schemaInput = source.startsWith("http") ? new URL(source) : source;

  let ast: Parameters<typeof astToString>[0];
  try {
    ast = await openapiTS(schemaInput);
  } catch (error) {
    console.error(
      `[api:generate] Échec de lecture du contrat OpenAPI depuis ${source}.\n` +
        "ball-manager-back doit être lancé et accessible (npm run dev dans ce repository-là), " +
        "ou CLUB_MANAGER_OPENAPI_URL doit pointer vers un backend déployé accessible.\n",
    );
    throw error;
  }

  const contents = BANNER + astToString(ast);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, contents, "utf-8");

  console.log(`[api:generate] Types écrits dans ${OUTPUT_PATH}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
