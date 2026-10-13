import type { ApiFetcher } from "./client";
import type { components } from "./generated/schema";

/**
 * Module Tables de marque (demande du club, 2026-09-28) — voir
 * ball-manager-back/docs/TABLE_ASSIGNMENTS.md pour la logique métier
 * complète (120 min, chevauchement strict, rangs, équité). Ce fichier ne
 * fait qu'exposer des fonctions ergonomiques typées vers les 4 routes déjà
 * exposées par ball-manager-back — aucun `fetch()` en dur, aucune requête
 * Supabase directe (§6/§93 : ball-manager-web → ball-manager-back → Supabase, jamais
 * l'inverse).
 */

export type TableAssignmentRole = components["schemas"]["TableAssignmentRole"];
export type TableSuggestionCandidateDto = components["schemas"]["TableSuggestionCandidateDto"];
export type TableUnavailableCandidateDto = components["schemas"]["TableUnavailableCandidateDto"];
export type SuggestionReasonCode = components["schemas"]["SuggestionReasonCode"];
export type UnavailableReasonCode = components["schemas"]["UnavailableReasonCode"];
export type PriorityTier = components["schemas"]["PriorityTier"];
export type TableSuggestionsDto = components["schemas"]["TableSuggestionsDto"];
export type TableAssignmentSlotDto = components["schemas"]["TableAssignmentSlotDto"];
export type TableMatchRefDto = components["schemas"]["TableMatchRefDto"];
export type PutTableAssignmentDto = components["schemas"]["PutTableAssignmentDto"];
export type TableAssignmentResultDto = components["schemas"]["TableAssignmentResultDto"];
export type PutRefereeStatusDto = components["schemas"]["PutRefereeStatusDto"];
export type RefereeStatusResultDto = components["schemas"]["RefereeStatusResultDto"];
export type PublicAccessEntryDto = components["schemas"]["PublicAccessEntryDto"];

/**
 * `assignments.scorer/timekeeper/clubDelegate/referee` sont `.nullable()`
 * côté contrat Zod (`TableAssignmentSlotDtoSchema.nullable()`, un poste
 * vide = "à attribuer") mais openapi-typescript régénère ce nullable
 * imbriqué en `TableAssignmentSlotDto & unknown` (le `| null` est perdu) —
 * retypé ici manuellement plutôt que de toucher au fichier auto-généré,
 * même pattern que `opponentLogoUrl` dans matches.ts.
 */
export interface TableAssignmentsForMatchDto {
  match: TableMatchRefDto;
  assignments: {
    scorer: TableAssignmentSlotDto | null;
    timekeeper: TableAssignmentSlotDto | null;
    clubDelegate: TableAssignmentSlotDto | null;
    referee: TableAssignmentSlotDto | null;
  };
  /**
   * Retour du club, 2026-09-28 : "il est possible qu'un arbitre officiel
   * soit désigné [par la FFBB], donc avoir la possibilité de cocher un
   * truc style pas besoin d'arbitre". `true` -> le poste `referee`
   * ci-dessus n'est PAS compté comme "à attribuer" côté UI, même s'il
   * vaut `null`. Ne concerne QUE ce poste.
   */
  refereeNotNeeded: boolean;
  hasConflict: boolean;
}

export interface ListTableAssignmentsParams {
  /** Filtre `match_datetime >= from` (ISO 8601). Sans bornes, l'API renvoie les prochains matchs à domicile (voir routes.ts côté ball-manager-back). */
  from?: string;
  to?: string;
}

/**
 * GET /v1/clubs/:clubId/table-assignments — matchs à DOMICILE uniquement
 * (§4/§36 : un match extérieur ne sert qu'à calculer l'indisponibilité,
 * jamais à afficher une table de marque), avec leurs 3 postes (affectés ou
 * "à attribuer").
 */
export async function listTableAssignments(fetcher: ApiFetcher, clubId: string, params: ListTableAssignmentsParams = {}): Promise<TableAssignmentsForMatchDto[]> {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const query = search.toString();
  const { matches } = await fetcher<{ matches: TableAssignmentsForMatchDto[] }>(`/v1/clubs/${clubId}/table-assignments${query ? `?${query}` : ""}`);
  return matches;
}

/**
 * GET /v1/clubs/:clubId/matches/:matchId/table-suggestions?role= — §39 :
 * STRICTEMENT en lecture, ne crée JAMAIS d'affectation (aucun effet de
 * bord, jamais appelée en boucle/cron). Un seul rôle à la fois — la vue
 * "choisir un marqueur" n'a besoin que des suggestions pour ce rôle-là.
 */
export async function getTableSuggestions(fetcher: ApiFetcher, clubId: string, matchId: string, role: TableAssignmentRole): Promise<TableSuggestionsDto> {
  return fetcher<TableSuggestionsDto>(`/v1/clubs/${clubId}/matches/${matchId}/table-suggestions?role=${role}`);
}

