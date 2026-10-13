import type { ApiFetcher } from "./client";
import type { components } from "./generated/schema";

export type ClubDto = components["schemas"]["ClubDto"];
export type ClubRole = components["schemas"]["ClubRole"];
export type ClubCapabilities = components["schemas"]["ClubCapabilities"];
export type TeamDto = components["schemas"]["TeamDto"];
export type CreateTeamDto = components["schemas"]["CreateTeamDto"];
export type UpdateTeamDto = components["schemas"]["UpdateTeamDto"];
export type UpdateClubDto = components["schemas"]["UpdateClubDto"];

/** GET /v1/clubs — clubs dont l'utilisateur est membre actif (§11 de la demande). */
export async function listClubs(fetcher: ApiFetcher): Promise<ClubDto[]> {
  const { clubs } = await fetcher<{ clubs: ClubDto[] }>("/v1/clubs");
  return clubs;
}

/** GET /v1/clubs/:clubId */
export async function getClub(fetcher: ApiFetcher, clubId: string): Promise<ClubDto> {
  return fetcher<ClubDto>(`/v1/clubs/${clubId}`);
}

/** PATCH /v1/clubs/:clubId (club_admin) — identité/apparence du club (nom, nom court, fuseau, logo, couleur d'accent). */
export async function updateClub(fetcher: ApiFetcher, clubId: string, body: UpdateClubDto): Promise<ClubDto> {
  return fetcher<ClubDto>(`/v1/clubs/${clubId}`, { method: "PATCH", body });
}

/** GET /v1/clubs/:clubId/capabilities — §16 de la demande : jamais recalculé côté frontend. */
export async function getClubCapabilities(fetcher: ApiFetcher, clubId: string): Promise<ClubCapabilities> {
  return fetcher<ClubCapabilities>(`/v1/clubs/${clubId}/capabilities`);
}

/** GET /v1/clubs/:clubId/teams — TOUTES les équipes, y compris sans engagement FFBB (brassage), voir docs/TEAMS.md côté ball-manager-back. */
export async function listTeams(fetcher: ApiFetcher, clubId: string): Promise<TeamDto[]> {
  const { teams } = await fetcher<{ teams: TeamDto[] }>(`/v1/clubs/${clubId}/teams`);
  return teams;
}

/** POST /v1/clubs/:clubId/teams (club_admin) — enregistrer une équipe avant tout engagement FFBB confirmé. */
export async function createTeam(fetcher: ApiFetcher, clubId: string, body: CreateTeamDto): Promise<TeamDto> {
  return fetcher<TeamDto>(`/v1/clubs/${clubId}/teams`, { method: "POST", body });
}

/** PATCH /v1/clubs/:clubId/teams/:teamId (club_admin) — renommer/reclasser/activer-désactiver. */
export async function updateTeam(fetcher: ApiFetcher, clubId: string, teamId: string, body: UpdateTeamDto): Promise<TeamDto> {
  return fetcher<TeamDto>(`/v1/clubs/${clubId}/teams/${teamId}`, { method: "PATCH", body });
}
