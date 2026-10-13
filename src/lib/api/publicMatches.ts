import { apiFetch } from "./client";
import type { TeamDto } from "./clubs";
import type { DerogationStatusDto, MatchDetailsDto, MatchDocumentDto, MatchListItemDto } from "./matches";
import { matchesFilterSearchParams, type ListMatchesParams } from "./matches";
import type { PoolStandingsDto } from "./standings";
import type { components } from "./generated/schema";

export type { PoolStandingsDto, StandingRowDto } from "./standings";

/**
 * Client HTTP pour la vue PUBLIQUE en lecture seule des matchs (retour du
 * club, 2026-09-29 : "je veux une vue publique avec toutes les infos en
 * vue directe... sans compte, en libre service"). Contrairement à
 * `publicTables.ts` (auto-affectation), il n'y a ICI aucune identité à
 * prouver — pas de jeton, pas de `?token=` : seul le `clubSlug` de l'URL
 * compte. Utilise `apiFetch` directement (jamais `browserApi`/`api.server`,
 * qui attachent un jeton Supabase) — voir ball-manager-back/docs/PUBLIC_MATCHES.md.
 */

export interface PublicMatchesListResponse {
  matches: MatchListItemDto[];
  pagination: { limit: number; offset: number; total: number };
}

/** GET /v1/public/clubs/:clubSlug/teams — pour le filtre "équipe". */
export async function listPublicTeams(clubSlug: string): Promise<TeamDto[]> {
  const { teams } = await apiFetch<{ teams: TeamDto[] }>(`/v1/public/clubs/${encodeURIComponent(clubSlug)}/teams`);
  return teams;
}

/** Taille de page demandée à l'API publique (maximum accepté : 200, comme `MAX_MATCHES_LIMIT` côté ball-manager-back). */
const PUBLIC_MATCHES_PAGE_SIZE = 200;
/**
 * Plafond de sécurité : au plus 25 pages, soit 5 000 matchs. Une saison de club
 * représente de l'ordre de 10² à 10³ matchs (estimé : 15 équipes × 26 = 390) ;
 * le plafond protège contre un `pagination.total` aberrant ou une boucle sans
 * fin, au prix d'une liste volontairement partielle au-delà.
 */
export const PUBLIC_MATCHES_MAX_PAGES = 25;

/**
 * GET /v1/public/clubs/:clubSlug/matches — mêmes filtres que la vue authentifiée
 * (voir `./matches.ts#listMatches`). **Pagine jusqu'à épuisement** (R-015) : avant,
 * un seul appel `limit=200` tronquait silencieusement une saison de plus de 200
 * matchs (les plus récents manquaient, l'API triant par date croissante).
 * S'arrête dès qu'une page est incomplète, que `pagination.total` est atteint,
 * ou à `PUBLIC_MATCHES_MAX_PAGES`.
 */
export async function listPublicMatches(clubSlug: string, params: ListMatchesParams = {}): Promise<MatchListItemDto[]> {
  const matches: MatchListItemDto[] = [];

  for (let page = 0; page < PUBLIC_MATCHES_MAX_PAGES; page++) {
    const offset = page * PUBLIC_MATCHES_PAGE_SIZE;
    const search = matchesFilterSearchParams(params);
    search.set("limit", String(PUBLIC_MATCHES_PAGE_SIZE));
    search.set("offset", String(offset));

    const response = await apiFetch<PublicMatchesListResponse>(`/v1/public/clubs/${encodeURIComponent(clubSlug)}/matches?${search.toString()}`);
    matches.push(...response.matches);

    const reachedTotal = response.pagination ? offset + PUBLIC_MATCHES_PAGE_SIZE >= response.pagination.total : false;
    if (response.matches.length < PUBLIC_MATCHES_PAGE_SIZE || reachedTotal) break;
  }

  return matches;
}

/** GET /v1/public/clubs/:clubSlug/matches/:matchId */
export async function getPublicMatch(clubSlug: string, matchId: string): Promise<MatchDetailsDto> {
  return apiFetch<MatchDetailsDto>(`/v1/public/clubs/${encodeURIComponent(clubSlug)}/matches/${matchId}`);
}

/** GET /v1/public/clubs/:clubSlug/matches/:matchId/documents — `downloadUrl` toujours `null` (jamais d'URL signée en public, voir docs/PUBLIC_MATCHES.md). */
export async function listPublicMatchDocuments(clubSlug: string, matchId: string): Promise<MatchDocumentDto[]> {
  const { documents } = await apiFetch<{ documents: MatchDocumentDto[] }>(`/v1/public/clubs/${encodeURIComponent(clubSlug)}/matches/${matchId}/documents`);
  return documents;
}

/** GET /v1/public/clubs/:clubSlug/matches/:matchId/derogation — lecture seule, dernier état connu. */
export async function getPublicMatchDerogation(clubSlug: string, matchId: string): Promise<DerogationStatusDto | null> {
  const { derogation } = await apiFetch<{ derogation: DerogationStatusDto | null }>(`/v1/public/clubs/${encodeURIComponent(clubSlug)}/matches/${matchId}/derogation`);
  return derogation;
}

/** GET /v1/public/clubs/:clubSlug/standings — classements FFBB des poules où le club est engagé (copiés à chaque synchronisation). */
export async function listPublicStandings(clubSlug: string): Promise<PoolStandingsDto[]> {
  const { standings } = await apiFetch<{ standings: PoolStandingsDto[] }>(`/v1/public/clubs/${encodeURIComponent(clubSlug)}/standings`);
  return standings;
}

/** Fiche joueur publique (nom, photo, équipes, saison, derniers matchs, tables) — jamais de coordonnées. */
export type PublicPlayerProfileDto = components["schemas"]["PublicPlayerProfileDto"];
export type PublicPlayerMatchDto = components["schemas"]["PublicPlayerMatchDto"];

/** GET /v1/public/clubs/:clubSlug/players/:licencieId */
export function getPublicPlayer(clubSlug: string, licencieId: string): Promise<PublicPlayerProfileDto> {
  return apiFetch<PublicPlayerProfileDto>(`/v1/public/clubs/${encodeURIComponent(clubSlug)}/players/${encodeURIComponent(licencieId)}`);
}
