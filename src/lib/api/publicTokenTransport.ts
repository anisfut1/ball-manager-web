import { apiFetch, type ApiRequestInit } from "./client";

/**
 * Transport du jeton personnel public vers `ball-manager-back` (R-014, ADR-006
 * addendum 2026-10-07) : UN seul endroit décide si le jeton voyage en en-tête
 * ou en query string (`?token=`).
 *
 * DÉFAUT = en-tête `X-Personal-Link-Token` (lot 5c, 2026-11) : le jeton
 * n'apparaît plus dans les URL ni dans les journaux. `ball-manager-back`
 * l'accepte et l'autorise en CORS. Repli d'urgence : `NEXT_PUBLIC_PUBLIC_TOKEN_HEADER=0`
 * remet `?token=` (tant que le back l'accepte encore). `Authorization` n'est
 * pas utilisé (réservé au JWT Supabase).
 */
export const PUBLIC_TOKEN_HEADER = "X-Personal-Link-Token";

export function publicTokenHeaderEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PUBLIC_TOKEN_HEADER !== "0";
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
