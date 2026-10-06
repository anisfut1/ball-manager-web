/**
 * Shim de `@/config/env.public` : le film n'appelle jamais l'API ni Supabase,
 * mais certains modules réels (client HTTP, client Supabase) lisent l'env au
 * chargement. Valeurs factices, non routables (.invalid).
 */
export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://film.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "film",
  NEXT_PUBLIC_CLUB_MANAGER_API_URL: "https://film.invalid",
};
export type PublicEnv = typeof publicEnv;
export function parsePublicEnv() {
  return publicEnv;
}
