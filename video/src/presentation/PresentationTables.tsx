import { Check, MapPin, UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PersonAvatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { matchDateParts } from "@/features/matches/match-display";
import type { TableMatchRefDto } from "@/lib/api/tables";

/**
 * VERSIONS VIDÉO des cartes Tables de marque (TableMatchCard /
 * CandidateRow de production inchangés) : un match, UN poste, et des
 * profils résumés en 2–3 puces. On comprend le principe, pas l'algorithme.
 */
export function PresentationTableMatch({ match, assignee }: { match: TableMatchRefDto; assignee: { name: string; team: string } | null }) {
  const p = matchDateParts(match.matchDatetime);
  return (
    <div className="surface-card flex flex-col gap-5 p-5">
      <div className="flex items-center gap-4">
        <div className="flex w-[76px] shrink-0 flex-col items-center rounded-[12px] border border-border bg-surface py-2">
          <span className="type-eyebrow">{p?.weekday}</span>
          <span className="type-numeric text-[24px] font-medium leading-tight text-foreground">{p?.time}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[21px] font-semibold text-foreground">
            {match.teamName} <span className="font-normal text-subtle">vs</span> {match.opponentName}
          </p>
          <p className="flex items-center gap-1.5 text-[14.5px] text-muted">
            <MapPin aria-hidden className="size-4 text-subtle" />
            {(match.venueLabel ?? "").replace(/, .*$/, "")}
          </p>
        </div>
      </div>
      <div className={cn("flex items-center justify-between gap-3 rounded-[var(--radius-md)] border p-4", assignee ? "border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-success-soft" : "border-dashed border-border-strong bg-surface")}>
        <div className="flex min-w-0 items-center gap-3">
          {assignee ? <PersonAvatar name={assignee.name} size="md" /> : <span className="inline-flex size-11 items-center justify-center rounded-full border border-dashed border-border-strong text-subtle"><UserRound className="size-5" aria-hidden /></span>}
          <div className="flex min-w-0 flex-col">
            <span className="type-eyebrow">Marqueur</span>
            <span className="text-[17px] font-semibold text-foreground">{assignee ? assignee.name : "À attribuer"}</span>
          </div>
        </div>
        {assignee ? (
          <StatusBadge tone="success" icon={<Check />}>
            Affecté
          </StatusBadge>
        ) : (
          <Button variant="primary" icon={<UserPlus />} data-choose>
            Choisir
          </Button>
        )}
      </div>
    </div>
  );
}

export type CandidateTag = { label: string; tone: "success" | "neutral" | "danger" };

export function PresentationCandidate({ name, team, tags, recommended, unavailable, tagsShown, choosing }: { name: string; team: string; tags: CandidateTag[]; recommended: number; unavailable?: boolean; tagsShown: number; choosing?: boolean }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border bg-surface-raised p-4 shadow-1"
      style={{ borderColor: recommended > 0.5 ? "var(--club-accent-border)" : "var(--border)", boxShadow: recommended > 0 ? `var(--shadow-1), 0 0 0 ${1.5 * recommended}px var(--club-accent-border), 0 14px 34px -16px color-mix(in oklab, var(--club-accent) ${Math.round(40 * recommended)}%, transparent)` : undefined }}
    >
      <div className="flex items-center gap-3">
        <PersonAvatar name={name} size="md" className={unavailable ? "opacity-60" : undefined} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={cn("text-[17px] font-semibold", unavailable ? "text-muted" : "text-foreground")}>{name}</span>
          <span className="type-meta">{team}</span>
        </div>
        {recommended > 0.02 ? (
          <span style={{ opacity: Math.min(1, recommended * 1.4), transform: `scale(${0.85 + 0.15 * recommended})` }}>
            <StatusBadge tone="success">Recommandé</StatusBadge>
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 pl-14">
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, tagsShown).map((t) => (
            <StatusBadge key={t.label} tone={t.tone} size="sm" icon={t.tone === "success" ? <Check /> : undefined}>
              {t.label}
            </StatusBadge>
          ))}
        </div>
        {unavailable ? null : (
          <Button variant={recommended > 0.5 ? "primary" : "secondary"} size="sm" loading={choosing} data-choose-candidate={recommended > 0.5 ? "" : undefined}>
            Choisir
          </Button>
        )}
      </div>
    </div>
  );
}
