import { requireClubAdminContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { TeamsManager } from "@/features/admin/TeamsManager";

/**
 * Gestion des équipes (demande du club, voir docs/TEAMS.md côté
 * ball-manager-back) : créer/renommer/reclasser/activer une équipe AVANT
 * même tout engagement FFBB confirmé (catégories encore en phase de
 * brassage en 2026-2027).
 */
export default async function ClubTeamsAdminPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await requireClubAdminContext(clubSlug);
  const teams = await api.clubs.teams(club.id);

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Administration" title="Équipes" description="Structure sportive du club. La synchronisation FFBB réutilise ces équipes (résolution par catégorie, sexe et numéro — jamais par le nom)." />
      <TeamsManager clubId={club.id} teams={teams} />
    </PageContainer>
  );
}
