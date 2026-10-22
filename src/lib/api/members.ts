import type { ApiFetcher } from "./client";
import type { components } from "./generated/schema";

/** Gymnases du club (planning des demandes de dérogation). Les rôles Coach / Coordinateur se posent sur les licenciés (/joueurs). */
export type ClubVenueAdminDto = components["schemas"]["ClubVenueAdminDto"];
export type UpdateClubVenueDto = components["schemas"]["UpdateClubVenueDto"];

export async function listClubVenues(fetcher: ApiFetcher, clubId: string): Promise<ClubVenueAdminDto[]> {
  const { venues } = await fetcher<{ venues: ClubVenueAdminDto[] }>(`/v1/clubs/${clubId}/venues`);
  return venues;
}

export async function updateClubVenue(fetcher: ApiFetcher, clubId: string, venueId: string, body: UpdateClubVenueDto): Promise<ClubVenueAdminDto> {
  const { venue } = await fetcher<{ venue: ClubVenueAdminDto }>(`/v1/clubs/${clubId}/venues/${venueId}`, { method: "PATCH", body });
  return venue;
}

/** Indisponibilités des gymnases (journée, matin, après-midi) et leurs conflits avec matchs à domicile et entraînements. */
export type VenueClosureDto = components["schemas"]["VenueClosureDto"];
export type VenueClosurePeriod = components["schemas"]["VenueClosurePeriod"];
export type CreateVenueClosureDto = components["schemas"]["CreateVenueClosureDto"];

export async function listVenueClosures(fetcher: ApiFetcher, clubId: string): Promise<VenueClosureDto[]> {
  const { closures } = await fetcher<{ closures: VenueClosureDto[] }>(`/v1/clubs/${clubId}/venues/closures`);
  return closures;
}

export async function createVenueClosure(fetcher: ApiFetcher, clubId: string, body: CreateVenueClosureDto): Promise<VenueClosureDto> {
  const { closure } = await fetcher<{ closure: VenueClosureDto }>(`/v1/clubs/${clubId}/venues/closures`, { method: "POST", body });
  return closure;
}

export async function deleteVenueClosure(fetcher: ApiFetcher, clubId: string, closureId: string): Promise<void> {
  await fetcher<{ deleted: boolean }>(`/v1/clubs/${clubId}/venues/closures/${closureId}`, { method: "DELETE" });
}
