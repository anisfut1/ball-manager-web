import { apiFetch, type ApiFetcher } from "./client";
import type { components } from "./generated/schema";

/**
 * Comptes de l'espace licencié (email + mot de passe) — voir
 * ball-manager-back/docs/ACCOUNTS.md. Appelé depuis le NAVIGATEUR : les
 * limites de débit de l'API s'appliquent à l'adresse IP du visiteur.
 */
export type AccountSessionDto = components["schemas"]["AccountSessionDto"];
export type AccountDto = components["schemas"]["AccountDto"];
export type AccountPersonDto = components["schemas"]["AccountPersonDto"];
export type AccountLinkResultDto = components["schemas"]["AccountLinkResultDto"];
export type AccountInviteDto = components["schemas"]["AccountInviteDto"];
export type AdminAccountLinkDto = components["schemas"]["AdminAccountLinkDto"];

const club = (slug: string) => `/v1/public/clubs/${encodeURIComponent(slug)}/account`;

export function signUp(email: string, password: string): Promise<{ sent: true }> {
  return apiFetch("/v1/account/sign-up", { method: "POST", body: { email, password } });
}

export function resendSignUpCode(email: string): Promise<{ sent: true }> {
  return apiFetch("/v1/account/sign-up/resend", { method: "POST", body: { email } });
}

export function verifySignUp(email: string, code: string, password: string): Promise<AccountSessionDto> {
  return apiFetch("/v1/account/sign-up/verify", { method: "POST", body: { email, code, password } });
}

export function signIn(email: string, password: string): Promise<AccountSessionDto> {
  return apiFetch("/v1/account/sign-in", { method: "POST", body: { email, password } });
}

export function refreshAccount(refreshToken: string): Promise<AccountSessionDto> {
  return apiFetch("/v1/account/refresh", { method: "POST", body: { refreshToken } });
}

export function requestPasswordReset(email: string): Promise<{ sent: true }> {
  return apiFetch("/v1/account/password-reset", { method: "POST", body: { email } });
}

export function getAccount(slug: string, accessToken: string): Promise<AccountDto> {
  return apiFetch(club(slug), { accessToken });
}

export function linkLicencie(slug: string, accessToken: string, input: { licencieId: string; personalLinkToken?: string }): Promise<AccountLinkResultDto> {
  return apiFetch(`${club(slug)}/links`, { method: "POST", accessToken, body: input });
}

export function unlinkLicencie(slug: string, accessToken: string, licencieId: string): Promise<void> {
  return apiFetch(`${club(slug)}/links/${encodeURIComponent(licencieId)}`, { method: "DELETE", accessToken });
}

export function createInvite(slug: string, accessToken: string, licencieId: string): Promise<AccountInviteDto> {
  return apiFetch(`${club(slug)}/invites`, { method: "POST", accessToken, body: { licencieId } });
}

export function acceptInvite(slug: string, accessToken: string, code: string): Promise<AccountDto> {
  return apiFetch(`${club(slug)}/invites/accept`, { method: "POST", accessToken, body: { code } });
}

export function deleteAccount(slug: string, accessToken: string): Promise<void> {
  return apiFetch(club(slug), { method: "DELETE", accessToken });
}

// ─── Administration (compte staff, via `api.accountLinks`) ───────────────────

export async function listAccountLinks(fetcher: ApiFetcher, clubId: string, status?: "active" | "pending" | "refused"): Promise<AdminAccountLinkDto[]> {
  const { links } = await fetcher<{ links: AdminAccountLinkDto[] }>(`/v1/clubs/${encodeURIComponent(clubId)}/account-links${status ? `?status=${status}` : ""}`);
  return links;
}

export async function decideAccountLink(fetcher: ApiFetcher, clubId: string, linkId: string, decision: "accept" | "refuse"): Promise<void> {
  await fetcher(`/v1/clubs/${encodeURIComponent(clubId)}/account-links/${encodeURIComponent(linkId)}/${decision}`, { method: "POST" });
}
