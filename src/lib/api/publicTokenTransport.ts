import { apiFetch, type ApiRequestInit } from "./client";

/**
 * Transport du jeton personnel public vers `ball-manager-back` (R-014, ADR-006
 * addendum 2026-10-07) : UN seul endroit décide si le jeton voyage en query
 * string (`?token=`, comportement d'origine) ou en en-tête.
 *
 * Le mode en-tête est derrière `NEXT_PUBLIC_PUBLIC_TOKEN_HEADER=1`
 * (DÉFAUT = query). Ne l'activer qu'APRÈS que `ball-manager-back` accepte
 * `X-Personal-Link-Token` ET l'autorise en CORS (`Access-Control-Allow-Headers`) :
 * un en-tête personnalisé déclenche un préflight, et sans cela chaque appel
 * public échouerait. `Authorization` n'est pas utilisé (réservé au JWT Supabase).
 */
export const PUBLIC_TOKEN_HEADER = "X-Personal-Link-Token";

export function publicTokenHeaderEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PUBLIC_TOKEN_HEADER === "1";
}

export interface PublicFetchInit extends ApiRequestInit {
  /** Paramètres de query autres que le jeton (les valeurs `undefined` sont omises). */
  query?: Record<string, string | undefined>;
}

export function publicFetch<T>(path: string, token: string, init: PublicFetchInit = {}): Promise<T> {
  const { query = {}, headers, ...rest } = init;
  const useHeader = publicTokenHeaderEnabled();

  const search = new URLSearchParams(useHeader ? {} : { token });
  for (const [key, value] of Object.entries(query)) if (value !== undefined) search.set(key, value);
  const qs = search.toString();

  const requestHeaders = new Headers(headers);
  if (useHeader) requestHeaders.set(PUBLIC_TOKEN_HEADER, token);

  return apiFetch<T>(qs ? `${path}?${qs}` : path, { ...rest, headers: requestHeaders });
}
