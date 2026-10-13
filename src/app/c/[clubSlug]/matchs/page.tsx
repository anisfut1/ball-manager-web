import { Globe } from "lucide-react";
import { requireClubContext } from "@/lib/tenancy/club-context";
import { isClubAdmin } from "@/lib/permissions/roles";
import { getShellIdentity } from "@/components/shell/session";
import { api } from "@/lib/api/server";
import { currentSeasonStart } from "@/lib/season";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { MatchesView } from "@/features/matches/MatchesView";
import { parseMatchFilters } from "@/features/matches/match-filters";
import { loadMatchesForView } from "@/features/matches/load-matches";
import { matchesServerFiltersEnabled } from "@/config/flags";

/**
 * Vue "Ce week-end" + filtres (ARCHITECTURE.md §3, Module 1), scopée au
 * club de l'URL. Lecture seule, via ball-manager-back (§14 de la demande) —
 * ce frontend n'interroge plus jamais `matches`/`teams` directement.
 *
 * `api.matches.list` filtre déjà sur la saison en cours côté API
 * (`from: currentSeasonStart()`, voir `src/lib/api/matches.ts`) — les
 * saisons passées restent en base (jamais supprimées côté API) mais ne
 * sont pas chargées par cette page, ni par défaut ni sur les filtres
 * when/side/team (voir src/features/matches/match-filters.ts). Volontaire :
 * demande explicite de ne pas afficher/charger l'historique.
 */
export default async function MatchsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clubSlug } = await params;
  const club = await requireClubContext(clubSlug);
  const filters = parseMatchFilters(await searchParams);

  const { teams, matches } = await loadMatchesForView({
    serverFilters: matchesServerFiltersEnabled(),
    filters,
    seasonStart: currentSeasonStart(),
    now: new Date(),
    fetchTeams: () => api.clubs.teams(club.id),
    fetchMatches: (params) => api.matches.list(club.id, params),
  });

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Saison en cours"
        title="Matchs"
        description="Calendrier, résultats et compositions, synchronisés depuis la FFBB et FBI."
        actions={
          <ButtonLink href={`/public/${clubSlug}/matchs`} variant="secondary" icon={<Globe />}>
            Vue publique
          </ButtonLink>
        }
      />
      <MatchesView all={matches} teams={teams} filters={filters} basePath={`/c/${clubSlug}/matchs`} club={{ name: club.shortName ?? club.name, logoUrl: club.logoUrl, showDerogation: isClubAdmin(club.roles) || (await getShellIdentity()).isPlatformAdmin }} />
    </PageContainer>
  );
}
