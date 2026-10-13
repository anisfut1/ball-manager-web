import type { ApiFetcher } from "./client";
import { apiFetch } from "./client";
import { publicFetch } from "./publicTokenTransport";
import type { components } from "./generated/schema";

/**
 * Vie d'équipe — Lot 1 (retour du club, 2026-10-09) : entraînements,
 * planning, réponses Présent / Absent / Incertain, Home « À faire ». Voir
 * ball-manager-back/docs/TEAM_LIFE.md. Espace club (compte, `fetcher`) et
 * espace public (lien personnel) : mêmes routes sous `/team-life`.
 */

/** `NonNullable` : openapi-typescript ajoute `null` à cet enum (réutilisé en `.nullable()` dans d'autres schémas). */
export type TrainingResponseValue = NonNullable<components["schemas"]["TrainingResponseValue"]>;
export type TrainingSeriesDto = components["schemas"]["TrainingSeriesDto"];
export type TrainingSlotInput = components["schemas"]["TrainingSlotInput"];
export type CreateTrainingSeriesDto = components["schemas"]["CreateTrainingSeriesDto"];
export type UpdateTrainingSeriesDto = components["schemas"]["UpdateTrainingSeriesDto"];
export type TrainingOccurrenceDto = components["schemas"]["TrainingOccurrenceDto"];
export type TrainingOccurrenceDetailDto = components["schemas"]["TrainingOccurrenceDetailDto"];
export type UpdateTrainingOccurrenceDto = components["schemas"]["UpdateTrainingOccurrenceDto"];
export type TrainingResponseResultDto = components["schemas"]["TrainingResponseResultDto"];
export type PlanningEventDto = components["schemas"]["PlanningEventDto"];
export type PlanningDto = components["schemas"]["PlanningDto"];
export type ActionCenterDto = components["schemas"]["ActionCenterDto"];
export type ActionCenterActionDto = components["schemas"]["ActionCenterActionDto"];
/** Présence réelle relevée par le coach (≠ réponse prévue). */
export type TrainingAttendanceValue = NonNullable<components["schemas"]["TrainingAttendanceValue"]>;
// Lot 2 : disponibilités des matchs et convocations.
export type MatchAvailabilityValue = NonNullable<components["schemas"]["MatchAvailabilityValue"]>;
export type ConvocationResponseValue = NonNullable<components["schemas"]["ConvocationResponseValue"]>;
export type TeamLifeMatchDto = components["schemas"]["TeamLifeMatchDto"];
export type MatchTeamLifeDto = components["schemas"]["MatchTeamLifeDto"];
export type PutConvocationDraftDto = components["schemas"]["PutConvocationDraftDto"];
export type ConvocationPreviewDto = components["schemas"]["ConvocationPreviewDto"];
/**
 * Lot 4 : page Équipe. `nextTraining` est une référence nullable : le
 * générateur la rend en `TrainingOccurrenceDto & unknown` (le `| null` est
 * perdu, même cas que `tables.ts`) — on rétablit le type réel de l'API.
 */
export type TeamOverviewDto = Omit<components["schemas"]["TeamOverviewDto"], "nextTraining"> & { nextTraining: components["schemas"]["TrainingOccurrenceDto"] | null };
// Lot 3 : lavage des maillots.
export type LaundryDto = components["schemas"]["LaundryDto"];
export type LaundryCandidateDto = components["schemas"]["LaundryCandidateDto"];

export interface PeriodQuery {
  from?: string;
  to?: string;
}

const clubBase = (clubId: string) => `/v1/clubs/${clubId}/team-life`;
const publicBase = (clubSlug: string) => `/v1/public/clubs/${encodeURIComponent(clubSlug)}/team-life`;

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, value);
  const out = search.toString();
  return out ? `?${out}` : "";
}

// ── Espace club (compte) ────────────────────────────────────────────────

