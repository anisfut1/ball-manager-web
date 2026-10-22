import { requireClubAdminContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { VenuesManager } from "@/features/admin/VenuesManager";
import { VenueClosuresManager } from "@/features/admin/VenueClosuresManager";

/**
 * Gymnases proposés dans le planning des demandes de dérogation (club_admin)
 * et leurs indisponibilités (journée ou demi-journée, conflits avec matchs et
 * entraînements — demande du club, 2026-10-22).
 * Les rôles Coach / Coordinateur se posent depuis la liste des joueurs
 * (retour du club, 2026-10-01 : « comme on a fait pour l'admin »).
 */
export default async function ClubVenuesAdminPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await requireClubAdminContext(clubSlug);
  const [venues, closures] = await Promise.all([api.members.venues(club.id), api.members.venueClosures(club.id)]);

  return (
    <PageContainer>
      <PageHeader eyebrow="Administration" title="Gymnases" description="Gymnases proposés dans le planning des demandes de dérogation, et leurs indisponibilités. Ils sont repris automatiquement des matchs à domicile synchronisés depuis la FFBB." />
      <div className="flex flex-col gap-6">
        <VenueClosuresManager clubId={club.id} clubSlug={clubSlug} timeZone={club.timezone || "Europe/Paris"} venues={venues} initialClosures={closures} />
        <VenuesManager clubId={club.id} clubSlug={clubSlug} initialVenues={venues} />
      </div>
    </PageContainer>
  );
}