/**
 * PUT /v1/clubs/:clubId/matches/:matchId/table-assignments/:role — la
 * SEULE action qui transforme une suggestion en affectation réelle (§40),
 * toujours déclenchée par un clic explicite ("Choisir"), jamais par un
 * automatisme. ball-manager-back revalide les conflits au moment de
 * l'écriture (§42) : un 409 `TABLE_ASSIGNMENT_CONFLICT` /
 * `ALREADY_ASSIGNED_ON_MATCH` est attendu et normal si le candidat n'est
 * plus disponible entre l'affichage des suggestions et le clic.
 */
export async function putTableAssignment(fetcher: ApiFetcher, clubId: string, matchId: string, role: TableAssignmentRole, body: PutTableAssignmentDto): Promise<TableAssignmentResultDto> {
  return fetcher<TableAssignmentResultDto>(`/v1/clubs/${clubId}/matches/${matchId}/table-assignments/${role}`, {
    method: "PUT",
    body,
  });
}

/** DELETE /v1/clubs/:clubId/matches/:matchId/table-assignments/:role — remet le poste à "à attribuer" (§41). */
export async function deleteTableAssignment(fetcher: ApiFetcher, clubId: string, matchId: string, role: TableAssignmentRole): Promise<void> {
  await fetcher<{ removed: true }>(`/v1/clubs/${clubId}/matches/${matchId}/table-assignments/${role}`, { method: "DELETE" });
}

/**
 * PUT /v1/clubs/:clubId/matches/:matchId/referee-status — retour du club,
 * 2026-09-28 : bascule "pas besoin d'arbitre" (arbitre officiel FFBB déjà
 * désigné, hors de ce club). N'affecte JAMAIS aucun licencié — distinct
 * d'une affectation, voir ball-manager-back/docs/TABLE_ASSIGNMENTS.md.
 */
export async function setRefereeStatus(fetcher: ApiFetcher, clubId: string, matchId: string, noRefereeNeeded: boolean): Promise<RefereeStatusResultDto> {
  return fetcher<RefereeStatusResultDto>(`/v1/clubs/${clubId}/matches/${matchId}/referee-status`, {
    method: "PUT",
    body: { noRefereeNeeded } satisfies PutRefereeStatusDto,
  });
}

/**
 * GET /v1/clubs/:clubId/table-assignments/public-access — retour du club,
 * 2026-09-29 : vue admin de qui a déjà revendiqué son lien personnel sans
 * compte (`club_admin` uniquement côté API). Sert à savoir qui
 * réinitialiser en cas de lien perdu signalé.
 */
export async function listPublicAccess(fetcher: ApiFetcher, clubId: string): Promise<PublicAccessEntryDto[]> {
  const { entries } = await fetcher<{ entries: PublicAccessEntryDto[] }>(`/v1/clubs/${clubId}/table-assignments/public-access`);
  return entries;
}

/**
 * POST /v1/clubs/:clubId/table-assignments/public-access/:licencieId/reset
 * — révoque le jeton actif du licencié (lien perdu, etc.) : le nom
 * redevient choisissable, les affectations déjà existantes ne sont
 * jamais touchées (voir ball-manager-back/docs/PUBLIC_TABLE_ACCESS.md).
 */
export async function resetPublicAccess(fetcher: ApiFetcher, clubId: string, licencieId: string): Promise<void> {
  await fetcher<{ reset: true }>(`/v1/clubs/${clubId}/table-assignments/public-access/${licencieId}/reset`, { method: "POST" });
}

export type PersonalLinkDto = components["schemas"]["PersonalLinkDto"];
export type ClaimRequestDto = components["schemas"]["ClaimRequestDto"];

/**
 * GET .../public-access/claims (club_admin) — retour du club, 2026-10-08 :
 * « si ce n'est pas son mail, c'est l'admin qui décide de lui envoyer ou
 * non ». Demandes de lien pour une fiche sans adresse, en attente.
 */
export async function listClaimRequests(fetcher: ApiFetcher, clubId: string): Promise<ClaimRequestDto[]> {
  const { requests } = await fetcher<{ requests: ClaimRequestDto[] }>(`/v1/clubs/${clubId}/table-assignments/public-access/claims`);
  return requests;
}

/** Approuver : le lien part à l'adresse demandée, qui est enregistrée sur la fiche. Refuser : rien n'est envoyé. */
export async function decideClaimRequest(fetcher: ApiFetcher, clubId: string, requestId: string, decision: "approve" | "reject"): Promise<void> {
  await fetcher(`/v1/clubs/${clubId}/table-assignments/public-access/claims/${requestId}/${decision}`, { method: "POST" });
}

/**
 * POST .../public-access/:licencieId/link (club_admin) — retour du club,
 * 2026-10-01 : « l'admin doit avoir accès au lien unique par joueur ».
 * Réaffiche le lien ACTIF (inchangé) ou en émet un s'il n'en a pas (`created`).
 */
export async function getPersonalLink(fetcher: ApiFetcher, clubId: string, licencieId: string): Promise<PersonalLinkDto> {
  return fetcher<PersonalLinkDto>(`/v1/clubs/${clubId}/table-assignments/public-access/${licencieId}/link`, { method: "POST" });
}
