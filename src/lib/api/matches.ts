import type { ApiFetcher } from "./client";
import type { components } from "./generated/schema";

/**
 * `opponentLogoUrl` ajouté côté API après la dernière génération de ce
 * schéma (ce sandbox ne peut pas joindre l'API déployée pour relancer
 * `npm run api:generate`, voir docs/API_CLIENT.md) — étendu ici plutôt
 * que de toucher au fichier auto-généré. URL publique confirmée
 * accessible sans authentification (testée en direct par le club,
 * 2026-09-22) : une balise <img> suffit, pas de proxy nécessaire.
 */
export type MatchListItemDto = components["schemas"]["MatchListItemDto"] & { opponentLogoUrl: string | null };
export type MatchDetailsDto = components["schemas"]["MatchDetailsDto"] & { opponentLogoUrl: string | null };
export type MatchDocumentDto = components["schemas"]["MatchDocumentDto"];
export type DerogationStatusDto = components["schemas"]["DerogationStatusDto"];
export type CreateDerogationDto = components["schemas"]["CreateDerogationDto"];
export type CreateDerogationResultDto = components["schemas"]["CreateDerogationResultDto"];

/**
 * `pagination` renvoyé par l'API (voir ball-manager-back/src/modules/matches/routes.ts)
 * mais absent du schéma OpenAPI généré ici — généré avant l'ajout des
 * filtres/pagination côté API (gap 7) et jamais régénéré depuis (ce
 * sandbox ne peut pas joindre l'API déployée pour relancer `npm run
 * api:generate`, voir docs/API_CLIENT.md). Déclaré ici manuellement plutôt
 * que de toucher au fichier auto-généré.
 */
interface MatchesListResponse {
  matches: MatchListItemDto[];
  pagination: { limit: number; offset: number; total: number };
}

export interface ListMatchesParams {
  /** Filtre `match_datetime >= from` (ISO 8601) — voir §14/gap 7 de la demande. */
  from?: string;
  to?: string;
  /** Filtre côté API par équipe (`teamId`, schema.ts:575) — LOT-06. */
  teamId?: string;
  /** Filtre côté API domicile/extérieur (`homeAway`, schema.ts:576) — LOT-06. */
  homeAway?: "home" | "away";
  /** Filtre côté API par statut (`status`, schema.ts:577). Aucune UI ne l'utilise encore. */
  status?: "scheduled" | "played" | "postponed" | "cancelled" | "forfeit";
}

/** Paramètres de filtre communs aux listes de matchs (club et public) ; la pagination est ajoutée par l'appelant. */
export function matchesFilterSearchParams(params: ListMatchesParams): URLSearchParams {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.teamId) search.set("teamId", params.teamId);
  if (params.homeAway) search.set("homeAway", params.homeAway);
  if (params.status) search.set("status", params.status);
  return search;
}

/**
 * GET /v1/clubs/:clubId/matches — §14 de la demande.
 *
 * Filtre par date CÔTÉ API (`from`/`to`) plutôt que de récupérer tous les
 * matchs du club puis filtrer côté frontend : sans `from`, l'API renvoie
 * par défaut les 50 matchs les PLUS ANCIENS (limite par défaut + tri
 * croissant, voir MatchesQueryDtoSchema côté ball-manager-back) — c'est ce
 * qui faisait apparaître uniquement les matchs de 2023 alors que le club a
 * un historique jusqu'à aujourd'hui. Pagine ensuite explicitement
 * (`limit`/`offset`, jamais un seul appel supposé tout ramener) jusqu'à
 * avoir récupéré `pagination.total` résultats — même logique défensive
 * que `FfbbDirectusClient.listAllItems` côté ball-manager-back : un club
 * avec beaucoup de matchs sur la période demandée ne doit jamais perdre
 * silencieusement les plus récents.
 */