export const clubTeamLife = {
  listSeries: (f: ApiFetcher, clubId: string, teamId: string) => f<{ series: TrainingSeriesDto[] }>(`${clubBase(clubId)}/teams/${teamId}/training-series`),
  createSeries: (f: ApiFetcher, clubId: string, teamId: string, body: CreateTrainingSeriesDto) => f<{ series: TrainingSeriesDto[] }>(`${clubBase(clubId)}/teams/${teamId}/training-series`, { method: "POST", body }),
  updateSeries: (f: ApiFetcher, clubId: string, seriesId: string, body: UpdateTrainingSeriesDto) => f<{ series: TrainingSeriesDto[] }>(`${clubBase(clubId)}/training-series/${seriesId}`, { method: "PATCH", body }),
  stopSeries: (f: ApiFetcher, clubId: string, seriesId: string, from?: string) => f<{ series: TrainingSeriesDto[] }>(`${clubBase(clubId)}/training-series/${seriesId}${qs({ from })}`, { method: "DELETE" }),
  listTrainings: (f: ApiFetcher, clubId: string, teamId: string, period: PeriodQuery = {}) => f<{ trainings: TrainingOccurrenceDto[] }>(`${clubBase(clubId)}/trainings${qs({ teamId, ...period })}`),
  detail: (f: ApiFetcher, clubId: string, occurrenceId: string) => f<TrainingOccurrenceDetailDto>(`${clubBase(clubId)}/trainings/${occurrenceId}`),
  updateOccurrence: (f: ApiFetcher, clubId: string, occurrenceId: string, body: UpdateTrainingOccurrenceDto) => f<TrainingOccurrenceDto>(`${clubBase(clubId)}/trainings/${occurrenceId}`, { method: "PATCH", body }),
  cancel: (f: ApiFetcher, clubId: string, occurrenceId: string, reason: string | null) => f<TrainingOccurrenceDto>(`${clubBase(clubId)}/trainings/${occurrenceId}/cancel`, { method: "POST", body: { reason } }),
  restore: (f: ApiFetcher, clubId: string, occurrenceId: string) => f<TrainingOccurrenceDto>(`${clubBase(clubId)}/trainings/${occurrenceId}/restore`, { method: "POST" }),
  planning: (f: ApiFetcher, clubId: string, params: PeriodQuery & { teamId?: string; kind?: "MATCH" | "TRAINING" } = {}) => f<PlanningDto>(`${clubBase(clubId)}/planning${qs({ ...params })}`),
  markAttendance: (f: ApiFetcher, clubId: string, occurrenceId: string, licencieId: string, status: TrainingAttendanceValue) => f<unknown>(`${clubBase(clubId)}/trainings/${occurrenceId}/attendance/${licencieId}`, { method: "PUT", body: { status } }),
  teamOverview: (f: ApiFetcher, clubId: string, teamId: string) => f<TeamOverviewDto>(`${clubBase(clubId)}/teams/${teamId}/overview`),
  laundrySuggestions: (f: ApiFetcher, clubId: string, matchId: string) => f<{ candidates: LaundryCandidateDto[] }>(`${clubBase(clubId)}/matches/${matchId}/laundry/suggestions`),
  assignLaundry: (f: ApiFetcher, clubId: string, matchId: string, licencieId: string) => f<LaundryDto>(`${clubBase(clubId)}/matches/${matchId}/laundry`, { method: "PUT", body: { licencieId } }),
  removeLaundry: (f: ApiFetcher, clubId: string, matchId: string) => f<LaundryDto>(`${clubBase(clubId)}/matches/${matchId}/laundry`, { method: "DELETE" }),
  match: (f: ApiFetcher, clubId: string, matchId: string) => f<MatchTeamLifeDto>(`${clubBase(clubId)}/matches/${matchId}`),
  openAvailability: (f: ApiFetcher, clubId: string, matchId: string) => f<MatchTeamLifeDto>(`${clubBase(clubId)}/matches/${matchId}/availability/open`, { method: "POST" }),
  remind: (f: ApiFetcher, clubId: string, matchId: string) => f<MatchTeamLifeDto>(`${clubBase(clubId)}/matches/${matchId}/remind`, { method: "POST" }),
  saveDraft: (f: ApiFetcher, clubId: string, matchId: string, body: PutConvocationDraftDto) => f<MatchTeamLifeDto>(`${clubBase(clubId)}/matches/${matchId}/convocation/draft`, { method: "PUT", body }),
  preview: (f: ApiFetcher, clubId: string, matchId: string) => f<ConvocationPreviewDto>(`${clubBase(clubId)}/matches/${matchId}/convocation/preview`, { method: "POST" }),
  send: (f: ApiFetcher, clubId: string, matchId: string) => f<MatchTeamLifeDto>(`${clubBase(clubId)}/matches/${matchId}/convocation/send`, { method: "POST" }),
};

