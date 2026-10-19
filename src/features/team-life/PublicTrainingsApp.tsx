"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { LicensedAccessGate } from "@/features/licensed-access/LicensedAccessGate";
import { usePublicIdentity, type PublicIdentity } from "@/features/public/PublicIdentityProvider";
import { getPublicDerogationContext } from "@/lib/api/publicDerogationRequests";
import { getPublicHome } from "@/lib/api/publicHome";
import { listPublicTeams } from "@/lib/api/publicMatches";
import { teamDisplayName } from "./labels";
import { TeamTrainingsManager } from "./TeamTrainingsManager";
import { publicTeamLifeClient } from "./team-life-client";

/**
 * Entraînements — espace public (lien personnel) : le coach gère les
 * équipes cochées sur sa fiche, l'admin du club toutes les équipes. Mêmes
 * écrans que l'espace club.
 */
export function PublicTrainingsApp({ clubSlug, club, initialTeamId, initialOccurrenceId }: { clubSlug: string; club: { name: string; timezone: string }; initialTeamId?: string | null; initialOccurrenceId?: string | null }) {
  const { identity } = usePublicIdentity();
  if (identity === undefined) return <ListSkeleton rows={5} />;
  if (identity === null) return <LicensedAccessGate module="trainings" />;
  return <Manager key={identity.token} clubSlug={clubSlug} club={club} identity={identity} initialTeamId={initialTeamId} initialOccurrenceId={initialOccurrenceId} />;
}

function Manager({ clubSlug, club, identity, initialTeamId, initialOccurrenceId }: { clubSlug: string; club: { name: string; timezone: string }; identity: PublicIdentity; initialTeamId?: string | null; initialOccurrenceId?: string | null }) {
  const [teams, setTeams] = useState<{ id: string; name: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useMemo(() => publicTeamLifeClient(clubSlug, identity.token), [clubSlug, identity.token]);
  const loadVenues = useCallback(() => getPublicDerogationContext(clubSlug, identity.token).then((c) => c.venues.map((v) => ({ id: v.id, name: v.name }))), [clubSlug, identity.token]);

  useEffect(() => {
    let cancelled = false;
    getPublicHome(clubSlug, identity.token)
      .then(async (home) => {
        if (home.roles.admin) {
          const all = await listPublicTeams(clubSlug);
          return all.filter((t) => t.active).map((t) => ({ id: t.id, name: teamDisplayName(t) }));
        }
        return home.teams.filter((t) => t.relation === "COACH").map((t) => ({ id: t.id, name: t.name }));
      })
      .then((list) => !cancelled && setTeams(list))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Chargement impossible."));
    return () => {
      cancelled = true;
    };
  }, [clubSlug, identity.token]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={club.name}
        title="Entraînements"
        description="Les créneaux de ton équipe et les réponses des joueurs."
        actions={
          <ButtonLink href={`/public/${clubSlug}/planning`} variant="ghost" icon={<CalendarRange />}>
            Planning
          </ButtonLink>
        }
      />
      {error ? (
        <ErrorState title="Entraînements indisponibles" description={error} />
      ) : !teams ? (
        <ListSkeleton rows={4} />
      ) : teams.length === 0 ? (
        <EmptyState icon={<Lock />} title="Réservé aux coachs" description="Seuls les coachs (pour leurs équipes) et les administrateurs du club planifient les entraînements. Un administrateur peut te désigner coach depuis la liste des joueurs." />
      ) : (
        <TeamTrainingsManager client={client} teams={teams} timezone={club.timezone} loadVenues={loadVenues} initialTeamId={initialTeamId} initialOccurrenceId={initialOccurrenceId} />
      )}
    </div>
  );
}