export async function listMatches(fetcher: ApiFetcher, clubId: string, params: ListMatchesParams = {}): Promise<MatchListItemDto[]> {
  const PAGE_SIZE = 200; // MAX_MATCHES_LIMIT côté API — voir MatchesQueryDtoSchema
  const matches: MatchListItemDto[] = [];
  let offset = 0;

  for (;;) {
    const search = matchesFilterSearchParams(params);
    search.set("limit", String(PAGE_SIZE));
    search.set("offset", String(offset));

    const page = await fetcher<MatchesListResponse>(`/v1/clubs/${clubId}/matches?${search.toString()}`);
    matches.push(...page.matches);

    offset += PAGE_SIZE;
    if (page.matches.length < PAGE_SIZE || offset >= page.pagination.total) break;
  }

  return matches;
}

/** GET /v1/clubs/:clubId/matches/:matchId — §15 de la demande. */
export async function getMatch(fetcher: ApiFetcher, clubId: string, matchId: string): Promise<MatchDetailsDto> {
  return fetcher<MatchDetailsDto>(`/v1/clubs/${clubId}/matches/${matchId}`);
}

/** GET /v1/clubs/:clubId/matches/:matchId/documents — §25 de la demande : `downloadUrl` (signée, courte durée) uniquement pour un club_admin. */
export async function listMatchDocuments(fetcher: ApiFetcher, clubId: string, matchId: string): Promise<MatchDocumentDto[]> {
  const { documents } = await fetcher<{ documents: MatchDocumentDto[] }>(`/v1/clubs/${clubId}/matches/${matchId}/documents`);
  return documents;
}

/**
 * GET /v1/clubs/:clubId/matches/:matchId/derogation — dernier état connu
 * de la dérogation FBI de ce match (demande du club, voir docs/FBI.md
 * côté ball-manager-back : "faut qu'on gere les derog depuis l'outil",
 * phase 1 lecture seule). `null` si jamais vérifié ou si la dernière
 * vérification n'a rien trouvé — les deux cas sont normaux.
 */
export async function getMatchDerogation(fetcher: ApiFetcher, clubId: string, matchId: string): Promise<DerogationStatusDto | null> {
  const { derogation } = await fetcher<{ derogation: DerogationStatusDto | null }>(`/v1/clubs/${clubId}/matches/${matchId}/derogation`);
  return derogation;
}

/**
 * POST /v1/clubs/:clubId/matches/:matchId/derogation/check (club_admin) —
 * SYNCHRONE depuis 2026-09-28 ("doit y avoir rien en attente" : l'ancien
 * modèle empilait un job traité séparément par processFbiJobs, source
 * directe de confusion) : login/consulte FBI et renvoie le résultat réel
 * dans cette même requête. `timeoutMs` généreux (le login + la recherche
 * FBI peuvent prendre 30-60s en pratique).
 */
export async function checkMatchDerogation(fetcher: ApiFetcher, clubId: string, matchId: string): Promise<{ found: boolean }> {
  return fetcher<{ found: boolean }>(`/v1/clubs/${clubId}/matches/${matchId}/derogation/check`, { method: "POST", timeoutMs: 90_000 });
}

/**
 * POST /v1/clubs/:clubId/matches/:matchId/derogation/create (club_admin) —
 * ÉCRIT réellement sur FBI/FFBB : crée une NOUVELLE demande de dérogation
 * pour ce match (demande du club, 2026-09-28 : "sur chaque rencontre faut
 * un bouton 'Créer une dérogation'... on remplit et choisi le motif, et on
 * envoie de la meme facon que pour accpter ou refuser"). Action réelle et
 * engageante, jamais annulable une fois confirmée par FBI — voir `outcome`
 * ("unknown" n'est jamais un succès, même contrat que respondToDerogation).
 *
 * `timeoutMs` généreux, même raisonnement que `respondToDerogation` (le
 * login FBI + la recherche de la rencontre "à créer" + la soumission
 * peuvent prendre au-delà de 20-45s en pratique).
 */
export async function createDerogation(fetcher: ApiFetcher, clubId: string, matchId: string, body: CreateDerogationDto): Promise<CreateDerogationResultDto> {
  return fetcher<CreateDerogationResultDto>(`/v1/clubs/${clubId}/matches/${matchId}/derogation/create`, {
    method: "POST",
    body,
    timeoutMs: 120_000,
  });
}
