import { notFound } from "next/navigation";
import { getPublicClub } from "@/lib/api/publicTables";
import { getPublicMatch, listPublicMatchDocuments } from "@/lib/api/publicMatches";
import { ApiError } from "@/lib/api/client";
import { PageContainer, BackButton } from "@/components/ui/PageHeader";
import { MatchDetailView } from "@/features/matches/detail/MatchDetailView";
import { parseMatchTab } from "@/features/matches/detail/labels";
import type { MatchDetailsDto } from "@/lib/api/matches";
import { PublicMatchRequestBlock } from "@/features/public-derogations/PublicMatchRequestBlock";
import { PublicOfficialDerogationBlock } from "@/features/public-derogations/PublicOfficialDerogationBlock";
import { PublicMatchFamilyBlock, PublicMatchTeamLifeBlock } from "@/features/team-life/MatchTeamLifeBlocks";

/**
 * Fiche match PUBLIQUE (retour du club, 2026-09-29 : "toutes les infos en
 * vue directe... sans les fonctions admin, et sans compte"). Mêmes onglets
 * que la vue authentifiée (MatchDetailView en `mode="public"`) : aucun
 * bouton d'action pour un simple visiteur — voir ball-manager-back/docs/PUBLIC_MATCHES.md.
 * Seule exception : un coach reconnu par son lien personnel peut demander une
 * dérogation (`PublicMatchRequestBlock`, retour du club 2026-10-01).
 */
export default async function PublicMatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clubSlug, id } = await params;
  const tab = parseMatchTab((await searchParams).tab);

  let club;
  let match: MatchDetailsDto;
  try {
    // Aucune dérogation en vue publique (retour du club, 2026-10-01) : jamais chargée ici.
    [club, match] = await Promise.all([getPublicClub(clubSlug), getPublicMatch(clubSlug, id)]);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const documents = tab === "emarque" ? await listPublicMatchDocuments(clubSlug, id) : null;

  return (
    <PageContainer width="wide" className="gap-6">
      <BackButton href={`/public/${clubSlug}/matchs`} label="Retour aux matchs" />
      <MatchDetailView
        match={match}
        derogation={null}
        documents={documents}
        tab={tab}
        basePath={`/public/${clubSlug}/matchs`}
        club={{ name: club.name, logoUrl: club.logoUrl }}
        derogationClubId={club.slug}
        mode="public"
        isAdmin={false}
        playerBasePath={`/public/${clubSlug}/joueurs`}
      />
      {/* Famille : disponibilité / convocation / maillots de CE match (destination des liens de convocation, web et app iOS). */}
      {tab === "informations" ? <PublicMatchFamilyBlock clubSlug={clubSlug} matchId={id} timezone={club.timezone} /> : null}
      {/* Vie d'équipe (Lot 2) : disponibilités et convocation, coach de l'équipe / admin reconnu par son lien. */}
      {tab === "informations" ? <PublicMatchTeamLifeBlock clubSlug={clubSlug} matchId={id} timezone={club.timezone} /> : null}
      {/* Coach reconnu par son lien personnel : demande de dérogation depuis la fiche (rien pour les autres visiteurs). */}
      {tab === "informations" ? <PublicMatchRequestBlock clubSlug={clubSlug} matchId={id} /> : null}
      {/* Admin du club ou coordinateur : dérogation officielle FBI directement depuis la fiche (2026-10-02). */}
      {tab === "informations" ? <PublicOfficialDerogationBlock clubSlug={clubSlug} matchId={id} /> : null}
    </PageContainer>
  );
}
