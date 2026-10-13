import { requireClubAdminContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { PublicAccessList } from "@/features/tables/PublicAccessList";
import { PublicLinkBanner } from "@/features/tables/PublicLinkBanner";
import { ClaimRequestsPanel } from "@/features/tables/ClaimRequestsPanel";

/**
 * Vue admin des accès publics sans compte (retour du club, 2026-09-29) : qui
 * a déjà revendiqué son lien personnel sur le lien commun. `club_admin`
 * uniquement — la gestion d'identité/accès est plus sensible que la simple
 * gestion des postes (voir ball-manager-back/docs/PUBLIC_TABLE_ACCESS.md).
 */
export default async function PublicAccessPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await requireClubAdminContext(clubSlug);
  const [entries, claimRequests] = await Promise.all([api.tables.listPublicAccess(club.id), api.tables.claimRequests(club.id)]);

  return (
    <PageContainer width="default">
      <PageHeader
        back={{ href: `/c/${clubSlug}/tables`, label: "Tables de marque" }}
        eyebrow="Tables de marque"
        title="Accès publics"
        description="Qui a déjà revendiqué son lien personnel sans compte. Réinitialise l'accès d'un licencié si son lien est perdu — ses affectations existantes ne sont jamais touchées."
      />
      <PublicLinkBanner clubSlug={clubSlug} />
      <ClaimRequestsPanel clubId={club.id} requests={claimRequests} />
      <PublicAccessList clubId={club.id} entries={entries} />
    </PageContainer>
  );
}
