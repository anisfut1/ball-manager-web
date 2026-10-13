import type { ApiFetcher } from "./client";
import type { components } from "./generated/schema";

export type LicencieDto = components["schemas"]["LicencieDto"];
export type LicencieProfileDto = components["schemas"]["LicencieProfileDto"];
export type LicencieMatchDto = components["schemas"]["LicencieMatchDto"];
export type UpdateLicencieProfileDto = components["schemas"]["UpdateLicencieProfileDto"];
export type ImportLicenciesDto = components["schemas"]["ImportLicenciesDto"];
/**
 * `ImportLicencieRowDtoSchema` n'est jamais `.openapi(...)`-enregistré
 * séparément côté ball-manager-back (il n'existe qu'imbriqué dans
 * `ImportLicenciesDto.licencies`, voir contracts/licencies.ts) — dérivé ici
 * par indexation plutôt que par un nom de composant qui n'existe pas
 * réellement dans le contrat OpenAPI généré.
 */
export type ImportLicencieRowDto = ImportLicenciesDto["licencies"][number];
export type ImportLicenciesResultDto = components["schemas"]["ImportLicenciesResultDto"];
export type AutoAssignTeamsResultDto = components["schemas"]["AutoAssignTeamsResultDto"];
export type DeleteLicencieResultDto = components["schemas"]["DeleteLicencieResultDto"];

/** GET /v1/clubs/:clubId/licencies — roster du club (tri par nom, voir docs/LICENCIES.md côté ball-manager-back). */
export async function listLicencies(fetcher: ApiFetcher, clubId: string): Promise<LicencieDto[]> {
  const { licencies } = await fetcher<{ licencies: LicencieDto[] }>(`/v1/clubs/${clubId}/licencies`);
  return licencies;
}

/** GET /v1/clubs/:clubId/licencies/:licencieId — la fiche joueur (identité, historique des matchs, statistiques par match). */
export async function getLicencieProfile(fetcher: ApiFetcher, clubId: string, licencieId: string): Promise<LicencieProfileDto> {
  return fetcher<LicencieProfileDto>(`/v1/clubs/${clubId}/licencies/${licencieId}`);
}

/**
 * PATCH /v1/clubs/:clubId/licencies/:licencieId/profile — le serveur
 * applique la restriction de champs (admin vs licencié lui-même) et
 * rejette (400) tout champ hors de la population autorisée pour
 * l'appelant, voir docs/LICENCIES.md côté ball-manager-back.
 */
export async function updateLicencieProfile(fetcher: ApiFetcher, clubId: string, licencieId: string, body: UpdateLicencieProfileDto): Promise<LicencieDto> {
  return fetcher<LicencieDto>(`/v1/clubs/${clubId}/licencies/${licencieId}/profile`, { method: "PATCH", body });
}

/**
 * POST /v1/clubs/:clubId/licencies/import (club_admin) — import en masse
 * depuis un export FBI collé/importé ("Voici la liste des licenciés,
 * ajoute les tous stp, a lavenir yen aura dautres, faudra ignorer les
 * doublons dans les exports", demande du club, 2026-09-28). Dédoublonné
 * côté serveur par `ffbbLicenceId` ("N° national") — voir docs/LICENCIES.md
 * côté ball-manager-back. `timeoutMs` généreux : un import peut porter sur
 * plusieurs centaines de lignes.
 */
export async function importLicencies(fetcher: ApiFetcher, clubId: string, body: ImportLicenciesDto): Promise<ImportLicenciesResultDto> {
  return fetcher<ImportLicenciesResultDto>(`/v1/clubs/${clubId}/licencies/import`, { method: "POST", body, timeoutMs: 60_000 });
}

export type LicenceSyncResultDto = components["schemas"]["LicenceSyncResultDto"];
export type LicenceImportStatusDto = components["schemas"]["LicenceImportStatusDto"];

/**
 * Import des licenciés depuis FBI (retour du club, 2026-10-08 : « faut que
 * tout soit pour les nuls ») — l'admin dépose le fichier Excel FBI tel quel
 * (« Gestion des licences », filtre Validé, bouton Excel).
 */