// ── Espace public (lien personnel, jamais de jeton Supabase) ───────────

export const publicTeamLife = {
  listSeries: (clubSlug: string, token: string, teamId: string) => publicFetch<{ series: TrainingSeriesDto[] }>(`${publicBase(clubSlug)}/teams/${teamId}/training-series`, token),
  createSeries: (clubSlug: string, token: string, teamId: string, body: CreateTrainingSeriesDto) => publicFetch<{ series: TrainingSeriesDto[] }>(`${publicBase(clubSlug)}/teams/${teamId}/training-series`, token, { method: "POST", body }),
  updateSeries: (clubSlug: string, token: string, seriesId: string, body: UpdateTrainingSeriesDto) => publicFetch<{ series: TrainingSeriesDto[] }>(`${publicBase(clubSlug)}/training-series/${seriesId}`, token, { method: "PATCH", body }),
  stopSeries: (clubSlug: string, token: string, seriesId: string, from?: string) => publicFetch<{ series: TrainingSeriesDto[] }>(`${publicBase(clubSlug)}/training-series/${seriesId}`, token, { method: "DELETE", query: { from } }),
  listTrainings: (clubSlug: string, token: string, teamId: string, period: PeriodQuery = {}) => publicFetch<{ trainings: TrainingOccurrenceDto[] }>(`${publicBase(clubSlug)}/teams/${teamId}/trainings`, token, { query: { ...period } }),
  detail: (clubSlug: string, token: string, occurrenceId: string) => publicFetch<TrainingOccurrenceDetailDto>(`${publicBase(clubSlug)}/trainings/${occurrenceId}`, token),
  updateOccurrence: (clubSlug: string, token: string, occurrenceId: string, body: UpdateTrainingOccurrenceDto) => publicFetch<TrainingOccurrenceDto>(`${publicBase(clubSlug)}/trainings/${occurrenceId}`, token, { method: "PATCH", body }),
  cancel: (clubSlug: string, token: string, occurrenceId: string, reason: string | null) => publicFetch<TrainingOccurrenceDto>(`${publicBase(clubSlug)}/trainings/${occurrenceId}/cancel`, token, { method: "POST", body: { reason } }),
  restore: (clubSlug: string, token: string, occurrenceId: string) => publicFetch<TrainingOccurrenceDto>(`${publicBase(clubSlug)}/trainings/${occurrenceId}/restore`, token, { method: "POST" }),
  /** Réponse du licencié DU LIEN (un lien par enfant : on envoie celui de l'enfant concerné). */
  respond: (clubSlug: string, token: string, occurrenceId: string, response: TrainingResponseValue) => publicFetch<TrainingResponseResultDto>(`${publicBase(clubSlug)}/trainings/${occurrenceId}/response`, token, { method: "PUT", body: { response } }),
  markAttendance: (clubSlug: string, token: string, occurrenceId: string, licencieId: string, status: TrainingAttendanceValue) => publicFetch<unknown>(`${publicBase(clubSlug)}/trainings/${occurrenceId}/attendance/${licencieId}`, token, { method: "PUT", body: { status } }),
  teamOverview: (clubSlug: string, token: string, teamId: string) => publicFetch<TeamOverviewDto>(`${publicBase(clubSlug)}/teams/${teamId}/overview`, token),
  laundrySuggestions: (clubSlug: string, token: string, matchId: string) => publicFetch<{ candidates: LaundryCandidateDto[] }>(`${publicBase(clubSlug)}/matches/${matchId}/laundry/suggestions`, token),
  assignLaundry: (clubSlug: string, token: string, matchId: string, licencieId: string) => publicFetch<LaundryDto>(`${publicBase(clubSlug)}/matches/${matchId}/laundry`, token, { method: "PUT", body: { licencieId } }),
  removeLaundry: (clubSlug: string, token: string, matchId: string) => publicFetch<LaundryDto>(`${publicBase(clubSlug)}/matches/${matchId}/laundry`, token, { method: "DELETE" }),
  /** « J'ai vu » (licencié désigné = celui du lien). */
  markLaundrySeen: (clubSlug: string, token: string, matchId: string) => publicFetch<unknown>(`${publicBase(clubSlug)}/matches/${matchId}/laundry/seen`, token, { method: "POST" }),
  match: (clubSlug: string, token: string, matchId: string) => publicFetch<MatchTeamLifeDto>(`${publicBase(clubSlug)}/matches/${matchId}`, token),
  openAvailability: (clubSlug: string, token: string, matchId: string) => publicFetch<MatchTeamLifeDto>(`${publicBase(clubSlug)}/matches/${matchId}/availability/open`, token, { method: "POST" }),
  remind: (clubSlug: string, token: string, matchId: string) => publicFetch<MatchTeamLifeDto>(`${publicBase(clubSlug)}/matches/${matchId}/remind`, token, { method: "POST" }),
  saveDraft: (clubSlug: string, token: string, matchId: string, body: PutConvocationDraftDto) => publicFetch<MatchTeamLifeDto>(`${publicBase(clubSlug)}/matches/${matchId}/convocation/draft`, token, { method: "PUT", body }),
  preview: (clubSlug: string, token: string, matchId: string) => publicFetch<ConvocationPreviewDto>(`${publicBase(clubSlug)}/matches/${matchId}/convocation/preview`, token, { method: "POST" }),
  send: (clubSlug: string, token: string, matchId: string) => publicFetch<MatchTeamLifeDto>(`${publicBase(clubSlug)}/matches/${matchId}/convocation/send`, token, { method: "POST" }),
  /** Disponibilité / confirmation du licencié DU LIEN (celui de l'enfant concerné). */
  respondAvailability: (clubSlug: string, token: string, matchId: string, response: MatchAvailabilityValue) => publicFetch<unknown>(`${publicBase(clubSlug)}/matches/${matchId}/availability/response`, token, { method: "PUT", body: { response } }),
  respondConvocation: (clubSlug: string, token: string, matchId: string, response: "CONFIRMED" | "DECLINED") => publicFetch<unknown>(`${publicBase(clubSlug)}/matches/${matchId}/convocation/response`, token, { method: "PUT", body: { response } }),
  /** Home « À faire » : les liens de l'appareil voyagent dans le corps, jamais dans l'URL. */
  actionCenter: (clubSlug: string, tokens: string[]) => apiFetch<ActionCenterDto>(`${publicBase(clubSlug)}/action-center`, { method: "POST", body: { tokens } }),
  planning: (clubSlug: string, tokens: string[], period: PeriodQuery & { teamId?: string } = {}) => apiFetch<PlanningDto>(`${publicBase(clubSlug)}/planning${qs({ ...period })}`, { method: "POST", body: { tokens } }),
};
