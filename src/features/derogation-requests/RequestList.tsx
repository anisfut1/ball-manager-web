import Link from "next/link";
import { Archive, ArrowRight, CalendarClock, ChevronDown, ChevronRight, MapPin, MessageSquare, UserRound } from "lucide-react";
import { SectionHeader } from "@/components/ui/PageHeader";
import type { DerogationRequestSummaryDto } from "@/lib/api/derogationRequests";
import { formatRelative, formatShortDateTime, groupRequests, teamLabel } from "./labels";
import { RequestStatusBadge } from "./parts";
import type { DerogationSource } from "./client";
import { DeleteRequestButton } from "./DeleteRequestButton";

/**
 * Liste des demandes, regroupées en sections (inbox du coordinateur ou
 * suivi du coach — voir `groupRequests`). Server Component : données déjà
 * filtrées par ball-manager-back selon les droits.
 */
/**
 * Archivée : demande terminée / annulée, ou match passé (retour du club,
 * 2026-10-08 : "les matchs passés on peut les archiver, idem les demandes
 * terminées"). Repliée par défaut, jamais supprimée sans action explicite.
 */
export function isArchivedRequest(r: DerogationRequestSummaryDto, now: Date): boolean {
  if (r.status === "COMPLETED" || r.status === "CANCELLED") return true;
  const times = [r.originalScheduledAt, r.requestedStartAt].filter((v): v is string => Boolean(v)).map((v) => Date.parse(v)).filter(Number.isFinite);
  return times.length > 0 && Math.max(...times) < now.getTime();
}

export function RequestSections({
  requests,
  manager,
  timezone,
  basePath,
  source,
  onDeleted,
}: {
  requests: DerogationRequestSummaryDto[];
  manager: boolean;
  timezone: string;
  basePath: string;
  /** Pour le bouton Supprimer des archives (coordinateur) ; absent : pas de suppression. */
  source?: DerogationSource;
  onDeleted?: (id: string) => void;
}) {
  const now = new Date();
  const active = requests.filter((r) => !isArchivedRequest(r, now));
  const archived = requests.filter((r) => isArchivedRequest(r, now));
  const sections = groupRequests(active, manager);
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <section key={section.key} aria-labelledby={`sec-${section.key}`} className="flex flex-col gap-3">
          <SectionHeader
            id={`sec-${section.key}`}
            title={
              <span className="flex items-center gap-2">
                {section.title}
                <span className="type-numeric rounded-full bg-surface-muted px-2 text-[12px] leading-6 text-muted">{section.requests.length}</span>
              </span>
            }
            description={section.description}
          />
          <ul className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
            {section.requests.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} manager={manager} timezone={timezone} href={`${basePath}/${r.id}`} now={now} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {sections.length === 0 ? <p className="type-meta">Aucune demande en cours.</p> : null}

      {archived.length > 0 ? (
        <details className="group flex flex-col gap-3 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
            <Archive aria-hidden className="size-4" />
            Archives
            <span className="type-numeric rounded-full bg-surface-muted px-2 text-[12px] leading-6 text-muted">{archived.length}</span>
            <span className="type-meta font-normal">— demandes terminées, annulées ou dont le match est passé</span>
            <ChevronDown aria-hidden className="size-4 transition-transform duration-150 group-open:rotate-180" />
          </summary>
          <ul className="mt-3 grid grid-cols-1 gap-2.5 xl:grid-cols-2">
            {archived.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5">
                <RequestCard request={r} manager={manager} timezone={timezone} href={`${basePath}/${r.id}`} now={now} />
                {manager && source && (r.status === "COMPLETED" || r.status === "CANCELLED") ? (
                  <div className="flex justify-end">
                    <DeleteRequestButton source={source} requestId={r.id} onDeleted={onDeleted} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function RequestCard({ request: r, manager, timezone, href, now }: { request: DerogationRequestSummaryDto; manager: boolean; timezone: string; href: string; now: Date }) {
  const attention = manager ? r.needsCoordinatorAttention : r.status === "NEEDS_CHANGE";
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-4 shadow-1 transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-2"
    >
      {attention ? <span aria-hidden className="absolute left-0 top-4 h-8 w-[3px] rounded-r-full bg-accent shadow-[0_0_10px_var(--club-accent-glow)]" /> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex h-6 items-center rounded-md bg-accent-soft px-2 text-[12px] font-semibold text-accent-text">{teamLabel(r.match)}</span>
          <span className="min-w-0 truncate text-[15px] font-medium text-foreground">{r.match.opponentName ? `vs ${r.match.opponentName}` : "Adversaire à confirmer"}</span>
        </div>
        <RequestStatusBadge status={r.status} size="sm" />
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]">
        <span className="type-numeric text-muted line-through decoration-subtle/70">{formatShortDateTime(r.originalScheduledAt, timezone)}</span>
        <ArrowRight aria-label="vers" className="size-3.5 shrink-0 text-subtle" />
        <span className="type-numeric font-semibold text-foreground">{formatShortDateTime(r.requestedStartAt, timezone)}</span>
      </div>

      <p className="type-meta flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{r.requestedVenue?.name ?? "Extérieur"}</span>
        </span>
        {manager ? (
          <span className="inline-flex items-center gap-1">
            <UserRound aria-hidden className="size-3.5 shrink-0" />
            {r.requesterDisplayName}
          </span>
        ) : null}
        {r.isCustomWeekday ? (
          <span className="inline-flex items-center gap-1">
            <CalendarClock aria-hidden className="size-3.5 shrink-0" />
            En semaine
          </span>
        ) : null}
      </p>

      {r.lastMessage ? (
        <div className="mt-auto flex items-start gap-2 border-t border-border pt-3 text-[13px]">
          <MessageSquare aria-hidden className="mt-0.5 size-3.5 shrink-0 text-subtle" />
          <p className="min-w-0 flex-1 truncate text-muted">
            {r.lastMessage.type === "USER" ? <span className="font-medium text-foreground">{r.lastMessage.authorDisplayName} : </span> : null}
            {r.lastMessage.excerpt}
          </p>
          <span className="type-numeric shrink-0 text-[12px] text-subtle">{formatRelative(r.lastMessageAt, now, timezone)}</span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>
      ) : null}
    </Link>
  );
}
