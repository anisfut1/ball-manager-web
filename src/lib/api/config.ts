import { publicEnv } from "@/config/env.public";

/**
 * Point d'entrée UNIQUE pour l'URL du backend ball-manager-back — jamais
 * d'URL en dur ailleurs dans le code (§4 de la demande). Dérivée de
 * `publicEnv`, déjà validée (voir src/config/env.public.ts).
 */
export const CLUB_MANAGER_API_URL = publicEnv.NEXT_PUBLIC_CLUB_MANAGER_API_URL;