export async function importLicencesFile(fetcher: ApiFetcher, clubId: string, file: File): Promise<LicenceSyncResultDto> {
  const form = new FormData();
  form.append("file", file);
  return fetcher<LicenceSyncResultDto>(`/v1/clubs/${clubId}/licencies/import/file`, { method: "POST", body: form, timeoutMs: 60_000 });
}

/** « Mettre à jour depuis FBI » : la mise à jour se fait en arrière-plan dans la session FBI du club (aussi chaque jour). */
export async function requestFbiLicenceImport(fetcher: ApiFetcher, clubId: string): Promise<{ jobId: string | null; alreadyQueued: boolean }> {
  return fetcher(`/v1/clubs/${clubId}/licencies/import/fbi`, { method: "POST" });
}

export async function getLicenceImportStatus(fetcher: ApiFetcher, clubId: string): Promise<LicenceImportStatusDto> {
  return fetcher<LicenceImportStatusDto>(`/v1/clubs/${clubId}/licencies/import/status`);
}

/**
 * POST /v1/clubs/:clubId/licencies/auto-assign-teams (club_admin) —
 * répartition automatique best-effort des licenciés sans équipe, à partir
 * de la catégorie/du sexe FFBB connus ("on a une info pour commencer déjà
 * a les mettre dans les équipes, si ya 2 equipes pour 1 catégorie, met
 * tous dans 1 seule pour linstant", demande du club, 2026-09-28). Reste un
 * point de départ, jamais une vérité définitive — voir docs/LICENCIES.md
 * côté ball-manager-back.
 */
export async function autoAssignTeams(fetcher: ApiFetcher, clubId: string): Promise<AutoAssignTeamsResultDto> {
  return fetcher<AutoAssignTeamsResultDto>(`/v1/clubs/${clubId}/licencies/auto-assign-teams`, { method: "POST", timeoutMs: 30_000 });
}

/**
 * DELETE /v1/clubs/:clubId/licencies/:licencieId (club_admin) — supprime
 * DÉFINITIVEMENT la fiche ("faut aussi un bouton pour supprimer un
 * licencié", demande du club, 2026-09-28). Sûre sans condition — voir
 * docs/LICENCIES.md côté ball-manager-back (l'historique de match n'est
 * jamais perdu). Pour archiver un·e licencié·e qui a quitté le club sans
 * perdre sa fiche, `updateLicencieProfile(..., { active: false })` reste
 * le bon geste.
 */
export async function deleteLicencie(fetcher: ApiFetcher, clubId: string, licencieId: string): Promise<DeleteLicencieResultDto> {
  return fetcher<DeleteLicencieResultDto>(`/v1/clubs/${clubId}/licencies/${licencieId}`, { method: "DELETE" });
}

export type CreateLicencieDto = components["schemas"]["CreateLicencieDto"];

/** POST /v1/clubs/:clubId/licencies (club_admin) — ajout manuel, ex. un coach non licencié dans ce club. */
export async function createLicencie(fetcher: ApiFetcher, clubId: string, body: CreateLicencieDto): Promise<LicencieDto> {
  return fetcher<LicencieDto>(`/v1/clubs/${clubId}/licencies`, { method: "POST", body });
}

/** POST …/licencies/:licencieId/photo — photo DÉJÀ compressée (voir lib/images/compress-photo.ts), base64. */
export async function uploadLicenciePhoto(fetcher: ApiFetcher, clubId: string, licencieId: string, body: { contentType: "image/webp" | "image/jpeg"; data: string }): Promise<LicencieDto> {
  return fetcher<LicencieDto>(`/v1/clubs/${clubId}/licencies/${licencieId}/photo`, { method: "POST", body, timeoutMs: 60_000 });
}

/** DELETE …/licencies/:licencieId/photo — retire la photo de la fiche. */
export async function deleteLicenciePhoto(fetcher: ApiFetcher, clubId: string, licencieId: string): Promise<LicencieDto> {
  return fetcher<LicencieDto>(`/v1/clubs/${clubId}/licencies/${licencieId}/photo`, { method: "DELETE" });
}
