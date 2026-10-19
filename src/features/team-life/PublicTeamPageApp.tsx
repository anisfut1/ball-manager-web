"use client";

import { useCallback } from "react";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { LicensedAccessGate } from "@/features/licensed-access/LicensedAccessGate";
import { usePublicIdentity } from "@/features/public/PublicIdentityProvider";
import { ApiError } from "@/lib/api/errors";
import { publicTeamLife } from "@/lib/api/teamLife";
import { getDeviceTokens } from "@/lib/publicToken";
import { TeamPageView } from "./TeamPageView";
import type { TeamTab } from "./team-tab";

/**
 * Page Équipe de l'espace public : réservée aux joueurs de l'équipe et à
 * ceux qui la gèrent. Plusieurs enfants sur l'appareil : on essaie chaque
 * lien jusqu'à celui qui donne accès à l'équipe.
 */
export function PublicTeamPageApp({ clubSlug, teamId, timezone, tab }: { clubSlug: string; teamId: string; timezone: string; tab: TeamTab }) {
  const { identity } = usePublicIdentity();
  const token = identity?.token;
  const loadOverview = useCallback(async () => {
    const tokens = [...new Set([token!, ...getDeviceTokens(clubSlug)])];
    let lastError: unknown = null;
    for (const t of tokens) {
      try {
        return await publicTeamLife.teamOverview(clubSlug, t, teamId);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 403)) throw err;
        lastError = err;
      }
    }
    throw lastError;
  }, [clubSlug, teamId, token]);
  const loadPlanning = useCallback(
    (period: { from: string; to: string }) => publicTeamLife.planning(clubSlug, [...new Set([token!, ...getDeviceTokens(clubSlug)])], { from: period.from, to: period.to, teamId }),
    [clubSlug, teamId, token],
  );

  if (identity === undefined) return <ListSkeleton rows={5} />;
  if (identity === null) return <LicensedAccessGate module="team" />;

  return (
    <TeamPageView
      tab={tab}
      basePath={`/public/${clubSlug}/equipes/${teamId}`}
      timezone={timezone}
      loadOverview={loadOverview}
      loadPlanning={loadPlanning}
      matchHref={(id) => `/public/${clubSlug}/matchs/${id}`}
      manageTrainingsHref={`/public/${clubSlug}/entrainements?equipe=${teamId}`}
    />
  );
}
