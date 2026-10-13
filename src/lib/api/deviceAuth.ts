import { apiFetch } from "./client";
import type { components } from "./generated/schema";

/**
 * Pont web de l'authentification de l'app mobile Ball Manager (ball-manager-app ;
 * contrat : ball-manager-back/docs/MOBILE_AUTH.md). Utilisé par deux pages web :
 * `/public/{slug}/auth/app` (connexion depuis Safari) et
 * `/public/{slug}/connexion/code/{code}` (lien de connexion ouvert dans le navigateur).
 */
export type AuthCodeDto = components["schemas"]["AuthCodeDto"];

const base = (clubSlug: string) => `/v1/public/clubs/${encodeURIComponent(clubSlug)}/auth`;

export const deviceAuth = {
  /** Page ouverte par l'app dans Safari : code court lié au PKCE de l'app. */
  createSsoCode: (clubSlug: string, tokens: string[], codeChallenge: string, redirectPath?: string) =>
    apiFetch<AuthCodeDto>(`${base(clubSlug)}/codes`, { method: "POST", body: { tokens, codeChallenge, codeChallengeMethod: "S256", redirectPath } }),
  /** Lien de connexion par email ouvert dans le navigateur → lien personnel pour la session web existante. */
  exchangeForWeb: (clubSlug: string, code: string) => apiFetch<{ tokens: string[]; redirectPath: string | null }>(`${base(clubSlug)}/token`, { method: "POST", body: { code, platform: "web" } }),
};
