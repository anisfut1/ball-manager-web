import { notFound } from "next/navigation";
import { getPublicClub } from "@/lib/api/publicTables";
import { getPublicPlayer, type PublicPlayerProfileDto } from "@/lib/api/publicMatches";
import { ApiError } from "@/lib/api/client";
import { PageContainer, BackButton } from "@/components/ui/PageHeader";
import { PublicPlayerProfile } from "@/features/public-players/PublicPlayerProfile";

/** Fiche joueur publique, sans compte (retour du club, 2026-10-08) — voir ball-manager-back `GET /v1/public/clubs/:clubSlug/players/:licencieId`. */
export default async function PublicPlayerPage({ params }: { params: Promise<{ clubSlug: string; licencieId: string }> }) {
  const { clubSlug, licencieId } = await params;

  let club;
  let profile: PublicPlayerProfileDto;
  try {
    [club, profile] = await Promise.all([getPublicClub(clubSlug), getPublicPlayer(clubSlug, licencieId)]);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return (
    <PageContainer width="default" className="gap-6">
      <BackButton href={`/public/${clubSlug}/matchs`} label="Retour aux matchs" />
      <PublicPlayerProfile profile={profile} clubName={club.name} matchBasePath={`/public/${clubSlug}/matchs`} />
    </PageContainer>
  );
}
