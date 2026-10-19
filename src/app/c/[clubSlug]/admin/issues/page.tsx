import { AlertOctagon, AlertTriangle, CalendarDays, FileWarning, ShieldCheck } from "lucide-react";
import { requireClubAdminContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import type { IssueDto } from "@/lib/api/issues";
import { Card } from "@/components/ui/Card";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ResolveIssueButton } from "@/features/admin/ResolveIssueButton";
import { DismissIssueButton } from "@/features/admin/DismissIssueButton";

function formatDateTime(value: string | null | undefined): string {
  return value
    ? new Date(value).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : "Date inconnue";
}

/** Libellé court, compréhensible sans connaître FBI ni e-Marque. */
const TYPE_LABELS: Record<IssueDto["type"], string> = {
  venue_time_conflict: "Même salle, même créneau",
  team_double_booking: "Équipe programmée deux fois le même jour",
  fbi_schedule_mismatch: "Horaire ou salle différents entre FFBB et FBI",
  fbi_schedule_missing_in_ffbb: "Rencontre absente du calendrier FFBB",
  fbi_schedule_missing_in_fbi: "Rencontre absente de FBI",
  emarque_import_error: "Feuille de match illisible",
  emarque_needs_review: "Feuille de match à vérifier",
};

const SECTIONS: { title: string; description: string; matches: (issue: IssueDto) => boolean }[] = [
  {
    title: "Conflits de planning",
    description: "Deux matchs qui se gênent : même salle sur des créneaux qui se chevauchent, ou une équipe qui joue deux fois le même jour.",
    matches: (issue) => issue.integration === "scheduling",
  },
  {
    title: "Écarts FFBB / FBI",
    description: "FBI fait foi : vérifie l'horaire ou la salle sur FBI.",
    matches: (issue) => issue.integration === "fbi_schedule",
  },
  {
    title: "Feuilles de match",
    description: "Feuille e-Marque à relire avant de publier les statistiques.",
    matches: (issue) => issue.integration === "emarque",
  },
];

/**
 * Anomalies à traiter. Les conflits de planning d'abord (retour du club,
 * 2026-10-19 : « Jveux surtout les anomalies des matchs sur même créneau
 * même salle »). Chaque anomalie peut être retirée de la liste ; elle
 * revient si la situation change (match déplacé, nouveau conflit).
 */
export default async function IssuesPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await requireClubAdminContext(clubSlug);

  // Les anomalies « corrigées automatiquement » (FBI fait foi, rien à faire)
  // ne sont pas affichées — retour du club, 2026-10-01.
  const issues = (await api.issues.list(club.id)).filter((issue) => issue.status !== "auto_corrected");
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  return (
    <PageContainer width="default">
      <PageHeader
        eyebrow="Administration"
        title="Anomalies"
        description={`Ce qui demande une action pour ${club.name}. Retire une anomalie quand elle est traitée ou sans objet : elle reviendra seulement si la situation change.`}
        meta={
          issues.length > 0 ? (
            <>
              <StatusBadge tone="danger" icon={<AlertOctagon />}>
                {errors} à corriger
              </StatusBadge>
              <StatusBadge tone="warning" icon={<AlertTriangle />}>
                {warnings} à vérifier
              </StatusBadge>
            </>
          ) : null
        }
      />

      {issues.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title="Aucune anomalie" description="Pas de conflit de planning ni de feuille de match à vérifier." />
      ) : (
        <div className="flex flex-col gap-8">
          {SECTIONS.map((section) => {
            const sectionIssues = issues.filter(section.matches);
            if (sectionIssues.length === 0) return null;
            return (
              <section key={section.title} className="flex flex-col gap-3">
                <div>
                  <h2 className="type-section text-foreground">
                    {section.title} <span className="text-subtle">({sectionIssues.length})</span>
                  </h2>
                  <p className="type-meta mt-1">{section.description}</p>
                </div>
                <ul className="flex flex-col gap-3">
                  {sectionIssues.map((issue) => (
                    <li key={issue.key}>
                      <IssueCard issue={issue} clubId={club.id} clubSlug={clubSlug} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

function IssueCard({ issue, clubId, clubSlug }: { issue: IssueDto; clubId: string; clubSlug: string }) {
  const isError = issue.severity === "error";
  return (
    <Card className="overflow-hidden p-0 sm:p-0" padded={false}>
      <div className="flex">
        <span aria-hidden className={cn("w-1 shrink-0", isError ? "bg-danger" : "bg-warning")} />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="text-reflow">
              <p className="type-eyebrow">{TYPE_LABELS[issue.type]}</p>
              <h3 className="type-card mt-1 text-foreground">{`Match n°${issue.numero ?? "?"} — vs ${issue.opponentName ?? "?"}`}</h3>
            </div>
            <StatusBadge tone={isError ? "danger" : "warning"} icon={isError ? <AlertOctagon /> : <AlertTriangle />} size="sm">
              {isError ? "À corriger" : "À vérifier"}
            </StatusBadge>
          </div>

          <p className="type-meta flex items-center gap-1.5 first-letter:uppercase">
            <CalendarDays aria-hidden className="size-3.5 text-subtle" />
            {formatDateTime(issue.matchDatetime)}
          </p>

          <p className="text-sm leading-relaxed text-foreground">{issue.message}</p>

          {issue.qualityWarnings.length > 0 ? (
            <ul className="flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-surface px-3 py-2.5">
              {issue.qualityWarnings.map((warning, warningIndex) => (
                <li key={`${issue.key}-${warning.code}-${warningIndex}`} className="flex items-start gap-2 text-[13px] text-muted">
                  <FileWarning aria-hidden className="mt-0.5 size-3.5 shrink-0 text-subtle" />
                  {warning.message}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {issue.matchId ? (
              <ButtonLink href={`/c/${clubSlug}/matchs/${issue.matchId}${issue.integration === "emarque" ? "?tab=emarque" : ""}`} variant="secondary" size="sm">
                Ouvrir le match
              </ButtonLink>
            ) : null}
            {issue.integration === "emarque" && issue.matchId ? <ResolveIssueButton clubId={clubId} matchId={issue.matchId} /> : null}
            <DismissIssueButton clubId={clubId} issueKey={issue.key} />
          </div>
        </div>
      </div>
    </Card>
  );
}
