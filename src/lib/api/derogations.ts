import type { ApiFetcher } from "./client";
import type { components } from "./generated/schema";

export type DerogationListItemDto = components["schemas"]["DerogationListItemDto"];
export type RespondToDerogationDto = components["schemas"]["RespondToDerogationDto"];
export type RespondToDerogationResultDto = components["schemas"]["RespondToDerogationResultDto"];

/**
 * GET /v1/clubs/:clubId/derogations — liste de toutes les dérogations FBI
 * connues du club, alimentée par le job `check_all_derogations` (bouton
 * global "Vérifier toutes les dérogations", voir integrations.ts). Chaque
 * ligne est déjà enrichie du match FFBB correspondant (`matchId`,
 * `opponentName`, `matchDatetime`) — FFBB reste la source du match,
 * jamais remplacée par FBI. Lecture seule uniquement.
 */
export async function listDerogations(fetcher: ApiFetcher, clubId: string): Promise<DerogationListItemDto[]> {
  const { derogations } = await fetcher<{ derogations: DerogationListItemDto[] }>(`/v1/clubs/${clubId}/derogations`);
  return derogations;
}

/**
 * POST /v1/clubs/:clubId/derogations/:derogationId/respond — ÉCRIT
 * réellement sur FBI/FFBB (accepter/refuser), demande du club, 2026-09-27 :
 * "je veux le faire via loutil". Action réelle et engageante, jamais
 * annulable une fois confirmée par FBI — voir `outcome` ("unknown" n'est
 * jamais un succès, voir ball-manager-back/docs/FBI.md).
 *
 * `timeoutMs` généreux — BUG constaté en production le 2026-09-28 (rencontre
 * 9538, "comment savoir si ca a marché ? jai pas eu de confirmation") : le
 * délai par défaut (20s, voir client.ts) expirait AVANT la fin réelle du
 * login FBI + soumission + relecture de l'état à jour, laissant le bouton
 * bloqué sur "Envoi en cours…" sans jamais afficher le résultat (pourtant
 * bien reçu et journalisé côté serveur, voir fbi_derogation_responses) —
 * l'admin n'avait alors AUCUN moyen de savoir si l'action avait réussi. Porté
 * à 120s le même jour (au-delà du login + des 45s d'attente de confirmation
 * FBI côté serveur, browser-client.ts, elle-même portée de 20s à 45s après
 * confirmation du club que l'action avait réussi malgré un premier
 * `outcome: "unknown"`).
 */
export async function respondToDerogation(fetcher: ApiFetcher, clubId: string, derogationId: string, body: RespondToDerogationDto): Promise<RespondToDerogationResultDto> {
  return fetcher<RespondToDerogationResultDto>(`/v1/clubs/${clubId}/derogations/${derogationId}/respond`, {
    method: "POST",
    body,
    timeoutMs: 120_000,
  });
}
