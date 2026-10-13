import { notFound } from "next/navigation";
import { getPublicClub } from "@/lib/api/publicTables";
import { listPublicMatches, listPublicTeams } from "@/lib/api/publicMatches";
import { ApiError } from "@/lib/api/client";
import { currentSeasonStart } from "@/lib/season";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { MatchesView } from "@/features/matches/MatchesView";
import { parseMatchFilters } from "@/features/matches/match-filters";
import { loadMatchesForView } from "@/features/matches/load-matches";
import { matchesServerFiltersEnabled } from "@/config/flags";

/**
 * Vue PUBLIQUE en lecture seule des matchs (retour du club, 2026-09-29 :
 * "je veux une vue publique avec toutes les infos en vue directe, sans les
 * boutons etc, en gros sans les fonctions admin, et sans compte, en libre
 * service") — même rendu que `/c/{clubSlug}/matchs` (MatchesView), sans
 * session Supabase : toutes les données viennent de
 * `GET /v1/public/clubs/{clubSlug}/...` (voir ball-manager-back/docs/PUBLIC_MATCHES.md),
 * aucune action possible.
 */
export default async function PublicMatchsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clubSlug } = await params;

  let club;
  try {
    club = await getPublicClub(clubSlug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const filters = parseMatchFilters(await searchParams);
  const { teams, matches } = await loadMatchesForView({
    serverFilters: matchesServerFiltersEnabled(),
    filters,
    seasonStart: currentSeasonStart(),
    now: new Date(),
    fetchTeams: () => listPublicTeams(clubSlug),
    fetchMatches: (params) => listPublicMatches(clubSlug, params),
  });

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow={club.name} title="Matchs de la saison" description="Horaires, salles et résultats, mis à jour automatiquement." />
      <MatchesView all={matches} teams={teams} filters={filters} basePath={`/public/${clubSlug}/matchs`} club={{ name: club.name, logoUrl: club.logoUrl }} />
    </PageContainer>
  );
}
