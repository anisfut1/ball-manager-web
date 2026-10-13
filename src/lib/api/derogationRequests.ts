import type { ApiFetcher } from "./client";
import type { components } from "./generated/schema";

/**
 * Demandes de dérogation INTERNES (coach → coordinateur) — retour du club,
 * 2026-10-01. Workflow interne : rien ici n'écrit sur FFBB/FBI (voir
 * ball-manager-back/docs/DEROGATION_REQUESTS.md). Distinct de `./derogations.ts`
 * (dérogations OFFICIELLES lues sur FBI).
 */
export type DerogationRequestStatus = components["schemas"]["DerogationRequestStatus"];
export type DerogationAction = components["schemas"]["DerogationAction"];
export type DerogationContextDto = components["schemas"]["DerogationContextDto"];
export type DerogationRequestSummaryDto = components["schemas"]["DerogationRequestSummaryDto"];
export type DerogationRequestDetailDto = components["schemas"]["DerogationRequestDetailDto"];
export type DerogationRequestListDto = components["schemas"]["DerogationRequestListDto"];
export type DerogationAvailabilityDto = components["schemas"]["DerogationAvailabilityDto"];
export type DerogationSlotCheckDto = components["schemas"]["DerogationSlotCheckDto"];
export type CandidateSlotDto = components["schemas"]["CandidateSlotDto"];
export type ClubVenueDto = components["schemas"]["ClubVenueDto"];
export type DerogationMatchRefDto = components["schemas"]["DerogationMatchRefDto"];
export type DerogationMessageDto = components["schemas"]["DerogationMessageDto"];
export type DerogationProposalDto = components["schemas"]["DerogationProposalDto"];
export type CreateDerogationRequestDto = components["schemas"]["CreateDerogationRequestDto"];
export type ProposeDerogationSlotDto = components["schemas"]["ProposeDerogationSlotDto"];

export interface ListDerogationRequestsParams {
  status?: DerogationRequestStatus;
  teamId?: string;
  matchId?: string;
  createdByMe?: boolean;
  limit?: number;
  offset?: number;
}

const base = (clubId: string) => `/v1/clubs/${clubId}/derogation-requests`;

export function getDerogationContext(fetcher: ApiFetcher, clubId: string): Promise<DerogationContextDto> {
  return fetcher<DerogationContextDto>(`${base(clubId)}/context`);
}

export function listDerogationRequests(fetcher: ApiFetcher, clubId: string, params: ListDerogationRequestsParams = {}): Promise<DerogationRequestListDto> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.teamId) search.set("teamId", params.teamId);
  if (params.matchId) search.set("matchId", params.matchId);
  if (params.createdByMe !== undefined) search.set("createdByMe", String(params.createdByMe));
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.offset !== undefined) search.set("offset", String(params.offset));
  const query = search.toString();
  return fetcher<DerogationRequestListDto>(`${base(clubId)}${query ? `?${query}` : ""}`);
}

export function getDerogationRequest(fetcher: ApiFetcher, clubId: string, requestId: string): Promise<DerogationRequestDetailDto> {
  return fetcher<DerogationRequestDetailDto>(`${base(clubId)}/${requestId}`);
}

export function createDerogationRequest(fetcher: ApiFetcher, clubId: string, body: CreateDerogationRequestDto): Promise<DerogationRequestDetailDto> {
  return fetcher<DerogationRequestDetailDto>(base(clubId), { method: "POST", body });
}

export function postDerogationMessage(fetcher: ApiFetcher, clubId: string, requestId: string, message: string): Promise<DerogationRequestDetailDto> {
  return fetcher<DerogationRequestDetailDto>(`${base(clubId)}/${requestId}/messages`, { method: "POST", body: { message } });
}

export function performDerogationAction(fetcher: ApiFetcher, clubId: string, requestId: string, action: DerogationAction, message?: string | null): Promise<DerogationRequestDetailDto> {
  return fetcher<DerogationRequestDetailDto>(`${base(clubId)}/${requestId}/actions`, { method: "POST", body: { action, message: message ?? null } });
}

/** DELETE …/derogation-requests/:requestId — coordinateur / admin, demande terminée ou annulée uniquement (messages inclus). */
export async function deleteDerogationRequest(fetcher: ApiFetcher, clubId: string, requestId: string): Promise<{ deleted: true; id: string }> {
  return fetcher<{ deleted: true; id: string }>(`${base(clubId)}/${requestId}`, { method: "DELETE" });
}

export function proposeDerogationSlot(fetcher: ApiFetcher, clubId: string, requestId: string, body: ProposeDerogationSlotDto): Promise<DerogationRequestDetailDto> {
  return fetcher<DerogationRequestDetailDto>(`${base(clubId)}/${requestId}/proposals`, { method: "POST", body });
}

export function getDerogationAvailability(fetcher: ApiFetcher, clubId: string, matchId: string, date: string): Promise<DerogationAvailabilityDto> {
  return fetcher<DerogationAvailabilityDto>(`/v1/clubs/${clubId}/matches/${matchId}/derogation-availability?date=${encodeURIComponent(date)}`);
}

export function checkDerogationSlot(fetcher: ApiFetcher, clubId: string, matchId: string, startAt: string, venueId: string | null): Promise<DerogationSlotCheckDto> {
  const search = new URLSearchParams({ startAt });
  if (venueId) search.set("venueId", venueId);
  return fetcher<DerogationSlotCheckDto>(`/v1/clubs/${clubId}/matches/${matchId}/derogation-slot-check?${search.toString()}`);
}

export type SubmitOfficialDerogationResultDto = components["schemas"]["SubmitOfficialDerogationResultDto"];
export type OfficialDerogationDto = components["schemas"]["CreateDerogationDto"];

/** Coordinateur, demande « En cours » : envoie la dérogation OFFICIELLE sur FBI (même process que la fiche match). */
export function submitOfficialDerogation(fetcher: ApiFetcher, clubId: string, requestId: string, body: OfficialDerogationDto): Promise<SubmitOfficialDerogationResultDto> {
  return fetcher<SubmitOfficialDerogationResultDto>(`${base(clubId)}/${requestId}/official`, { method: "POST", body });
}
