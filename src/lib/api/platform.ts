import type { ApiFetcher } from "./client";
import type { components } from "./generated/schema";

export type PlatformClubDto = components["schemas"]["PlatformClubDto"];
export type CreateClubDto = components["schemas"]["CreateClubDto"];
export type PurgeEmarqueDocumentsResultDto = components["schemas"]["PurgeEmarqueDocumentsResultDto"];
export type DeleteOldSeasonsResultDto = components["schemas"]["DeleteOldSeasonsResultDto"];
export type RetryFailedEmarqueImportsResultDto = components["schemas"]["RetryFailedEmarqueImportsResultDto"];

/** GET /v1/platform/clubs — §24 de la demande, réservé platform_admin (vérifié côté backend). */
export async function listPlatformClubs(fetcher: ApiFetcher): Promise<PlatformClubDto[]> {
  const { clubs } = await fetcher<{ clubs: PlatformClubDto[] }>("/v1/platform/clubs");
  return clubs;
}

/** POST /v1/platform/clubs — §24 de la demande : invitation gérée par le backend (`inviteUserByEmail`), jamais depuis le frontend. */
export async function createClub(fetcher: ApiFetcher, body: CreateClubDto): Promise<{ clubId: string; slug: string; adminInviteError: string | null }> {
  return fetcher(`/v1/platform/clubs`, { method: "POST", body });
}

/**
 * POST /v1/platform/maintenance/purge-emarque-documents — retour du club,
 * 2026-09-29 : "je veux juste l'interpréter... pas la stocker", appliqué
 * rétroactivement à tout document déjà stocké. Idempotente, jamais
 * destructive pour les stats déjà en base (voir docs/EMARQUE.md côté
 * ball-manager-back).
 */
export async function purgeEmarqueDocuments(fetcher: ApiFetcher): Promise<PurgeEmarqueDocumentsResultDto> {
  return fetcher(`/v1/platform/maintenance/purge-emarque-documents`, { method: "POST" });
}

/**
 * POST /v1/platform/maintenance/delete-old-seasons — retour du club,
 * 2026-09-29 : "focus saison 2026-2027". IRRÉVERSIBLE — supprime tous les
 * matchs du club antérieurs à la saison en cours (cascade FK sur toutes
 * les données liées). La confirmation utilisateur est de la responsabilité
 * de l'UI appelante (voir `DangerZone.tsx`).
 */
export async function deleteOldSeasons(fetcher: ApiFetcher, clubId: string): Promise<DeleteOldSeasonsResultDto> {
  return fetcher(`/v1/platform/maintenance/delete-old-seasons`, { method: "POST", body: { clubId } });
}

/**
 * POST /v1/platform/maintenance/retry-failed-emarque-imports — retour du
 * club, 2026-09-29 : "faut que ce soit fait sur tous les matchs, sans bug,
 * sans interruption". Relance les matchs e-Marque restés en erreur en
 * réutilisant le fichier déjà téléchargé (jamais un nouveau login FBI) —
 * voir docs/EMARQUE.md côté ball-manager-back. Sans effet sur les matchs
 * `needs_review` (fichier déjà purgé, nécessiterait un nouveau
 * téléchargement).
 */
export async function retryFailedEmarqueImports(fetcher: ApiFetcher): Promise<RetryFailedEmarqueImportsResultDto> {
  return fetcher(`/v1/platform/maintenance/retry-failed-emarque-imports`, { method: "POST" });
}

export type PlatformClubMembersDto = components["schemas"]["PlatformClubMembersDto"];

/** GET /v1/platform/clubs/:clubId/members — membres et rôles d'un club, vus par le platform_admin. */
export async function listPlatformClubMembers(fetcher: ApiFetcher, clubId: string): Promise<PlatformClubMembersDto> {
  return fetcher(`/v1/platform/clubs/${encodeURIComponent(clubId)}/members`);
}

/** POST /v1/platform/clubs/:clubId/admins — nomme administrateur du club (compte invité s'il n'existe pas). */
export async function grantPlatformClubAdmin(fetcher: ApiFetcher, clubId: string, email: string): Promise<PlatformClubMembersDto> {
  return fetcher(`/v1/platform/clubs/${encodeURIComponent(clubId)}/admins`, { method: "POST", body: { email } });
}

/** DELETE /v1/platform/clubs/:clubId/admins/:membershipId — retire le rôle administrateur (jamais le dernier). */
export async function revokePlatformClubAdmin(fetcher: ApiFetcher, clubId: string, membershipId: string): Promise<PlatformClubMembersDto> {
  return fetcher(`/v1/platform/clubs/${encodeURIComponent(clubId)}/admins/${encodeURIComponent(membershipId)}`, { method: "DELETE" });
}
