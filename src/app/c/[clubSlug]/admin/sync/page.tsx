import { Activity, AlertTriangle, CheckCircle2, CircleDashed, Clock, Loader2, XCircle } from "lucide-react";
import { requireClubAdminContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import { currentSeasonStart } from "@/lib/season";
import { PageContainer, PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type BadgeTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { EMARQUE_STATUS } from "@/features/matches/detail/labels";
import type { ReactNode } from "react";

function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—";
}

function duration(startedAt: string, finishedAt: string | null): string | null {
  if (!finishedAt) return null;
  const seconds = Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

const RUN_STATUS: Record<string, { label: string; tone: BadgeTone; icon: ReactNode }> = {
  running: { label: "En cours", tone: "info", icon: <Loader2 className="animate-spin" /> },
  success: { label: "Réussie", tone: "success", icon: <CheckCircle2 /> },
  partial: { label: "Partielle", tone: "warning", icon: <AlertTriangle /> },
  error: { label: "Erreur", tone: "danger", icon: <XCircle /> },
};

/**
 * Tableau de bord de synchronisation (ARCHITECTURE.md §20/§21), scopé à CE
 * club — §22 de la demande : `GET /v1/clubs/:clubId/sync-runs` +
 * `GET /v1/clubs/:clubId/matches` (statuts e-Marque comptés côté
 * frontend, affichage uniquement), plus aucun accès Supabase direct.
 *
 * `api.matches.list` filtre sur la saison en cours (`from: currentSeasonStart()`,
 * même règle que la page Matchs, voir src/lib/api/matches.ts).
 */
export default async function SyncDashboardPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await requireClubAdminContext(clubSlug);

  const [syncRuns, matches] = await Promise.all([api.integrations.syncRuns(club.id), api.matches.list(club.id, { from: currentSeasonStart().toISOString() })]);

  const statusCounts = new Map<string, number>();
  for (const match of matches) {
    statusCounts.set(match.emarqueStatus, (statusCounts.get(match.emarqueStatus) ?? 0) + 1);
  }

  const recentSyncRuns = syncRuns.slice(0, 10);
  const lastRun = recentSyncRuns[0];

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Administration"
        title="Synchronisation"
        description={`Suivi des dernières exécutions automatiques pour ${club.name}. Tableau de bord de lecture — les jobs tournent seuls (cron côté ball-manager-back), sans intervention nécessaire ici.`}
        meta={
          lastRun ? (
            <StatusBadge tone={RUN_STATUS[lastRun.status]?.tone ?? "neutral"} icon={RUN_STATUS[lastRun.status]?.icon}>
              Dernière exécution : {formatDateTime(lastRun.startedAt)}
            </StatusBadge>
          ) : null
        }
      />

      <section className="flex flex-col gap-4">
        <SectionHeader title="Matchs par statut e-Marque" description="Saison en cours" />
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(EMARQUE_STATUS).map(([status, meta]) => {
            const count = statusCounts.get(status) ?? 0;
            return (
              <div key={status} className={count > 0 ? "surface-card flex flex-col gap-2 p-4" : "surface-panel flex flex-col gap-2 p-4"}>
                <dt className="flex items-center gap-2 text-[12.5px] text-muted">
                  <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${count === 0 ? "bg-border-strong" : meta.tone === "success" ? "bg-success" : meta.tone === "danger" ? "bg-danger" : meta.tone === "warning" ? "bg-warning" : meta.tone === "info" ? "bg-info" : "bg-subtle"}`} />
                  {meta.label}
                </dt>
                <dd className={`type-numeric text-2xl font-medium leading-none ${count === 0 ? "text-subtle" : "text-foreground"}`}>{count}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader title="Dernières synchronisations FFBB / FBI" description="10 plus récentes" />
        {recentSyncRuns.length > 0 ? (
          <ol className="surface-card divide-y divide-border overflow-hidden">
            {recentSyncRuns.map((run) => {
              const meta = RUN_STATUS[run.status] ?? { label: run.status, tone: "neutral" as const, icon: <CircleDashed /> };
              const took = duration(run.startedAt, run.finishedAt);
              return (
                <li key={run.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4">
                  <span className="type-numeric inline-flex h-7 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-[11px] font-semibold tracking-wider text-foreground">{run.provider.toUpperCase()}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock aria-hidden className="size-3.5 text-subtle" />
                        {formatDateTime(run.startedAt)}
                      </span>
                      {took ? <span className="type-meta">durée {took}</span> : null}
                    </p>
                    {run.errorLog ? <p className="text-reflow rounded-md bg-danger-soft px-2.5 py-1.5 font-mono text-xs text-danger">{run.errorLog}</p> : null}
                  </div>
                  <StatusBadge tone={meta.tone} icon={meta.icon} size="sm">
                    {meta.label}
                  </StatusBadge>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState icon={<Activity />} title="Aucune synchronisation exécutée pour l'instant" compact />
        )}
      </section>
    </PageContainer>
  );
}
