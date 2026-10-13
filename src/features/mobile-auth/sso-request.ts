import { IOS_AUTH_CALLBACK } from "@/config/ios-app";

/**
 * Paramètres de la page `/public/{slug}/auth/app`, ouverte par l'app iOS dans
 * ASWebAuthenticationSession (module PUR, testé). Toute valeur inattendue
 * rend la demande invalide : jamais de redirection vers une destination
 * fournie par un tiers.
 */
export interface SsoRequest {
  codeChallenge: string;
  state: string;
  redirectPath: string | null;
}

export function parseSsoRequest(params: Record<string, string | string[] | undefined>, clubSlug: string): SsoRequest | null {
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : null);
  const challenge = one("code_challenge");
  const state = one("state");
  if (one("code_challenge_method") !== "S256" || !challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) return null;
  if (!state || !/^[A-Za-z0-9_-]{16,128}$/.test(state)) return null;
  if (one("redirect_uri") !== IOS_AUTH_CALLBACK) return null;
  const path = one("redirect_path");
  const safePath = path && path.startsWith(`/public/${clubSlug}/`) && !path.includes("//") && !path.includes("..") && path.length <= 300 ? path : null;
  return { codeChallenge: challenge, state, redirectPath: safePath };
}

export function callbackUrl(params: { code: string; state: string } | { error: string; state: string }): string {
  return `${IOS_AUTH_CALLBACK}?${new URLSearchParams(params).toString()}`;
}
